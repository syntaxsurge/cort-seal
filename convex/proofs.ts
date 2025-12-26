import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const BUNDLE_HASH_RE = /^[a-f0-9]{64}$/i;
const MIN_PUBLIC_ID_LEN = 8;
const MAX_PUBLIC_ID_LEN = 64;
const MAX_BUNDLE_BYTES = 950_000;

export const create = mutationGeneric({
  args: {
    analysisId: v.id("analyses"),
    publicId: v.string(),
    bundleHashSha256: v.string(),
    bundleJson: v.string(),
    bundleBytes: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.publicId.length < MIN_PUBLIC_ID_LEN || args.publicId.length > MAX_PUBLIC_ID_LEN) {
      throw new Error(
        `publicId must be between ${MIN_PUBLIC_ID_LEN} and ${MAX_PUBLIC_ID_LEN} chars.`
      );
    }

    if (!BUNDLE_HASH_RE.test(args.bundleHashSha256)) {
      throw new Error("bundleHashSha256 must be a 64-char hex string.");
    }

    if (!Number.isFinite(args.bundleBytes) || args.bundleBytes <= 0) {
      throw new Error("bundleBytes must be a positive number.");
    }

    if (args.bundleBytes > MAX_BUNDLE_BYTES) {
      throw new Error(
        `Proof bundle too large (${args.bundleBytes} bytes; max ${MAX_BUNDLE_BYTES}).`
      );
    }

    if (!Number.isFinite(args.createdAt) || args.createdAt <= 0) {
      throw new Error("createdAt must be a positive epoch timestamp (ms).");
    }

    const existing = await ctx.db
      .query("proofs")
      .withIndex("by_analysisId", (q) => q.eq("analysisId", args.analysisId))
      .first();

    if (existing) return existing;

    const collision = await ctx.db
      .query("proofs")
      .withIndex("by_publicId", (q) => q.eq("publicId", args.publicId))
      .first();

    if (collision) {
      throw new Error("publicId collision (try again).");
    }

    const proofId = await ctx.db.insert("proofs", {
      analysisId: args.analysisId,
      publicId: args.publicId,
      bundleHashSha256: args.bundleHashSha256,
      bundleJson: args.bundleJson,
      bundleBytes: args.bundleBytes,
      createdAt: args.createdAt,
    });

    const created = await ctx.db.get(proofId);
    if (!created) {
      throw new Error("Failed to load created proof.");
    }

    return created;
  },
});

export const getByPublicId = queryGeneric({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proofs")
      .withIndex("by_publicId", (q) => q.eq("publicId", args.publicId))
      .first();
  },
});

export const getByAnalysisId = queryGeneric({
  args: { analysisId: v.id("analyses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proofs")
      .withIndex("by_analysisId", (q) => q.eq("analysisId", args.analysisId))
      .first();
  },
});
