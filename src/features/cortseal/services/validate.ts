import "server-only";

import { createHash } from "node:crypto";

import { CortensorHttpError } from "@/lib/cortensor/types";
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
  verificationParsedSchema,
  type VerifierRun,
  cortsealValidateResultSchema,
  type CortsealValidateResult,
} from "@/features/cortseal/schemas";

const MAX_EXCERPT_CHARS = 3_500;
const MAX_EXCERPT_PARAGRAPHS = 4;
const DEFAULT_MAX_RAW_TEXT = DEFAULT_MAX_RAW_TEXT_CHARS;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function formatUnknownError(err: unknown): string {
  if (err instanceof CortensorHttpError) {
    const bodyPreview = err.body.length > 1000 ? `${err.body.slice(0, 1000)}…` : err.body;
    return `Cortensor request failed (HTTP ${err.status}): ${bodyPreview}`;
  }

  if (err instanceof Error) return err.message;
  return "Unknown error";
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

export async function validateClaimAgainstSource(input: {
  sourceUrl: string;
  title: string;
  text: string;
  fetchedAt: number;
  claim: string;
  runs: number;
  concurrency: number;
}): Promise<CortsealValidateResult> {
  const excerpt = selectRelevantExcerpt(input.text, input.claim, {
    maxChars: MAX_EXCERPT_CHARS,
    maxParagraphs: MAX_EXCERPT_PARAGRAPHS,
  });

  const tasks = Array.from({ length: input.runs }, (_, runIndex) => runIndex);

  const runs = await mapWithConcurrency(tasks, input.concurrency, async (runIndex) => {
    const startedAt = Date.now();

    try {
      const response = await cortensorCompletionWithRetry(
        buildSourceClaimVerificationPrompt({
          sourceUrl: input.sourceUrl,
          claim: input.claim,
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
  });

  const summaryBase = summarizeClaimRuns(runs);
  const okRuns = runs.filter((run) => run.ok && run.parsed);
  const meanRationaleCosine = meanPairwiseCosineSimilarity(okRuns.map((run) => run.parsed!.rationale));
  const poiDisagreement = 1 - meanRationaleCosine;

  const averageScore =
    okRuns.length === 0
      ? 0
      : okRuns.reduce((acc, run) => {
          const score = run.parsed!.score ?? run.parsed!.confidence * 10;
          return acc + score;
        }, 0) / okRuns.length;

  const divergent = meanRationaleCosine < 0.85 || summaryBase.dispersion > 0.34;

  const result: CortsealValidateResult = {
    kind: "cortseal:validate:v1",
    createdAt: Date.now(),
    source: {
      url: input.sourceUrl,
      title: input.title,
      fetchedAt: input.fetchedAt,
      textSha256: sha256Hex(input.text),
    },
    claim: input.claim,
    excerpt,
    runs,
    summary: {
      ...summaryBase,
      meanRationaleCosine,
      poiDisagreement,
      averageScore,
      divergent,
    },
  };

  const validated = cortsealValidateResultSchema.safeParse(result);
  if (!validated.success) {
    const message = validated.error.issues[0]?.message ?? "Invalid validate result.";
    throw new Error(message);
  }

  return validated.data;
}

