import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { CortensorHttpError } from "@/lib/cortensor/types";
import { getServerEnv } from "@/lib/env/server";
import {
  DEFAULT_MAX_RAW_TEXT_CHARS,
  completionToText,
  cortensorCompletionWithRetry,
  mapWithConcurrency,
  truncateText,
  tryParseJsonFromText,
} from "@/features/cortseal/services/cortensorRuntime";
import { selectRelevantExcerpt } from "@/features/cortseal/services/excerpt";
import { summarizeClaimRuns } from "@/features/cortseal/services/consensus";
import { meanPairwiseCosineSimilarity } from "@/features/cortseal/services/poi";
import {
  buildRubricPrompt,
  normalizeRubricJson,
  summarizeRubricRuns,
} from "@/features/cortseal/services/rubric";

import {
  verificationParsedSchema,
  rubricParsedSchema,
  sourceAuditClaimSchema,
  type SourceAuditClaim,
  type VerifierRun,
  type RubricRun,
  cortsealSourceAuditResultSchema,
  type CortsealSourceAuditResult,
  type ClaimVerification,
} from "@/features/cortseal/schemas";

const MAX_MODEL_SOURCE_CHARS = 18_000;
const MAX_EXCERPT_CHARS = 3_500;
const MAX_EXCERPT_PARAGRAPHS = 4;
const DEFAULT_MAX_RAW_TEXT = DEFAULT_MAX_RAW_TEXT_CHARS;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function truncateForModel(text: string): string {
  return text.length <= MAX_MODEL_SOURCE_CHARS ? text : text.slice(0, MAX_MODEL_SOURCE_CHARS);
}

function formatUnknownError(err: unknown): string {
  if (err instanceof CortensorHttpError) {
    const bodyPreview = err.body.length > 1000 ? `${err.body.slice(0, 1000)}…` : err.body;
    return `Cortensor request failed (HTTP ${err.status}): ${bodyPreview}`;
  }

  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function buildSourceClaimExtractionPrompt(args: {
  sourceUrl: string;
  title: string;
  text: string;
  maxClaims: number;
}): string {
  return [
    "You are a deterministic claim-extraction engine for a validator utility.",
    "Extract AT MOST the requested number of atomic, checkable factual claims that are explicitly stated in the SOURCE TEXT.",
    "Each claim MUST be directly supported by a verbatim quote from the SOURCE TEXT.",
    "",
    "Return STRICT JSON ONLY (no markdown, no commentary).",
    'Schema: {"claims":[{"claim":"string","quote":"string"}]}',
    "",
    `MAX_CLAIMS: ${args.maxClaims}`,
    `SOURCE_URL: ${args.sourceUrl}`,
    `SOURCE_TITLE: ${args.title}`,
    "",
    "SOURCE_TEXT (verbatim; may be truncated):",
    args.text,
  ].join("\n");
}

function buildSourceClaimVerificationPrompt(args: {
  sourceUrl: string;
  claim: string;
  excerpt: string;
}): string {
  return [
    "You are a validator scoring whether a CLAIM is supported by the provided SOURCE_EXCERPT.",
    "Return STRICT JSON ONLY (no markdown).",
    'Schema: {"verdict":"supported"|"unsupported"|"unclear","confidence":0-1,"score":0-10,"rationale":"string","evidence":["string"]}',
    "",
    "Rubric:",
    '- verdict "supported": excerpt clearly supports the claim.',
    '- verdict "unsupported": excerpt clearly contradicts the claim.',
    '- verdict "unclear": excerpt does not contain enough evidence to decide.',
    "",
    "Rules:",
    "- Only use information inside SOURCE_EXCERPT.",
    "- Evidence MUST be short verbatim quotes from SOURCE_EXCERPT.",
    "- Do not invent citations or pretend to have checked external sources.",
    "",
    `SOURCE_URL: ${args.sourceUrl}`,
    "",
    "CLAIM:",
    args.claim,
    "",
    "SOURCE_EXCERPT:",
    args.excerpt,
  ].join("\n");
}

function parseExtractedClaims(value: unknown, maxClaims: number): SourceAuditClaim[] {
  const itemSchema = z.union([
    z.object({ claim: z.string(), quote: z.string() }).passthrough(),
    z.object({ claim: z.string(), evidence: z.string() }).passthrough(),
    z.object({ text: z.string(), quote: z.string() }).passthrough(),
    z.object({ text: z.string(), evidence: z.string() }).passthrough(),
  ]);

  const arr = z.array(itemSchema).safeParse(value);
  if (!arr.success) return [];

  const candidates = arr.data
    .map((item) => {
      const claim =
        (item as { claim?: unknown }).claim ??
        (item as { text?: unknown }).text ??
        "";
      const quote =
        (item as { quote?: unknown }).quote ??
        (item as { evidence?: unknown }).evidence ??
        "";
      return {
        claim: typeof claim === "string" ? claim.trim() : "",
        quote: typeof quote === "string" ? quote.trim() : "",
      };
    })
    .filter((item) => item.claim && item.quote);

  const seen = new Set<string>();
  const parsed: SourceAuditClaim[] = [];

  for (const candidate of candidates) {
    const result = sourceAuditClaimSchema.safeParse(candidate);
    if (!result.success) continue;
    const key = result.data.claim.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(result.data);
    if (parsed.length >= maxClaims) break;
  }

  return parsed;
}

function extractClaimsFromModelText(text: string, maxClaims: number): SourceAuditClaim[] {
  const parsed = tryParseJsonFromText(text);
  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return parseExtractedClaims(parsed, maxClaims);
  }

  if (typeof parsed === "object" && parsed !== null) {
    const maybeClaims = (parsed as { claims?: unknown }).claims;
    return parseExtractedClaims(maybeClaims, maxClaims);
  }

  return [];
}

