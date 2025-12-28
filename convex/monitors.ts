import {
  anyApi,
  internalMutationGeneric,
  internalQueryGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { v } from "convex/values";

import { assertSafeExternalUrl } from "./lib/monitorsShared";
import { normalizeOwnerAddress } from "./lib/ownerAddress";

const MIN_MONITOR_NAME_LEN = 3;
const MAX_MONITOR_NAME_LEN = 80;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 24 * 60;
const LOCK_MS = 4 * 60 * 1000;
const MAX_DUE_MONITORS_PER_TICK = 25;

function nowMs(): number {
  return Date.now();
}

function clampInt(value: number, min: number, max: number): number {
  const floored = Math.floor(value);
  return Math.max(min, Math.min(max, floored));
}

export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("monitors").withIndex("by_createdAt").order("desc").collect();
  },
});

export const listByOwner = queryGeneric({
  args: { ownerAddress: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const ownerAddress = normalizeOwnerAddress(args.ownerAddress);
    const limit = Math.max(1, Math.min(args.limit ?? 40, 200));
    return await ctx.db
      .query("monitors")
      .withIndex("by_owner_createdAt", (q) => q.eq("ownerAddress", ownerAddress))
      .order("desc")
      .take(limit);
  },
});

export const get = queryGeneric({
  args: { id: v.id("monitors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listRuns = queryGeneric({
  args: { monitorId: v.id("monitors"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 25, 200));
    return await ctx.db
      .query("monitorRuns")
      .withIndex("by_monitorId_startedAt", (q) => q.eq("monitorId", args.monitorId))
      .order("desc")
      .take(limit);
  },
});

export const create = mutationGeneric({
  args: {
    ownerAddress: v.optional(v.string()),
    name: v.string(),
    kind: v.union(v.literal("rss"), v.literal("router")),
    intervalMinutes: v.number(),
    feedUrl: v.optional(v.string()),
    routerBaseUrl: v.optional(v.string()),
    minMinerCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ownerAddress = normalizeOwnerAddress(args.ownerAddress);
    const name = args.name.trim();
    if (name.length < MIN_MONITOR_NAME_LEN || name.length > MAX_MONITOR_NAME_LEN) {
      throw new Error(`name must be between ${MIN_MONITOR_NAME_LEN} and ${MAX_MONITOR_NAME_LEN}.`);
    }

    const intervalMinutes = clampInt(args.intervalMinutes, MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES);
    const t = nowMs();

    let feedUrl: string | undefined = undefined;
    let routerBaseUrl: string | undefined = undefined;
    let minMinerCount: number | undefined = undefined;

    if (args.kind === "rss") {
      if (!args.feedUrl) throw new Error("feedUrl is required for rss monitors.");
      feedUrl = assertSafeExternalUrl(args.feedUrl);
    } else if (args.kind === "router") {
      if (args.routerBaseUrl) {
        routerBaseUrl = assertSafeExternalUrl(args.routerBaseUrl);
      }
      minMinerCount = Math.max(0, Math.floor(args.minMinerCount ?? 1));
    } else {
      throw new Error("Unsupported monitor kind.");
    }

    const monitorId = await ctx.db.insert("monitors", {
      ownerAddress,
      name,
      kind: args.kind,
      enabled: true,
      intervalMinutes,
      nextRunAt: t + intervalMinutes * 60_000,
      lockedUntil: t + LOCK_MS,
      feedUrl,
      lastSeenItemId: undefined,
      routerBaseUrl,
      minMinerCount,
      lastHealthOk: undefined,
      lastAlertAt: undefined,
      createdAt: t,
      updatedAt: t,
    });

    await ctx.scheduler.runAfter(0, anyApi.monitorsActions.runMonitor, { monitorId });
    return monitorId;
  },
});

export const toggleEnabled = mutationGeneric({
  args: { id: v.id("monitors"), enabled: v.boolean() },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.id);
    if (!monitor) throw new Error("Monitor not found.");

    const t = nowMs();
    await ctx.db.patch(args.id, {
      enabled: args.enabled,
      nextRunAt: args.enabled ? Math.min(monitor.nextRunAt, t) : monitor.nextRunAt,
      lockedUntil: args.enabled ? Math.min(monitor.lockedUntil ?? t - 1, t - 1) : monitor.lockedUntil,
      updatedAt: t,
    });
  },
});

