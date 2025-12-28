import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { anyApi } from "convex/server";
import type { GenericId } from "convex/values";
import { z } from "zod";

import { getConvexHttpClient } from "@/lib/db/convex/httpClient";
import { getServerEnv } from "@/lib/env/server";
import { getAnalysisById } from "@/features/cortseal/services/analyses";
import {
  buildEvidenceBundle,
  cortsealEvidenceBundleSchema,
  stableJsonStringify,
  type CortsealEvidenceBundle,
} from "@/features/cortseal/services/evidence";

const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/i);

const deterministicCheckSchema = z.object({
  id: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  passed: z.boolean(),
  detail: z.string().trim().min(1).max(600).optional(),
});

export type DeterministicCheck = z.infer<typeof deterministicCheckSchema>;

export const cortsealProofBundleSchema = z
  .object({
    kind: z.literal("cortseal:proof:v1"),
    publicId: z.string().min(8).max(64),
    analysisId: z.string().min(1),
    createdAt: z.number().int().nonnegative(),
    evidence: cortsealEvidenceBundleSchema,
    deterministicChecks: z.array(deterministicCheckSchema),
  })
  .passthrough();

export type CortsealProofBundle = z.infer<typeof cortsealProofBundleSchema>;

export const proofDocSchema = z
  .object({
    ownerAddress: z.string().optional(),
    analysisId: z.string().min(1),
    publicId: z.string().min(8).max(64),
    bundleHashSha256: sha256HexSchema,
    bundleJson: z.string().min(2),
    bundleBytes: z.number().int().positive(),
    createdAt: z.number().int().nonnegative(),
  })
  .passthrough();

export type ProofDoc = z.infer<typeof proofDocSchema>;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function generatePublicId(): string {
  return randomBytes(9).toString("base64url");
}

function buildDeterministicChecks(evidence: CortsealEvidenceBundle): DeterministicCheck[] {
  const checks: DeterministicCheck[] = [];

  checks.push({
    id: "analysis_completed",
    description: "Analysis status is completed.",
    passed: evidence.status === "completed",
  });

  checks.push({
    id: "result_present",
    description: "Evidence bundle includes a parsed result payload.",
    passed: Boolean(evidence.result),
  });

  if (!evidence.result) return checks;

  checks.push({
    id: "result_kind_supported",
    description: "Result kind is a supported CortSeal payload.",
    passed:
      evidence.result.kind === "cortseal:claimcheck:v1" ||
      evidence.result.kind === "cortseal:sourceaudit:v1",
    detail: `kind=${evidence.result.kind}`,
  });

  if (evidence.result.kind === "cortseal:claimcheck:v1") {
    const claimCount = evidence.result.summary.claimCount;
    const maxClaims = evidence.result.config.maxClaims;

    checks.push({
      id: "claim_count_within_limit",
      description: "Extracted claim count does not exceed maxClaims.",
      passed: claimCount <= maxClaims,
      detail: `claims=${claimCount}, maxClaims=${maxClaims}`,
    });

    const expectedRuns = evidence.result.config.runsPerClaim;
    const missingRuns = evidence.result.verification.claims.filter(
      (claim) => claim.runs.length !== expectedRuns
    ).length;

    checks.push({
      id: "runs_per_claim_complete",
      description: "Every claim has the expected number of verifier runs.",
      passed: missingRuns === 0,
      detail: missingRuns ? `claims_missing_expected_runs=${missingRuns}` : undefined,
    });

    if (evidence.result.rubric) {
      checks.push({
        id: "rubric_has_ok_run",
        description: "Rubric scoring produced at least one valid run.",
        passed: evidence.result.rubric.summary.okRuns > 0,
        detail: `okRuns=${evidence.result.rubric.summary.okRuns}`,
      });
    }
  }

  if (evidence.result.kind === "cortseal:sourceaudit:v1") {
    checks.push({
      id: "prompt_matches_source_url",
      description: "Stored prompt matches the audited source URL.",
      passed: evidence.prompt === evidence.result.source.url,
    });

    const excerptMismatches = evidence.result.verification.claims.filter(
      (claim) => claim.excerpt && claim.quote && !claim.excerpt.includes(claim.quote)
    ).length;

    checks.push({
      id: "excerpt_contains_quote",
      description: "Each extracted quote appears in its selected excerpt.",
      passed: excerptMismatches === 0,
      detail: excerptMismatches ? `mismatches=${excerptMismatches}` : undefined,
    });

    const missingEvidenceQuotes = evidence.result.verification.claims.filter((claim) => {
      const okRuns = claim.runs.filter((run) => run.ok && run.parsed);
      return okRuns.some((run) => {
        const parsed = run.parsed!;
        if (parsed.verdict === "unclear") return false;
        return (parsed.evidence?.length ?? 0) === 0;
      });
    }).length;

    checks.push({
      id: "evidence_quotes_for_non_unclear",
      description: "Supported/unsupported runs include at least one evidence quote.",
      passed: missingEvidenceQuotes === 0,
      detail: missingEvidenceQuotes ? `claims_missing_quotes=${missingEvidenceQuotes}` : undefined,
    });
  }

  return checks;
}

