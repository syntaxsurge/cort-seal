import "server-only";

import { anyApi } from "convex/server";
import { z } from "zod";

import { getConvexHttpClient } from "@/lib/db/convex/httpClient";

const verdictSchema = z.union([
  z.literal("pass"),
  z.literal("warn"),
  z.literal("fail"),
  z.literal("unknown"),
]);

const analysisSummarySchema = z.object({
  id: z.string().min(1),
  createdAt: z.number(),
  status: z.union([z.literal("completed"), z.literal("error")]),
  resultKind: z.string().nullable(),
  analysisType: z.union([z.literal("try"), z.literal("audit")]),
  promptPreview: z.string().nullable(),
});

const proofSummarySchema = z.object({
  id: z.string().min(1),
  createdAt: z.number(),
  publicId: z.string().min(8),
  analysisId: z.string().min(1),
  bundleHashSha256: z.string().min(16),
  bundleBytes: z.number(),
});

const sealSummarySchema = z.object({
  id: z.string().min(1),
  createdAt: z.number(),
  publicId: z.string().min(8),
  verdict: verdictSchema,
  confidence: z.number(),
  claim: z.string().optional().nullable(),
  sourceTitle: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
});

const monitorSummarySchema = z.object({
  id: z.string().min(1),
  createdAt: z.number(),
  name: z.string().min(1),
  kind: z.union([z.literal("rss"), z.literal("router")]),
  enabled: z.boolean(),
  feedUrl: z.string().optional().nullable(),
  routerBaseUrl: z.string().optional().nullable(),
});

const directoryArtifactsSchema = z.object({
  analyses: z.array(analysisSummarySchema),
  proofs: z.array(proofSummarySchema),
  seals: z.array(sealSummarySchema),
  monitors: z.array(monitorSummarySchema),
});

export type DirectoryArtifacts = z.infer<typeof directoryArtifactsSchema>;

export async function listDirectoryArtifacts(args?: {
  limit?: number;
}): Promise<DirectoryArtifacts> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.directory.listArtifacts, {
    limit: args?.limit,
  });
  const parsed = directoryArtifactsSchema.safeParse(result);
  if (!parsed.success) {
    return {
      analyses: [],
      proofs: [],
      seals: [],
      monitors: [],
    };
  }
  return parsed.data;
}