export const runNow = mutationGeneric({
  args: { id: v.id("monitors") },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.id);
    if (!monitor) throw new Error("Monitor not found.");

    const t = nowMs();
    if (monitor.lockedUntil && monitor.lockedUntil > t) {
      throw new Error("Monitor is currently locked (already running).");
    }

    const nextRunAt = t + monitor.intervalMinutes * 60_000;

    await ctx.db.patch(args.id, {
      lockedUntil: t + LOCK_MS,
      nextRunAt,
      updatedAt: t,
    });

    await ctx.scheduler.runAfter(0, anyApi.monitorsActions.runMonitor, { monitorId: monitor._id });
  },
});

export const tick = internalMutationGeneric({
  args: {},
  handler: async (ctx) => {
    const t = nowMs();

    const due = await ctx.db
      .query("monitors")
      .withIndex("by_enabled_nextRunAt", (q) =>
        (q as any).eq("enabled", true).lte("nextRunAt", t)
      )
      .order("asc")
      .take(MAX_DUE_MONITORS_PER_TICK);

    for (const monitor of due) {
      if (monitor.lockedUntil && monitor.lockedUntil > t) continue;

      const nextRunAt = t + monitor.intervalMinutes * 60_000;

      await ctx.db.patch(monitor._id, {
        lockedUntil: t + LOCK_MS,
        nextRunAt,
        updatedAt: t,
      });

      await ctx.scheduler.runAfter(0, anyApi.monitorsActions.runMonitor, { monitorId: monitor._id });
    }
  },
});

export const _getInternal = internalQueryGeneric({
  args: { monitorId: v.id("monitors") },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor) throw new Error("Monitor not found.");
    return monitor;
  },
});

export const _createRun = internalMutationGeneric({
  args: { monitorId: v.id("monitors"), startedAt: v.number() },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor) throw new Error("Monitor not found.");
    return await ctx.db.insert("monitorRuns", {
      ownerAddress: monitor.ownerAddress,
      monitorId: args.monitorId,
      startedAt: args.startedAt,
      status: "success",
      createdAt: args.startedAt,
    });
  },
});

export const _finishRun = internalMutationGeneric({
  args: {
    runId: v.id("monitorRuns"),
    finishedAt: v.number(),
    durationMs: v.number(),
    status: v.union(v.literal("success"), v.literal("error"), v.literal("skipped")),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
    newItems: v.optional(v.number()),
    createdSeals: v.optional(v.number()),
    routerStatusHttp: v.optional(v.number()),
    minerCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      finishedAt: args.finishedAt,
      durationMs: args.durationMs,
      status: args.status,
      summary: args.summary,
      error: args.error,
      newItems: args.newItems,
      createdSeals: args.createdSeals,
      routerStatusHttp: args.routerStatusHttp,
      minerCount: args.minerCount,
    });
  },
});

export const _updateMonitorAfterRun = internalMutationGeneric({
  args: {
    monitorId: v.id("monitors"),
    unlockAt: v.number(),
    lastSeenItemId: v.optional(v.string()),
    lastHealthOk: v.optional(v.boolean()),
    lastAlertAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      lockedUntil: args.unlockAt - 1,
      updatedAt: args.unlockAt,
    };

    if (args.lastSeenItemId !== undefined) {
      patch.lastSeenItemId = args.lastSeenItemId;
    }
    if (args.lastHealthOk !== undefined) {
      patch.lastHealthOk = args.lastHealthOk;
    }
    if (args.lastAlertAt !== undefined) {
      patch.lastAlertAt = args.lastAlertAt;
    }

    await ctx.db.patch(args.monitorId, patch);
  },
});
