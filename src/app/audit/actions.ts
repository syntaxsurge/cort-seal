"use server";

import { anyApi } from "convex/server";
import { z } from "zod";

import { CortensorHttpError } from "@/lib/cortensor/types";
import { getConvexHttpClient } from "@/lib/db/convex/httpClient";
import { getServerEnv } from "@/lib/env/server";
import { fetchReadableText } from "@/lib/fetchers/readableText";
import { assertSafeRemoteUrl } from "@/lib/security/safeUrl";
import { runSourceAudit } from "@/features/cortseal/services/sourceAudit";

export type RunAuditState =
  | { ok: true; analysisId: string }
  | { ok: false; error: string };

const runAuditSchema = z.object({
  url: z.string().trim().url(),
  maxClaims: z.coerce.number().int().min(1).max(20).default(12),
  runsPerClaim: z.coerce.number().int().min(2).max(5).default(3),
});

function formatUnknownError(err: unknown): string {
  if (err instanceof CortensorHttpError) {
    const bodyPreview = err.body.length > 1000 ? `${err.body.slice(0, 1000)}…` : err.body;
    return `Cortensor request failed (HTTP ${err.status}): ${bodyPreview}`;
  }

  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export async function runAudit(
  _prevState: RunAuditState | null,
  formData: FormData
): Promise<RunAuditState> {
  const parsedInput = runAuditSchema.safeParse({
    url: formData.get("url"),
    maxClaims: formData.get("maxClaims"),
    runsPerClaim: formData.get("runsPerClaim"),
  });

  if (!parsedInput.success) {
    const message =
      parsedInput.error.issues[0]?.message ?? "Invalid input. Please try again.";
    return { ok: false, error: message };
  }

  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch (err) {
    return { ok: false, error: formatUnknownError(err) };
  }

  const startedAt = Date.now();

  try {
    const safeUrl = await assertSafeRemoteUrl(parsedInput.data.url);
    const fetchedAt = Date.now();
    const doc = await fetchReadableText(safeUrl);

    const result = await runSourceAudit({
      sourceUrl: doc.finalUrl,
      title: doc.title,
      text: doc.text,
      fetchedAt,
      maxClaims: parsedInput.data.maxClaims,
      runsPerClaim: parsedInput.data.runsPerClaim,
    });

    const durationMs = Date.now() - startedAt;
    const convex = getConvexHttpClient();
    const analysisId = await convex.mutation(anyApi.analyses.create, {
      prompt: doc.finalUrl,
      status: "completed",
      result,
      durationMs,
      sessionId: env.CORTENSOR_SESSION_ID,
    });

    return { ok: true, analysisId };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const error = formatUnknownError(err);

    try {
      const convex = getConvexHttpClient();
      const analysisId = await convex.mutation(anyApi.analyses.create, {
        prompt: parsedInput.data.url,
        status: "error",
        error,
        durationMs,
        sessionId: env.CORTENSOR_SESSION_ID,
      });

      return { ok: true, analysisId };
    } catch {
      return { ok: false, error };
    }
  }
}

