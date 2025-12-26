import "server-only";

import { cortensorCompletion } from "@/lib/cortensor/client";
import { CortensorHttpError, type CortensorCompletionResponse } from "@/lib/cortensor/types";

export const DEFAULT_MAX_RAW_TEXT_CHARS = 8_000;

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…`;
}

export function completionToText(response: CortensorCompletionResponse): string {
  if (typeof response.output === "string") return response.output;
  if (typeof response.result === "string") return response.result;

  try {
    return JSON.stringify(response.result ?? response);
  } catch {
    return String(response.result ?? response);
  }
}

function findFirstJsonSubstring(text: string): string | null {
  for (let start = 0; start < text.length; start += 1) {
    const ch = text[start];
    if (ch !== "{" && ch !== "[") continue;

    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i += 1) {
      const c = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (c === "\\") {
          escaped = true;
          continue;
        }
        if (c === "\"") {
          inString = false;
          continue;
        }
        continue;
      }

      if (c === "\"") {
        inString = true;
        continue;
      }

      if (c === "{") {
        stack.push("}");
        continue;
      }
      if (c === "[") {
        stack.push("]");
        continue;
      }

      if (c === "}" || c === "]") {
        const expected = stack.pop();
        if (expected !== c) break;
        if (stack.length === 0) {
          return text.slice(start, i + 1);
        }
      }
    }
  }

  return null;
}

export function tryParseJsonFromText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // fallthrough
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    const inside = fenceMatch[1].trim();
    try {
      return JSON.parse(inside);
    } catch {
      // fallthrough
    }
  }

  const jsonSubstring = findFirstJsonSubstring(trimmed);
  if (!jsonSubstring) return null;

  try {
    return JSON.parse(jsonSubstring);
  } catch {
    return null;
  }
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryCortensorError(err: unknown): err is CortensorHttpError {
  if (!(err instanceof CortensorHttpError)) return false;
  return err.status === 429 || err.status >= 500;
}

export async function cortensorCompletionWithRetry(
  prompt: string,
  options?: { maxAttempts?: number }
): Promise<CortensorCompletionResponse> {
  const maxAttempts = options?.maxAttempts ?? 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await cortensorCompletion(prompt);
    } catch (err) {
      if (!shouldRetryCortensorError(err) || attempt === maxAttempts) {
        throw err;
      }

      const baseDelayMs = 300;
      const jitterMs = Math.floor(Math.random() * 120);
      const backoffMs = baseDelayMs * 2 ** (attempt - 1) + jitterMs;
      await delay(backoffMs);
    }
  }

  throw new Error("Unable to reach Cortensor.");
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (concurrency < 1) throw new Error("Concurrency must be at least 1.");

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await fn(items[current]!, current);
    }
  });

  await Promise.all(workers);
  return results;
}

