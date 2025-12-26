import "server-only";

import { assertSafeRemoteUrl } from "@/lib/security/safeUrl";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_HTML_BYTES = 1_500_000;
const DEFAULT_MAX_TEXT_CHARS = 80_000;
const DEFAULT_MAX_REDIRECTS = 4;

export type ReadableTextResult = {
  finalUrl: string;
  title: string;
  byline?: string;
  text: string;
};

const htmlEntityMap: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const key = String(entity).toLowerCase();

    if (key.startsWith("#x")) {
      const codePoint = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (key.startsWith("#")) {
      const codePoint = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return htmlEntityMap[key] ?? match;
  });
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  return normalizeText(decodeHtmlEntities(match[1]));
}

function stripHtmlToText(html: string): string {
  let out = html;

  out = out.replace(/<!--([\s\S]*?)-->/g, " ");
  out = out.replace(
    /<(script|style|noscript|svg|canvas|iframe)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );

  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/(p|div|section|article|header|footer|li|h[1-6])>/gi, "\n\n");

  out = out.replace(/<[^>]+>/g, " ");
  out = decodeHtmlEntities(out);

  return normalizeText(out);
}

async function fetchHtmlWithRedirects(
  url: URL,
  options: { timeoutMs: number; maxHtmlBytes: number; maxRedirects: number }
): Promise<{ finalUrl: URL; html: string }> {
  let current = url;

  for (let redirectCount = 0; redirectCount <= options.maxRedirects; redirectCount += 1) {
    const res = await fetch(current, {
      method: "GET",
      headers: {
        "User-Agent": "CortSealValidator/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect missing Location header.");
      const next = new URL(location, current);
      current = await assertSafeRemoteUrl(next.toString());
      continue;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch URL (HTTP ${res.status}).`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error(
        `Unsupported content-type: ${contentType || "unknown"} (expected text/html).`
      );
    }

    const contentLengthHeader = res.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > options.maxHtmlBytes) {
        throw new Error("HTML response too large.");
      }
    }

    const html = await res.text();
    const byteLength = Buffer.byteLength(html, "utf8");
    if (byteLength > options.maxHtmlBytes) {
      throw new Error("HTML response too large.");
    }

    return { finalUrl: current, html };
  }

  throw new Error("Too many redirects.");
}

export async function fetchReadableText(
  url: URL,
  options?: {
    timeoutMs?: number;
    maxHtmlBytes?: number;
    maxTextChars?: number;
    maxRedirects?: number;
  }
): Promise<ReadableTextResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxHtmlBytes = options?.maxHtmlBytes ?? DEFAULT_MAX_HTML_BYTES;
  const maxTextChars = options?.maxTextChars ?? DEFAULT_MAX_TEXT_CHARS;
  const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  const { finalUrl, html } = await fetchHtmlWithRedirects(url, {
    timeoutMs,
    maxHtmlBytes,
    maxRedirects,
  });

  const title = extractTitle(html) || finalUrl.hostname;
  const text = stripHtmlToText(html).slice(0, maxTextChars);

  if (text.length < 200) {
    throw new Error("Unable to extract sufficient readable text from the URL.");
  }

  return { finalUrl: finalUrl.toString(), title, text };
}
