import { internalMutationGeneric, mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { normalizeOwnerAddress } from "./lib/ownerAddress";

const MIN_EXCERPT_CHARS = 1;
const MAX_EXCERPT_CHARS = 6000;
const MIN_CLAIM_CHARS = 8;
const MAX_CLAIM_CHARS = 600;
const MIN_SUMMARY_CHARS = 10;
const MAX_SUMMARY_CHARS = 800;
const MIN_PUBLIC_ID_LEN = 12;
const MAX_PUBLIC_ID_LEN = 64;
const MAX_RUNS = 6;
const MAX_RUBRIC_REASONS_CHARS = 1600;
const MAX_RAW_TEXT_CHARS = 8000;

type Verdict = "pass" | "warn" | "fail" | "unknown";

type EvidenceRun = {
  runIndex: number;
  ok: boolean;
  durationMs: number;
  rawText?: string;
  error?: string;
  verdict?: Verdict;
  confidence?: number;
  summary?: string;
  rubricScore?: number;
  rubricReasons?: string;
};

type Evidence = {
  consensusScore: number;
  runs: EvidenceRun[];
};

function toPublicIdCandidate(): string {
  const cryptoAny = globalThis.crypto as { randomUUID?: () => string } | undefined;
  const base =
    typeof cryptoAny?.randomUUID === "function"
      ? cryptoAny.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;

  const cleaned = base.replace(/[^a-z0-9]/gi, "");
  return `seal_${cleaned.slice(0, 48)}`;
}

async function generateUniquePublicId(ctx: any): Promise<string> {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const publicId = toPublicIdCandidate();
    if (publicId.length < MIN_PUBLIC_ID_LEN || publicId.length > MAX_PUBLIC_ID_LEN) continue;

    const collision = await ctx.db
      .query("seals")
      .withIndex("by_publicId", (q: any) => q.eq("publicId", publicId))
      .first();

    if (!collision) return publicId;
  }

  throw new Error("Unable to generate a unique seal publicId (too many collisions).");
}

function assertValidEvidence(evidence: Evidence) {
  if (!Number.isFinite(evidence.consensusScore)) {
    throw new Error("consensusScore must be a number.");
  }

  if (evidence.runs.length === 0) throw new Error("evidence.runs must be non-empty.");
  if (evidence.runs.length > MAX_RUNS) throw new Error("Too many evidence runs.");

  for (const run of evidence.runs) {
    if (!Number.isFinite(run.durationMs) || run.durationMs < 0) {
      throw new Error("durationMs must be a non-negative number.");
    }

    if (run.rawText && run.rawText.length > MAX_RAW_TEXT_CHARS) {
      throw new Error("rawText is too long.");
    }

    if (run.ok) {
      if (!run.verdict) throw new Error("verdict is required for ok runs.");
      if (run.summary === undefined) throw new Error("summary is required for ok runs.");
      if (run.rubricScore === undefined) throw new Error("rubricScore is required for ok runs.");
      if (run.rubricReasons === undefined) {
        throw new Error("rubricReasons is required for ok runs.");
      }

      const runSummary = run.summary.trim();
      if (runSummary.length < MIN_SUMMARY_CHARS) {
        throw new Error("Run summary is too short.");
      }
      if (runSummary.length > MAX_SUMMARY_CHARS) {
        throw new Error("Run summary is too long.");
      }

      const reasons = run.rubricReasons.trim();
      if (reasons.length === 0) throw new Error("rubricReasons is required.");
      if (reasons.length > MAX_RUBRIC_REASONS_CHARS) {
        throw new Error("rubricReasons is too long.");
      }
    } else {
      const error = run.error?.trim();
      if (!error) throw new Error("error is required for non-ok runs.");
    }
  }
}

function normalizeSealFields(args: {
  claim?: string | undefined;
  sourceExcerpt: string;
  confidence: number;
  summary: string;
  evidence: Evidence;
  createdAt: number;
}): { claim?: string; excerpt: string; summary: string } {
  const excerpt = args.sourceExcerpt.trim();
  if (excerpt.length < MIN_EXCERPT_CHARS) throw new Error("sourceExcerpt is required.");
  if (excerpt.length > MAX_EXCERPT_CHARS) throw new Error("sourceExcerpt is too long.");

  const summary = args.summary.trim();
  if (summary.length < MIN_SUMMARY_CHARS) throw new Error("summary is too short.");
  if (summary.length > MAX_SUMMARY_CHARS) throw new Error("summary is too long.");

  if (!Number.isFinite(args.confidence) || args.confidence < 0 || args.confidence > 100) {
    throw new Error("confidence must be between 0 and 100.");
  }

  if (!Number.isFinite(args.createdAt) || args.createdAt <= 0) {
    throw new Error("createdAt must be a positive epoch timestamp (ms).");
  }

  assertValidEvidence(args.evidence);

  let claim: string | undefined = undefined;
  if (typeof args.claim === "string") {
    claim = args.claim.trim();
    if (claim.length < MIN_CLAIM_CHARS) throw new Error("claim is too short.");
    if (claim.length > MAX_CLAIM_CHARS) throw new Error("claim is too long.");
  }

  return { claim, excerpt, summary };
}

export const getByPublicId = queryGeneric({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const publicId = args.publicId.trim();
    if (!publicId) return null;

    return await ctx.db
      .query("seals")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
  },
});