export async function runSourceAudit(input: {
  sourceUrl: string;
  title: string;
  text: string;
  fetchedAt: number;
  maxClaims?: number;
  runsPerClaim?: number;
}): Promise<CortsealSourceAuditResult> {
  const env = getServerEnv();

  const config = {
    maxClaims: Math.max(
      1,
      Math.min(input.maxClaims ?? env.CORTSEAL_MAX_CLAIMS, env.CORTSEAL_MAX_CLAIMS)
    ),
    runsPerClaim: Math.max(
      1,
      Math.min(
        input.runsPerClaim ?? env.CORTSEAL_VERIFIER_RUNS_PER_CLAIM,
        env.CORTSEAL_VERIFIER_RUNS_PER_CLAIM
      )
    ),
    verifierConcurrency: env.CORTSEAL_VERIFIER_CONCURRENCY,
  };

  const rubricConfig = {
    runs: env.CORTSEAL_RUBRIC_RUNS,
    concurrency: env.CORTSEAL_RUBRIC_CONCURRENCY,
  };

  const textSha256 = sha256Hex(input.text);

  const extractionStartedAt = Date.now();
  const extractionResponse = await cortensorCompletionWithRetry(
    buildSourceClaimExtractionPrompt({
      sourceUrl: input.sourceUrl,
      title: input.title,
      text: truncateForModel(input.text),
      maxClaims: config.maxClaims,
    })
  );

  const extractionDurationMs = Date.now() - extractionStartedAt;
  const extractionText = completionToText(extractionResponse);
  const extractionRawText = truncateText(extractionText, DEFAULT_MAX_RAW_TEXT);
  const extractedClaims = extractClaimsFromModelText(extractionText, config.maxClaims);

  const claims = extractedClaims.slice(0, config.maxClaims);

  const excerpts = claims.map((claim) =>
    selectRelevantExcerpt(input.text, `${claim.claim}\n${claim.quote}`, {
      maxChars: MAX_EXCERPT_CHARS,
      maxParagraphs: MAX_EXCERPT_PARAGRAPHS,
    })
  );

  const verificationTasks = claims.flatMap((claim, claimIndex) =>
    Array.from({ length: config.runsPerClaim }, (_, runIndex) => ({
      claimIndex,
      claim,
      excerpt: excerpts[claimIndex] ?? "",
      runIndex,
    }))
  );

  const verificationStartedAt = Date.now();
  const verificationRuns = await mapWithConcurrency(
    verificationTasks,
    config.verifierConcurrency,
    async ({ claim, excerpt, runIndex }) => {
      const startedAt = Date.now();

      try {
        const response = await cortensorCompletionWithRetry(
          buildSourceClaimVerificationPrompt({
            sourceUrl: input.sourceUrl,
            claim: claim.claim,
            excerpt,
          })
        );

        const durationMs = Date.now() - startedAt;
        const text = completionToText(response);
        const rawText = truncateText(text, DEFAULT_MAX_RAW_TEXT);

        const parsedJson = tryParseJsonFromText(text);
        if (!parsedJson) {
          return {
            runIndex,
            ok: false,
            durationMs,
            rawText,
            error: "Unable to parse JSON from verifier output.",
          } satisfies VerifierRun;
        }

        const parsed = verificationParsedSchema.safeParse(parsedJson);
        if (!parsed.success) {
          const issue = parsed.error.issues[0]?.message ?? "Invalid verifier output.";
          return {
            runIndex,
            ok: false,
            durationMs,
            rawText,
            error: issue,
          } satisfies VerifierRun;
        }

        return {
          runIndex,
          ok: true,
          durationMs,
          rawText,
          parsed: parsed.data,
        } satisfies VerifierRun;
      } catch (err) {
        const durationMs = Date.now() - startedAt;
        return {
          runIndex,
          ok: false,
          durationMs,
          error: formatUnknownError(err),
        } satisfies VerifierRun;
      }
    }
  );

  const verificationDurationMs = Date.now() - verificationStartedAt;

  const runsByClaim = new Map<number, VerifierRun[]>();

  for (let i = 0; i < verificationTasks.length; i += 1) {
    const task = verificationTasks[i]!;
    const run = verificationRuns[i]!;
    const list = runsByClaim.get(task.claimIndex) ?? [];
    list.push(run);
    runsByClaim.set(task.claimIndex, list);
  }

  const verifiedClaims = claims.map((claim, claimIndex) => {
    const runs = (runsByClaim.get(claimIndex) ?? []).sort((a, b) => a.runIndex - b.runIndex);
    const summaryBase = summarizeClaimRuns(runs);

    const okRuns = runs.filter((run) => run.ok && run.parsed);
    const rationales = okRuns.map((run) => run.parsed!.rationale);
    const meanRationaleCosine = meanPairwiseCosineSimilarity(rationales);
    const poiDisagreement = 1 - meanRationaleCosine;

    const averageScore =
      okRuns.length === 0
        ? 0
        : okRuns.reduce((acc, run) => {
            const score = run.parsed!.score ?? run.parsed!.confidence * 10;
            return acc + score;
          }, 0) / okRuns.length;

    const divergent = meanRationaleCosine < 0.85 || summaryBase.dispersion > 0.34;

    return {
      claim: claim.claim,
      quote: claim.quote,
      excerpt: excerpts[claimIndex] ?? "",
      runs,
      summary: {
        ...summaryBase,
        meanRationaleCosine,
        poiDisagreement,
        averageScore,
        divergent,
      },
    };
  });

  const rubricClaims: ClaimVerification[] = verifiedClaims.map((claim) => ({
    claim: claim.claim,
    runs: claim.runs,
    summary: {
      okRuns: claim.summary.okRuns,
      verdictCounts: claim.summary.verdictCounts,
      consensusVerdict: claim.summary.consensusVerdict,
      consensusConfidence: claim.summary.consensusConfidence,
      dispersion: claim.summary.dispersion,
    },
  }));

  const rubricPrompt = buildRubricPrompt(truncateForModel(input.text), rubricClaims);

  const rubricStartedAt = Date.now();
  const rubricTasks = Array.from({ length: rubricConfig.runs }, (_, runIndex) => runIndex);

  const rubricRuns = await mapWithConcurrency(
    rubricTasks,
    rubricConfig.concurrency,
    async (runIndex) => {
      const startedAt = Date.now();

      try {
        const response = await cortensorCompletionWithRetry(rubricPrompt);
        const durationMs = Date.now() - startedAt;
        const text = completionToText(response);
        const rawText = truncateText(text, DEFAULT_MAX_RAW_TEXT);

        const parsedJson = tryParseJsonFromText(text);
        if (!parsedJson) {
          return {
            runIndex,
            ok: false,
            durationMs,
            rawText,
            error: "Unable to parse JSON from rubric output.",
          } satisfies RubricRun;
        }

        const normalized = normalizeRubricJson(parsedJson);
        const parsed = rubricParsedSchema.safeParse(normalized);
        if (!parsed.success) {
          const issue = parsed.error.issues[0]?.message ?? "Invalid rubric output.";
          return {
            runIndex,
            ok: false,
            durationMs,
            rawText,
            error: issue,
          } satisfies RubricRun;
        }

        return {
          runIndex,
          ok: true,
          durationMs,
          rawText,
          parsed: parsed.data,
        } satisfies RubricRun;
      } catch (err) {
        const durationMs = Date.now() - startedAt;
        return {
          runIndex,
          ok: false,
          durationMs,
          error: formatUnknownError(err),
        } satisfies RubricRun;
      }
    }
  );

  const rubricDurationMs = Date.now() - rubricStartedAt;
  const rubricSummary = summarizeRubricRuns(rubricRuns);

  const okRunCount = verifiedClaims.reduce((acc, claim) => acc + claim.summary.okRuns, 0);
  const avgDispersion =
    verifiedClaims.length === 0
      ? 0
      : verifiedClaims.reduce((acc, claim) => acc + claim.summary.dispersion, 0) /
        verifiedClaims.length;

  const avgMeanRationaleCosine =
    verifiedClaims.length === 0
      ? 1
      : verifiedClaims.reduce((acc, claim) => acc + claim.summary.meanRationaleCosine, 0) /
        verifiedClaims.length;

  const averageScore =
    verifiedClaims.length === 0
      ? 0
      : verifiedClaims.reduce((acc, claim) => acc + claim.summary.averageScore, 0) /
        verifiedClaims.length;

  const divergentClaimCount = verifiedClaims.filter((claim) => claim.summary.divergent).length;

  const result = {
    kind: "cortseal:sourceaudit:v1",
    config,
    source: {
      url: input.sourceUrl,
      title: input.title,
      fetchedAt: input.fetchedAt,
      textSha256,
    },
    extraction: {
      durationMs: extractionDurationMs,
      rawText: extractionRawText,
      claims,
    },
    verification: {
      durationMs: verificationDurationMs,
      claims: verifiedClaims,
    },
    rubric: {
      durationMs: rubricDurationMs,
      config: rubricConfig,
      runs: rubricRuns,
      summary: rubricSummary,
    },
    summary: {
      claimCount: claims.length,
      okRunCount,
      avgDispersion,
      avgMeanRationaleCosine,
      averageScore,
      divergentClaimCount,
    },
  } satisfies CortsealSourceAuditResult;

  const validated = cortsealSourceAuditResultSchema.safeParse(result);
  if (!validated.success) {
    const message = validated.error.issues[0]?.message ?? "Invalid source audit result.";
    throw new Error(message);
  }

  return validated.data;
}

