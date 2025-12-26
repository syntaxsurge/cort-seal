"use server";

import { anyApi } from "convex/server";
import { z } from "zod";

import { CortensorHttpError } from "@/lib/cortensor/types";
import { runClaimCheck } from "@/features/cortseal/services/claimCheck";
import { getConvexHttpClient } from "@/lib/db/convex/httpClient";
import { getServerEnv } from "@/lib/env/server";

export type RunTryState =
  | { ok: true; analysisId: string }
  | { ok: false; error: string };

const runTrySchema = z.object({
  prompt: z.string().trim().min(1).max(12_000),
});

function formatUnknownError(err: unknown): string {
  if (err instanceof CortensorHttpError) {
    const bodyPreview = err.body.length > 1000 ? `${err.body.slice(0, 1000)}…` : err.body;
    return `Cortensor request failed (HTTP ${err.status}): ${bodyPreview}`;
  }

  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export async function runTry(
  _prevState: RunTryState | null,
  formData: FormData
): Promise<RunTryState> {
  const parsedInput = runTrySchema.safeParse({
    prompt: formData.get("prompt"),
  });

  if (!parsedInput.success) {
    const message =
      parsedInput.error.issues[0]?.message ?? "Invalid input. Please try again.";
    return { ok: false, error: message };
  }

  const { prompt } = parsedInput.data;
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch (err) {
    return { ok: false, error: formatUnknownError(err) };
  }

  const startedAt = Date.now();
  let result: unknown;

  try {
    result = await runClaimCheck(prompt);
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const error = formatUnknownError(err);

    try {
      const convex = getConvexHttpClient();
      const analysisId = await convex.mutation(anyApi.analyses.create, {
        prompt,
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

  const durationMs = Date.now() - startedAt;

  try {
    const convex = getConvexHttpClient();
    const analysisId = await convex.mutation(anyApi.analyses.create, {
      prompt,
      status: "completed",
      result,
      durationMs,
      sessionId: env.CORTENSOR_SESSION_ID,
    });

    return { ok: true, analysisId };
  } catch (err) {
    return { ok: false, error: formatUnknownError(err) };
  }
}
