import "server-only";

import { anyApi } from "convex/server";
import type { GenericId } from "convex/values";
import { z } from "zod";

import { getConvexHttpClient } from "@/lib/db/convex/httpClient";

export const monitorDocSchema = z
  .object({
    _id: z.string().min(1),
    ownerAddress: z.string().optional(),
    name: z.string(),
    kind: z.union([z.literal("rss"), z.literal("router")]),
    enabled: z.boolean(),
    intervalMinutes: z.number(),
    nextRunAt: z.number(),
    lockedUntil: z.number().optional(),
    feedUrl: z.string().optional(),
    lastSeenItemId: z.string().optional(),
    routerBaseUrl: z.string().optional(),
    minMinerCount: z.number().optional(),
    lastHealthOk: z.boolean().optional(),
    lastAlertAt: z.number().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .passthrough();

export type MonitorDoc = z.infer<typeof monitorDocSchema>;

export const monitorRunDocSchema = z
  .object({
    _id: z.string().min(1),
    ownerAddress: z.string().optional(),
    monitorId: z.string().min(1),
    startedAt: z.number(),
    finishedAt: z.number().optional(),
    durationMs: z.number().optional(),
    status: z.union([z.literal("success"), z.literal("error"), z.literal("skipped")]),
    summary: z.string().optional(),
    error: z.string().optional(),
    newItems: z.number().optional(),
    createdSeals: z.number().optional(),
    routerStatusHttp: z.number().optional(),
    minerCount: z.number().optional(),
    createdAt: z.number(),
  })
  .passthrough();

export type MonitorRunDoc = z.infer<typeof monitorRunDocSchema>;

export async function listMonitors(): Promise<MonitorDoc[]> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.monitors.list, {});
  const parsed = z.array(monitorDocSchema).safeParse(result);
  return parsed.success ? parsed.data : [];
}

export async function getMonitorById(
  id: GenericId<"monitors">
): Promise<MonitorDoc | null> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.monitors.get, { id });
  if (!result) return null;
  const parsed = monitorDocSchema.safeParse(result);
  return parsed.success ? parsed.data : null;
}

export async function listMonitorRuns(args: {
  monitorId: GenericId<"monitors">;
  limit?: number;
}): Promise<MonitorRunDoc[]> {
  const convex = getConvexHttpClient();
  const result = await convex.query(anyApi.monitors.listRuns, {
    monitorId: args.monitorId,
    limit: args.limit,
  });
  const parsed = z.array(monitorRunDocSchema).safeParse(result);
  return parsed.success ? parsed.data : [];
}
