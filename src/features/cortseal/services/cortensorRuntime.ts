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
    if (response.result !== undefined) {
      return JSON.stringify(response.result);
    }
    if (response.output !== undefined) {
      return JSON.stringify(response.output);
    }
    return JSON.stringify(response);
  } catch {
    if (response.result !== undefined) return String(response.result);
    if (response.output !== undefined) return String(response.output);
    return String(response);
  }
}

function normalizeSmartQuotes(text: string): string {
  return text.replace(/[“”]/g, "\"").replace(/[‘’]/g, "'");
}

function removeTrailingCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, "$1");
}

function quoteUnquotedKeys(text: string): string {
  let result = "";
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;

    if (inDouble) {
      result += ch;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "\"") {
        inDouble = false;
      }
      continue;
    }

    if (ch === "\"") {
      inDouble = true;
      result += ch;
      continue;
    }

    if (ch === "{" || ch === ",") {
      let j = i + 1;
      let whitespace = "";
      while (j < text.length && /\s/.test(text[j]!)) {
        whitespace += text[j]!;
        j += 1;
      }

      const start = j;
      if (j < text.length && /[A-Za-z_]/.test(text[j]!)) {
        j += 1;
        while (j < text.length && /[A-Za-z0-9_]/.test(text[j]!)) {
          j += 1;
        }

        const key = text.slice(start, j);
        let k = j;
        let afterKeyWhitespace = "";
        while (k < text.length && /\s/.test(text[k]!)) {
          afterKeyWhitespace += text[k]!;
          k += 1;
        }

        if (text[k] === ":") {
          result += `${ch}${whitespace}"${key}"${afterKeyWhitespace}:`;
          i = k;
          continue;
        }
      }
    }

    result += ch;
  }

  return result;
}

function convertSingleQuotedStrings(text: string): string {
  let result = "";
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;

    if (inSingle) {
      if (escaped) {
        if (ch === "\"") {
          result += "\\\"";
        } else if (ch === "'") {
          result += "'";
        } else {
          result += ch;
        }
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        result += "\\";
        escaped = true;
        continue;
      }

      if (ch === "'") {
        result += "\"";
        inSingle = false;
        continue;
      }

      if (ch === "\"") {
        result += "\\\"";
        continue;
      }

      result += ch;
      continue;
    }

    if (inDouble) {
      result += ch;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "\"") {
        inDouble = false;
      }
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      result += "\"";
      continue;
    }

    if (ch === "\"") {
      inDouble = true;
      result += ch;
      continue;
    }

    result += ch;
  }

  return result;
}

function repairJsonText(text: string): string {
  let repaired = text.trim();
  if (!repaired) return repaired;

  repaired = normalizeSmartQuotes(repaired);
  repaired = convertSingleQuotedStrings(repaired);
  repaired = removeTrailingCommas(repaired);
  repaired = quoteUnquotedKeys(repaired);
  repaired = removeTrailingCommas(repaired);

  return repaired;
}

function tryParseJsonCandidate(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // fallthrough
  }

  const repaired = repairJsonText(trimmed);
  if (repaired !== trimmed) {
    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }

  return null;
}

function unwrapJsonContainer(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;

  const obj = value as Record<string, unknown>;
  const keys = ["output", "result", "data"] as const;

  for (const key of keys) {
    const candidate = obj[key];
    if (typeof candidate === "string") {
      const parsed = tryParseJsonCandidate(candidate);
      if (parsed !== null) return parsed;
    } else if (typeof candidate === "object" && candidate !== null) {
      return candidate;
    }
  }

  return value;
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

  const direct = tryParseJsonCandidate(trimmed);
  if (direct !== null) return unwrapJsonContainer(direct);

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    const inside = fenceMatch[1].trim();
    const parsed = tryParseJsonCandidate(inside);
    if (parsed !== null) return unwrapJsonContainer(parsed);
  }

  const jsonSubstring = findFirstJsonSubstring(trimmed);
  if (!jsonSubstring) return null;

  const parsed = tryParseJsonCandidate(jsonSubstring);
  if (parsed !== null) return unwrapJsonContainer(parsed);
  return null;
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