export const listPublic = queryGeneric({
  args: {
    verdict: v.optional(
      v.union(v.literal("pass"), v.literal("warn"), v.literal("fail"), v.literal("unknown"))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 30, 200));

    if (args.verdict) {
      return await ctx.db
        .query("seals")
        .withIndex("by_verdict_createdAt", (q) => q.eq("verdict", args.verdict))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("seals").withIndex("by_createdAt").order("desc").take(limit);
  },
});

export const listByMonitor = queryGeneric({
  args: { monitorId: v.id("monitors"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 25, 200));
    return await ctx.db
      .query("seals")
      .withIndex("by_monitorId_createdAt", (q) => q.eq("monitorId", args.monitorId))
      .order("desc")
      .take(limit);
  },
});

export const ingestFromApi = mutationGeneric({
  args: {
    token: v.string(),
    ownerAddress: v.optional(v.string()),
    claim: v.optional(v.string()),
    sourceUrl: v.string(),
    sourceTitle: v.optional(v.string()),
    sourcePublishedAt: v.optional(v.number()),
    sourceExcerpt: v.string(),
    verdict: v.union(v.literal("pass"), v.literal("warn"), v.literal("fail"), v.literal("unknown")),
    confidence: v.number(),
    summary: v.string(),
    evidence: v.object({
      consensusScore: v.number(),
      runs: v.array(
        v.object({
          runIndex: v.number(),
          ok: v.boolean(),
          durationMs: v.number(),
          rawText: v.optional(v.string()),
          error: v.optional(v.string()),
          verdict: v.optional(
            v.union(v.literal("pass"), v.literal("warn"), v.literal("fail"), v.literal("unknown"))
          ),
          confidence: v.optional(v.number()),
          summary: v.optional(v.string()),
          rubricScore: v.optional(v.number()),
          rubricReasons: v.optional(v.string()),
        })
      ),
    }),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const expected = process.env.CORTSEAL_INGEST_TOKEN;
    if (!expected || args.token !== expected) {
      throw new Error("Unauthorized: invalid ingest token.");
    }

    const ownerAddress = normalizeOwnerAddress(args.ownerAddress);

    const normalized = normalizeSealFields({
      claim: args.claim,
      sourceExcerpt: args.sourceExcerpt,
      confidence: args.confidence,
      summary: args.summary,
      evidence: args.evidence as unknown as Evidence,
      createdAt: args.createdAt,
    });

    const publicId = await generateUniquePublicId(ctx);

    const sealId = await ctx.db.insert("seals", {
      ownerAddress,
      publicId,
      monitorId: undefined,
      feedItemId: undefined,
      claim: normalized.claim,
      sourceUrl: args.sourceUrl,
      sourceTitle: args.sourceTitle,
      sourcePublishedAt: args.sourcePublishedAt,
      sourceExcerpt: normalized.excerpt,
      verdict: args.verdict,
      confidence: Math.round(args.confidence),
      summary: normalized.summary,
      evidence: args.evidence,
      createdAt: args.createdAt,
    });

    const created = await ctx.db.get(sealId);
    if (!created) throw new Error("Failed to load created seal.");
    return created;
  },
});

export const _upsertFromMonitor = internalMutationGeneric({
  args: {
    monitorId: v.id("monitors"),
    feedItemId: v.optional(v.string()),
    sourceUrl: v.string(),
    sourceTitle: v.optional(v.string()),
    sourcePublishedAt: v.optional(v.number()),
    sourceExcerpt: v.string(),
    verdict: v.union(v.literal("pass"), v.literal("warn"), v.literal("fail"), v.literal("unknown")),
    confidence: v.number(),
    summary: v.string(),
    evidence: v.object({
      consensusScore: v.number(),
      runs: v.array(
        v.object({
          runIndex: v.number(),
          ok: v.boolean(),
          durationMs: v.number(),
          rawText: v.optional(v.string()),
          error: v.optional(v.string()),
          verdict: v.optional(
            v.union(v.literal("pass"), v.literal("warn"), v.literal("fail"), v.literal("unknown"))
          ),
          confidence: v.optional(v.number()),
          summary: v.optional(v.string()),
          rubricScore: v.optional(v.number()),
          rubricReasons: v.optional(v.string()),
        })
      ),
    }),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor) throw new Error("Monitor not found.");

    if (args.feedItemId) {
      const existing = await ctx.db
        .query("seals")
        .withIndex("by_monitorId_feedItemId", (q) =>
          (q as any).eq("monitorId", args.monitorId).eq("feedItemId", args.feedItemId)
        )
        .first();

      if (existing) {
        if (existing.publicId) return existing.publicId;
        const publicId = await generateUniquePublicId(ctx);
        await ctx.db.patch(existing._id, {
          publicId,
          ownerAddress: existing.ownerAddress ?? monitor.ownerAddress,
        });
        return publicId;
      }
    }

    const normalized = normalizeSealFields({
      claim: undefined,
      sourceExcerpt: args.sourceExcerpt,
      confidence: args.confidence,
      summary: args.summary,
      evidence: args.evidence as unknown as Evidence,
      createdAt: args.createdAt,
    });

    const publicId = await generateUniquePublicId(ctx);

    await ctx.db.insert("seals", {
      ownerAddress: monitor.ownerAddress,
      publicId,
      monitorId: args.monitorId,
      feedItemId: args.feedItemId,
      claim: undefined,
      sourceUrl: args.sourceUrl,
      sourceTitle: args.sourceTitle,
      sourcePublishedAt: args.sourcePublishedAt,
      sourceExcerpt: normalized.excerpt,
      verdict: args.verdict,
      confidence: Math.round(args.confidence),
      summary: normalized.summary,
      evidence: args.evidence,
      createdAt: args.createdAt,
    });

    return publicId;
  },
});
