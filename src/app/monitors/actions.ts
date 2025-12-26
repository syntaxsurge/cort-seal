"use server";

import { anyApi } from "convex/server";
import type { GenericId } from "convex/values";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getConvexHttpClient } from "@/lib/db/convex/httpClient";

export type CreateMonitorState =
  | { ok: true; monitorId: string }
  | { ok: false; error: string };

const monitorKindSchema = z.union([z.literal("rss"), z.literal("router")]);

const createMonitorSchema = z.object({
  name: z.string().trim().min(3).max(80),
  kind: monitorKindSchema,
  intervalMinutes: z.coerce.number().int().min(1).max(1440),
  feedUrl: z.string().trim().url().optional(),
  routerBaseUrl: z.string().trim().url().optional(),
  minMinerCount: z.coerce.number().int().min(0).max(10000).optional(),
});

const monitorIdSchema = z.string().min(1);

function safeReturnTo(raw: unknown): string {
  if (typeof raw !== "string") return "/monitors";
  if (!raw.startsWith("/")) return "/monitors";
  if (raw.startsWith("//")) return "/monitors";
  return raw;
}

export async function createMonitor(
  _prevState: CreateMonitorState | null,
  formData: FormData
): Promise<CreateMonitorState> {
  const parsedInput = createMonitorSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    intervalMinutes: formData.get("intervalMinutes"),
    feedUrl: formData.get("feedUrl") || undefined,
    routerBaseUrl: formData.get("routerBaseUrl") || undefined,
    minMinerCount: formData.get("minMinerCount") || undefined,
  });

  if (!parsedInput.success) {
    const message =
      parsedInput.error.issues[0]?.message ?? "Invalid input. Please try again.";
    return { ok: false, error: message };
  }

  if (parsedInput.data.kind === "rss" && !parsedInput.data.feedUrl) {
    return { ok: false, error: "Feed URL is required for RSS monitors." };
  }

  try {
    const convex = getConvexHttpClient();
    const monitorId = await convex.mutation(anyApi.monitors.create, {
      name: parsedInput.data.name,
      kind: parsedInput.data.kind,
      intervalMinutes: parsedInput.data.intervalMinutes,
      feedUrl: parsedInput.data.kind === "rss" ? parsedInput.data.feedUrl : undefined,
      routerBaseUrl:
        parsedInput.data.kind === "router" ? parsedInput.data.routerBaseUrl : undefined,
      minMinerCount:
        parsedInput.data.kind === "router" ? parsedInput.data.minMinerCount : undefined,
    });

    return { ok: true, monitorId: String(monitorId) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}

export async function runMonitorNow(formData: FormData): Promise<void> {
  const idRaw = formData.get("monitorId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  const parsedId = monitorIdSchema.safeParse(idRaw);
  if (!parsedId.success) {
    redirect(returnTo);
  }

  const monitorId = parsedId.data as GenericId<"monitors">;

  const convex = getConvexHttpClient();
  await convex.mutation(anyApi.monitors.runNow, { id: monitorId });

  revalidatePath("/monitors");
  revalidatePath(`/monitors/${monitorId}`);
  redirect(returnTo);
}

export async function setMonitorEnabled(formData: FormData): Promise<void> {
  const idRaw = formData.get("monitorId");
  const enabledRaw = formData.get("enabled");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  const parsedId = monitorIdSchema.safeParse(idRaw);
  if (!parsedId.success) {
    redirect(returnTo);
  }

  const enabled = enabledRaw === "true";
  const monitorId = parsedId.data as GenericId<"monitors">;

  const convex = getConvexHttpClient();
  await convex.mutation(anyApi.monitors.toggleEnabled, { id: monitorId, enabled });

  revalidatePath("/monitors");
  revalidatePath(`/monitors/${monitorId}`);
  redirect(returnTo);
}

