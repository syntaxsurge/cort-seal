import "server-only";

import { anyApi } from "convex/server";
import type { GenericId } from "convex/values";
import { z } from "zod";

import { getConvexHttpClient } from "@/lib/db/convex/httpClient";

const verdictSchema = z.union([
  z.literal("pass"),
  z.literal("warn"),
  z.literal("fail"),
  z.literal("unknown"),
]);

const publicIdSchema = z.string().trim().min(12).max(64);

export const sealRunSchema = z
  .object({
    runIndex: z.number(),
    ok: z.boolean(),
    durationMs: z.number(),
    rawText: z.string().optional(),
    error: z.string().optional(),
    verdict: verdictSchema.optional(),
    confidence: z.number().optional(),
    summary: z.string().optional(),
    rubricScore: z.number().optional(),
    rubricReasons: z.string().optional(),
  })
  .passthrough();

export type SealRun = z.infer<typeof sealRunSchema>;

export const sealDocSchema = z
  .object({
    _id: z.string().min(1),
    publicId: publicIdSchema,
    monitorId: z.string().optional(),
    feedItemId: z.string().optional(),
    claim: z.string().optional(),
    sourceUrl: z.string().url(),
    sourceTitle: z.string().optional(),
    sourcePublishedAt: z.number().optional(),
    sourceExcerpt: z.string(),
    verdict: verdictSchema,
    confidence: z.number(),
    summary: z.string(),
    evidence: z.object({
      consensusScore: z.number(),
      runs: z.array(sealRunSchema),
    }),
    createdAt: z.number(),
  })
  .passthrough();

export type SealDoc = z.infer<typeof sealDocSchema>;

export async function getSealByPublicId(publicId: string): Promise<SealDoc | null> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.seals.getByPublicId, { publicId });
  if (!result) return null;
  const parsed = sealDocSchema.safeParse(result);
  return parsed.success ? parsed.data : null;
}

export async function listPublicSeals(args?: {
  verdict?: z.infer<typeof verdictSchema>;
  limit?: number;
}): Promise<SealDoc[]> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.seals.listPublic, {
    verdict: args?.verdict,
    limit: args?.limit,
  });
  const parsed = z.array(z.unknown()).safeParse(result);
  if (!parsed.success) return [];

  const seals: SealDoc[] = [];
  for (const item of parsed.data) {
    const doc = sealDocSchema.safeParse(item);
    if (doc.success) seals.push(doc.data);
  }

  return seals;
}

export async function listSealsByMonitor(args: {
  monitorId: GenericId<"monitors">;
  limit?: number;
}): Promise<SealDoc[]> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.seals.listByMonitor, {
    monitorId: args.monitorId,
    limit: args.limit,
  });
  const parsed = z.array(z.unknown()).safeParse(result);
  if (!parsed.success) return [];

  const seals: SealDoc[] = [];
  for (const item of parsed.data) {
    const doc = sealDocSchema.safeParse(item);
    if (doc.success) seals.push(doc.data);
  }

  return seals;
}

export function sealSharePath(id: string): string {
  return `/seal/${id}`;
}
