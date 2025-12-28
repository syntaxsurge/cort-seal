import { queryGeneric } from "convex/server";
import { v } from "convex/values";

import { normalizeOwnerAddress } from "./lib/ownerAddress";

const MAX_LIMIT = 100;

function clampLimit(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 40;
  return Math.max(1, Math.min(Math.floor(value), MAX_LIMIT));
}

function inferAnalysisType(prompt: string, resultKind: string | null): "try" | "audit" {
  if (resultKind === "cortseal:sourceaudit:v1") return "audit";
  if (resultKind === "cortseal:claimcheck:v1") return "try";
  const trimmed = prompt.trim().toLowerCase();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return "audit";
  return "try";
}

export const listArtifactsByOwner = queryGeneric({
  args: {
    ownerAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ownerAddress = normalizeOwnerAddress(args.ownerAddress);
    const limit = clampLimit(args.limit);

    const [analyses, proofs, seals, monitors] = await Promise.all([
      ctx.db
        .query("analyses")
        .withIndex("by_owner_createdAt", (q) => q.eq("ownerAddress", ownerAddress))
        .order("desc")
        .take(limit),
      ctx.db
        .query("proofs")
        .withIndex("by_owner_createdAt", (q) => q.eq("ownerAddress", ownerAddress))
        .order("desc")
        .take(limit),
      ctx.db
        .query("seals")
        .withIndex("by_owner_createdAt", (q) => q.eq("ownerAddress", ownerAddress))
        .order("desc")
        .take(limit),
      ctx.db
        .query("monitors")
        .withIndex("by_owner_createdAt", (q) => q.eq("ownerAddress", ownerAddress))
        .order("desc")
        .take(limit),
    ]);

    const safeAnalyses = analyses.map((analysis) => {
      const resultKind =
        typeof (analysis.result as { kind?: string } | undefined)?.kind === "string"
          ? (analysis.result as { kind?: string }).kind!
          : null;
      const promptPreview = analysis.prompt.trim().slice(0, 220);
      return {
        id: analysis._id,
        createdAt: analysis.createdAt ?? analysis._creationTime,
        status: analysis.status,
        resultKind,
        analysisType: inferAnalysisType(analysis.prompt, resultKind),
        promptPreview,
      };
    });

    const safeProofs = proofs.map((proof) => ({
      id: proof._id,
      createdAt: proof.createdAt ?? proof._creationTime,
      publicId: proof.publicId,
      analysisId: proof.analysisId,
      bundleHashSha256: proof.bundleHashSha256,
      bundleBytes: proof.bundleBytes,
    }));

    const safeSeals = seals.map((seal) => ({
      id: seal._id,
      createdAt: seal.createdAt ?? seal._creationTime,
      publicId: seal.publicId,
      verdict: seal.verdict,
      confidence: seal.confidence,
      claim: seal.claim,
      sourceTitle: seal.sourceTitle,
      sourceUrl: seal.sourceUrl,
    }));

    const safeMonitors = monitors.map((monitor) => ({
      id: monitor._id,
      createdAt: monitor.createdAt ?? monitor._creationTime,
      name: monitor.name,
      kind: monitor.kind,
      enabled: monitor.enabled,
      feedUrl: monitor.feedUrl,
      routerBaseUrl: monitor.routerBaseUrl,
    }));

    return {
      analyses: safeAnalyses,
      proofs: safeProofs,
      seals: safeSeals,
      monitors: safeMonitors,
    };
  },
});
