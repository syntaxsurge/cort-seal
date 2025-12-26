import "server-only";

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
import { summarizeClaimRuns } from "@/features/cortseal/services/consensus";
import {
  buildRubricPrompt,
  normalizeRubricJson,
  summarizeRubricRuns,
} from "@/features/cortseal/services/rubric";

import {
  claimSchema,
  type Claim,
  type ClaimVerification,
  cortsealClaimCheckResultSchema,
  type CortsealClaimCheckResult,
  rubricParsedSchema,
  type RubricRun,
  type VerifierRun,
  verificationParsedSchema,
} from "@/features/cortseal/schemas";

const MAX_RAW_TEXT_CHARS = DEFAULT_MAX_RAW_TEXT_CHARS;

function parseClaimArray(value: unknown, maxClaims: number): Claim[] {
  const itemSchema = z.union([
    z.string(),
    z.object({ claim: z.string() }).passthrough(),
    z.object({ text: z.string() }).passthrough(),
  ]);

  const arr = z.array(itemSchema).safeParse(value);
  if (!arr.success) return [];

  const claims = arr.data
    .map((item) => {
      if (typeof item === "string") return item;
      const claim = (item as { claim?: unknown }).claim;
      if (typeof claim === "string") return claim;
      const text = (item as { text?: unknown }).text;
      if (typeof text === "string") return text;
      return "";
    })
    .map((claim) => claim.trim())
    .filter(Boolean)
    .map((claim) => ({ claim }));

  const seen = new Set<string>();
  const deduped: Claim[] = [];

  for (const candidate of claims) {
    const parsed = claimSchema.safeParse(candidate);
    if (!parsed.success) continue;
    const claim = parsed.data;
    const key = claim.claim.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(claim);
    if (deduped.length >= maxClaims) break;
  }

  return deduped;
}

function parseClaimsFromExtraction(text: string, maxClaims: number): Claim[] {
  const extracted = tryParseJsonFromText(text);
  if (!extracted) return [];

  if (Array.isArray(extracted)) {
    return parseClaimArray(extracted, maxClaims);
  }

  if (typeof extracted === "object" && extracted !== null) {
    const maybeClaims = (extracted as { claims?: unknown }).claims;
    return parseClaimArray(maybeClaims, maxClaims);
  }

  return [];
}

function formatUnknownError(err: unknown): string {
  if (err instanceof CortensorHttpError) {
    const bodyPreview =
      err.body.length > 1000 ? `${err.body.slice(0, 1000)}…` : err.body;
    return `Cortensor request failed (HTTP ${err.status}): ${bodyPreview}`;
  }

  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function buildClaimExtractionPrompt(draft: string, maxClaims: number): string {
  return [
    "You extract verifiable factual claims from creator content.",
    "Return ONLY valid JSON (no markdown, no code fences, no commentary).",
    'Schema: {"claims":[{"claim":"string"}]}',
    `Rules:`,
    `- Extract up to ${maxClaims} claims.`,
    `- Claims must be factual and verifiable (true/false), not opinions or marketing fluff.`,
    `- Keep the wording close to the original and make each claim standalone.`,
    `- If there are no factual claims, return {"claims":[]}.`,
    "",
    "CONTENT:",
    draft,
  ].join("\n");
}

function buildClaimVerificationPrompt(claim: string): string {
  return [
    "You are a strict JSON classifier for claim factuality risk.",
    "Return ONLY valid JSON (no markdown, no code fences, no commentary).",
    'Schema: {"verdict":"supported"|"unsupported"|"unclear","confidence":0-1,"rationale":"string"}',
    "Guidance:",
    '- Use "supported" only if the claim is very likely true based on general knowledge.',
    '- Use "unsupported" only if the claim is very likely false.',
    '- Use "unclear" if you are uncertain, the claim is too specific, or would require a source.',
    "- Confidence must be between 0 and 1 (decimals allowed).",
    "- Rationale must be concise and should not invent citations.",
    "",
    "CLAIM:",
    claim,
  ].join("\n");
}

export async function runClaimCheck(prompt: string): Promise<CortsealClaimCheckResult> {
  const env = getServerEnv();

  const config = {
    maxClaims: env.CORTSEAL_MAX_CLAIMS,
    runsPerClaim: env.CORTSEAL_VERIFIER_RUNS_PER_CLAIM,
    verifierConcurrency: env.CORTSEAL_VERIFIER_CONCURRENCY,
  };

  const rubricConfig = {
    runs: env.CORTSEAL_RUBRIC_RUNS,
    concurrency: env.CORTSEAL_RUBRIC_CONCURRENCY,
  };

  const extractionStartedAt = Date.now();
  const extractionResponse = await cortensorCompletionWithRetry(
    buildClaimExtractionPrompt(prompt, config.maxClaims)
  );
  const extractionDurationMs = Date.now() - extractionStartedAt;
  const extractionText = completionToText(extractionResponse);
  const extractionRawText = truncateText(extractionText, MAX_RAW_TEXT_CHARS);
  const extractedClaims = parseClaimsFromExtraction(extractionText, config.maxClaims);

  const claims = extractedClaims.slice(0, config.maxClaims);

  const verificationTasks = claims.flatMap((claim) =>
    Array.from({ length: config.runsPerClaim }, (_, runIndex) => ({
      claim: claim.claim,
      runIndex,
    }))
  );

  const verificationStartedAt = Date.now();
  const verificationRuns = await mapWithConcurrency(
    verificationTasks,
    config.verifierConcurrency,
    async ({ claim, runIndex }) => {
      const startedAt = Date.now();

      try {
        const response = await cortensorCompletionWithRetry(buildClaimVerificationPrompt(claim));
        const durationMs = Date.now() - startedAt;
        const text = completionToText(response);
        const rawText = truncateText(text, MAX_RAW_TEXT_CHARS);

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

  const runsByClaim = new Map<string, VerifierRun[]>();

  for (let i = 0; i < verificationTasks.length; i += 1) {
    const task = verificationTasks[i]!;
    const run = verificationRuns[i]!;
    const key = task.claim;

    const list = runsByClaim.get(key) ?? [];
    list.push(run);
    runsByClaim.set(key, list);
  }

  const verifiedClaims: ClaimVerification[] = claims.map((claim) => {
    const runs = (runsByClaim.get(claim.claim) ?? []).sort(
      (a, b) => a.runIndex - b.runIndex
    );

    const summary = summarizeClaimRuns(runs);
    return { claim: claim.claim, runs, summary };
  });

  const rubricPrompt = buildRubricPrompt(prompt, verifiedClaims);
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
        const rawText = truncateText(text, MAX_RAW_TEXT_CHARS);

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

  const result = {
    kind: "cortseal:claimcheck:v1",
    config,
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
    },
  } satisfies CortsealClaimCheckResult;

  const validated = cortsealClaimCheckResultSchema.safeParse(result);
  if (!validated.success) {
    const message = validated.error.issues[0]?.message ?? "Invalid claim check result.";
    throw new Error(message);
  }

  return validated.data;
}
