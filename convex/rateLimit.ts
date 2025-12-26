import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

const MAX_KEY_CHARS = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 10_000;
const MIN_WINDOW_SECONDS = 1;
const MAX_WINDOW_SECONDS = 24 * 60 * 60;

export const consume = mutationGeneric({
  args: {
    key: v.string(),
    limit: v.number(),
    windowSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const key = args.key.trim();
    if (!key) throw new Error("key is required.");
    if (key.length > MAX_KEY_CHARS) throw new Error("key is too long.");

    const limit = Math.floor(args.limit);
    if (!Number.isFinite(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
      throw new Error(`limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}.`);
    }

    const windowSeconds = Math.floor(args.windowSeconds);
    if (
      !Number.isFinite(windowSeconds) ||
      windowSeconds < MIN_WINDOW_SECONDS ||
      windowSeconds > MAX_WINDOW_SECONDS
    ) {
      throw new Error(
        `windowSeconds must be between ${MIN_WINDOW_SECONDS} and ${MAX_WINDOW_SECONDS}.`
      );
    }

    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;

    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key_windowStart", (q) =>
        (q as any).eq("key", key).eq("windowStart", windowStart)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("rateLimits", { key, windowStart, count: 1 });
      return {
        allowed: true,
        remaining: Math.max(0, limit - 1),
        resetAt: windowStart + windowMs,
      };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStart + windowMs,
      };
    }

    const nextCount = existing.count + 1;
    await ctx.db.patch(existing._id, { count: nextCount });

    return {
      allowed: true,
      remaining: Math.max(0, limit - nextCount),
      resetAt: windowStart + windowMs,
    };
  },
});
