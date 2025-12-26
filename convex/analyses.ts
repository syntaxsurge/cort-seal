import { v } from "convex/values";

import { mutationGeneric, queryGeneric } from "convex/server";

const MAX_PROMPT_CHARS = 12_000;

export const create = mutationGeneric({
  args: {
    prompt: v.string(),
    status: v.union(v.literal("completed"), v.literal("error")),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    durationMs: v.number(),
    sessionId: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.prompt.length > MAX_PROMPT_CHARS) {
      throw new Error(`Prompt too long (max ${MAX_PROMPT_CHARS} chars).`);
    }

    if (args.status === "completed" && args.result === undefined) {
      throw new Error("Completed analyses must include a result.");
    }

    if (args.status === "error" && args.error === undefined) {
      throw new Error("Errored analyses must include an error message.");
    }

    return ctx.db.insert("analyses", {
      prompt: args.prompt,
      status: args.status,
      result: args.result,
      error: args.error,
      createdAt: Date.now(),
      durationMs: args.durationMs,
      sessionId: args.sessionId,
    });
  },
});

export const get = queryGeneric({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});
