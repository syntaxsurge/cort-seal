import "server-only";

import { getServerEnv } from "@/lib/env/server";
import { CortensorCompletionResponse, CortensorHttpError } from "@/lib/cortensor/types";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

async function readJsonOrText(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { output: text };
  }
}

export async function cortensorCompletion(
  prompt: string,
  options?: {
    sessionId?: number;
    timeoutSeconds?: number;
    signal?: AbortSignal;
  }
): Promise<CortensorCompletionResponse> {
  const env = getServerEnv();
  const baseUrl = normalizeBaseUrl(env.CORTENSOR_ROUTER_URL);
  const sessionId = options?.sessionId ?? env.CORTENSOR_SESSION_ID;
  const timeoutSeconds = options?.timeoutSeconds ?? env.CORTENSOR_TIMEOUT_SECONDS;

  const timeoutSignal = AbortSignal.timeout(timeoutSeconds * 1000);
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  const res = await fetch(`${baseUrl}/api/v1/completions/${sessionId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CORTENSOR_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      stream: false,
      timeout: timeoutSeconds,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new CortensorHttpError("Cortensor completion request failed.", {
      status: res.status,
      body,
    });
  }

  const data = await readJsonOrText(res);
  if (typeof data === "object" && data !== null) {
    return data as CortensorCompletionResponse;
  }

  return { output: String(data) };
}

