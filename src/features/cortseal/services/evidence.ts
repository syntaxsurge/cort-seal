import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import {
  cortsealClaimCheckResultSchema,
  cortsealSourceAuditResultSchema,
} from "@/features/cortseal/schemas";
import type { AnalysisDoc } from "@/features/cortseal/services/analyses";

const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/i);

export const cortsealEvidenceBundleSchema = z.object({
  kind: z.literal("cortseal:evidence:v1"),
  analysisId: z.string().min(1),
  createdAt: z.number(),
  generatedAt: z.number(),
  status: z.union([z.literal("completed"), z.literal("error")]),
  sessionId: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  prompt: z.string(),
  result: z
    .union([cortsealClaimCheckResultSchema, cortsealSourceAuditResultSchema])
    .optional(),
  error: z.string().optional(),
  hashes: z.object({
    promptSha256: sha256HexSchema,
    resultSha256: sha256HexSchema.optional(),
    bundleSha256: sha256HexSchema,
  }),
});

export type CortsealEvidenceBundle = z.infer<typeof cortsealEvidenceBundleSchema>;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function stableJsonStringify(value: unknown, options?: { space?: number }): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === "object") {
      const obj = input as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      const out: Record<string, unknown> = {};
      for (const key of keys) {
        out[key] = normalize(obj[key]);
      }
      return out;
    }
    return input;
  };

  return JSON.stringify(normalize(value), null, options?.space);
}

export function buildEvidenceBundle(options: {
  analysisId: string;
  analysis: AnalysisDoc;
}): CortsealEvidenceBundle {
  let result:
    | z.infer<typeof cortsealClaimCheckResultSchema>
    | z.infer<typeof cortsealSourceAuditResultSchema>
    | undefined;

  if (options.analysis.status === "completed") {
    const claimCheckParsed = cortsealClaimCheckResultSchema.safeParse(options.analysis.result);
    if (claimCheckParsed.success) {
      result = claimCheckParsed.data;
    } else {
      const auditParsed = cortsealSourceAuditResultSchema.safeParse(options.analysis.result);
      if (auditParsed.success) {
        result = auditParsed.data;
      }
    }
  }

  const promptSha256 = sha256Hex(options.analysis.prompt);
  const resultSha256 = result ? sha256Hex(stableJsonStringify(result)) : undefined;

  const bundleBody = {
    kind: "cortseal:evidence:v1",
    analysisId: options.analysisId,
    createdAt: options.analysis.createdAt,
    status: options.analysis.status,
    sessionId: options.analysis.sessionId,
    durationMs: options.analysis.durationMs,
    promptSha256,
    resultSha256: resultSha256 ?? null,
  } as const;

  const bundleSha256 = sha256Hex(stableJsonStringify(bundleBody));

  const bundle: CortsealEvidenceBundle = {
    kind: "cortseal:evidence:v1",
    analysisId: options.analysisId,
    createdAt: options.analysis.createdAt,
    generatedAt: Date.now(),
    status: options.analysis.status,
    sessionId: options.analysis.sessionId,
    durationMs: options.analysis.durationMs,
    prompt: options.analysis.prompt,
    result,
    error: options.analysis.error,
    hashes: {
      promptSha256,
      resultSha256,
      bundleSha256,
    },
  };

  const validated = cortsealEvidenceBundleSchema.safeParse(bundle);
  if (!validated.success) {
    const message = validated.error.issues[0]?.message ?? "Invalid evidence bundle.";
    throw new Error(message);
  }

  return validated.data;
}