export function proofSharePath(publicId: string): string {
  return `/share/${publicId}`;
}

export async function getProofByPublicId(publicId: string): Promise<ProofDoc | null> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.proofs.getByPublicId, { publicId });
  if (!result) return null;

  const parsed = proofDocSchema.safeParse(result);
  if (!parsed.success) return null;

  return parsed.data;
}

export async function getProofByAnalysisId(
  analysisId: GenericId<"analyses">
): Promise<ProofDoc | null> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.proofs.getByAnalysisId, { analysisId });
  if (!result) return null;

  const parsed = proofDocSchema.safeParse(result);
  if (!parsed.success) return null;

  return parsed.data;
}

export async function createProofForAnalysis(args: {
  analysisId: GenericId<"analyses">;
}): Promise<ProofDoc> {
  const existing = await getProofByAnalysisId(args.analysisId);
  if (existing) {
    const parsedBundle = cortsealProofBundleSchema.safeParse(JSON.parse(existing.bundleJson));
    if (!parsedBundle.success) throw new Error("Stored proof bundle JSON is invalid.");
    return existing;
  }

  const env = getServerEnv();

  const analysis = await getAnalysisById(args.analysisId);
  if (!analysis) throw new Error("Analysis not found.");
  if (analysis.status !== "completed") {
    throw new Error("Proofs can only be generated for completed analyses.");
  }

  const evidence = buildEvidenceBundle({ analysisId: String(args.analysisId), analysis });
  if (!evidence.result) {
    throw new Error("Unsupported analysis result payload.");
  }

  const convex = getConvexHttpClient();
  const createdAt = Date.now();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const publicId = generatePublicId();

    try {
      const deterministicChecks = buildDeterministicChecks(evidence);
      const proofBundle: CortsealProofBundle = {
        kind: "cortseal:proof:v1",
        publicId,
        analysisId: String(args.analysisId),
        createdAt,
        evidence,
        deterministicChecks,
      };

      const validated = cortsealProofBundleSchema.safeParse(proofBundle);
      if (!validated.success) {
        const message =
          validated.error.issues[0]?.message ?? "Invalid proof bundle payload.";
        throw new Error(message);
      }

      const bundleJson = stableJsonStringify(validated.data);
      const bundleBytes = Buffer.byteLength(bundleJson, "utf8");
      if (bundleBytes > env.CORTSEAL_PROOF_MAX_BYTES) {
        throw new Error(
          `Proof bundle too large (${bundleBytes} bytes; max ${env.CORTSEAL_PROOF_MAX_BYTES}). Reduce claim count or input size.`
        );
      }

      const bundleHashSha256 = sha256Hex(bundleJson);

      const created = await convex.mutation(anyApi.proofs.create, {
        ownerAddress: analysis.ownerAddress,
        analysisId: args.analysisId,
        publicId,
        bundleHashSha256,
        bundleJson,
        bundleBytes,
        createdAt,
      });

      const parsed = proofDocSchema.safeParse(created);
      if (!parsed.success) {
        throw new Error("Proof mutation returned an invalid payload.");
      }

      return parsed.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.toLowerCase().includes("collision") && attempt < 3) continue;
      throw err;
    }
  }

  throw new Error("Unable to allocate a unique proof id.");
}
