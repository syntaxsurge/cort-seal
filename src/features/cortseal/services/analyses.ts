import "server-only";

import { anyApi } from "convex/server";
import type { GenericId } from "convex/values";
import { z } from "zod";

import { getConvexHttpClient } from "@/lib/db/convex/httpClient";

export const analysisSchema = z
  .object({
    ownerAddress: z.string().optional(),
    prompt: z.string(),
    status: z.union([z.literal("completed"), z.literal("error")]),
    result: z.unknown().optional(),
    error: z.string().optional(),
    createdAt: z.number(),
    durationMs: z.number(),
    sessionId: z.number(),
  })
  .passthrough();

export type AnalysisDoc = z.infer<typeof analysisSchema>;

export async function getAnalysisById(id: GenericId<"analyses">): Promise<AnalysisDoc | null> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.analyses.get, { id });
  if (!result) return null;

  const parsed = analysisSchema.safeParse(result);
  if (!parsed.success) return null;

  return parsed.data;
}
