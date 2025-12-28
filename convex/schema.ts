import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  analyses: defineTable({
    ownerAddress: v.optional(v.string()),
    prompt: v.string(),
    status: v.union(v.literal("completed"), v.literal("error")),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    durationMs: v.number(),
    sessionId: v.number(),
  }).index("by_owner_createdAt", ["ownerAddress", "createdAt"]),

  proofs: defineTable({
    ownerAddress: v.optional(v.string()),
    analysisId: v.id("analyses"),
    publicId: v.string(),
    bundleHashSha256: v.string(),
    bundleJson: v.string(),
    bundleBytes: v.number(),
    createdAt: v.number(),
  })
    .index("by_publicId", ["publicId"])
    .index("by_analysisId", ["analysisId"])
    .index("by_owner_createdAt", ["ownerAddress", "createdAt"]),

  monitors: defineTable({
    ownerAddress: v.optional(v.string()),
    name: v.string(),
    kind: v.union(v.literal("rss"), v.literal("router")),
    enabled: v.boolean(),
    intervalMinutes: v.number(),
    nextRunAt: v.number(),
    lockedUntil: v.optional(v.number()),
    feedUrl: v.optional(v.string()),
    lastSeenItemId: v.optional(v.string()),
    routerBaseUrl: v.optional(v.string()),
    minMinerCount: v.optional(v.number()),
    lastHealthOk: v.optional(v.boolean()),
    lastAlertAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_enabled_nextRunAt", ["enabled", "nextRunAt"])
    .index("by_owner_createdAt", ["ownerAddress", "createdAt"]),

  monitorRuns: defineTable({
    ownerAddress: v.optional(v.string()),
    monitorId: v.id("monitors"),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    status: v.union(v.literal("success"), v.literal("error"), v.literal("skipped")),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
    newItems: v.optional(v.number()),
    createdSeals: v.optional(v.number()),
    routerStatusHttp: v.optional(v.number()),
    minerCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_monitorId_startedAt", ["monitorId", "startedAt"])
    .index("by_owner_createdAt", ["ownerAddress", "createdAt"]),

  seals: defineTable({
    ownerAddress: v.optional(v.string()),
    publicId: v.string(),
    monitorId: v.optional(v.id("monitors")),
    feedItemId: v.optional(v.string()),
    claim: v.optional(v.string()),
    sourceUrl: v.string(),
    sourceTitle: v.optional(v.string()),
    sourcePublishedAt: v.optional(v.number()),
    sourceExcerpt: v.string(),
    verdict: v.union(
      v.literal("pass"),
      v.literal("warn"),
      v.literal("fail"),
      v.literal("unknown")
    ),
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
  })
    .index("by_publicId", ["publicId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_verdict_createdAt", ["verdict", "createdAt"])
    .index("by_monitorId_createdAt", ["monitorId", "createdAt"])
    .index("by_monitorId_feedItemId", ["monitorId", "feedItemId"])
    .index("by_owner_createdAt", ["ownerAddress", "createdAt"]),

  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key_windowStart", ["key", "windowStart"]),
});
