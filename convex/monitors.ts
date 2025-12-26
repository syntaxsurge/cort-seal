import {
  anyApi,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { v } from "convex/values";
import Parser from "rss-parser";
import { z } from "zod";
import net from "node:net";

type Verdict = "pass" | "warn" | "fail" | "unknown";

const MIN_MONITOR_NAME_LEN = 3;
const MAX_MONITOR_NAME_LEN = 80;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 24 * 60;
const LOCK_MS = 4 * 60 * 1000;
const MAX_DUE_MONITORS_PER_TICK = 25;
const MAX_ITEMS_PER_RUN = 2;
const MAX_EXCERPT_CHARS = 6000;
const MAX_MODEL_RAW_TEXT_CHARS = 8000;
const ROUTER_ALERT_COOLDOWN_MS = 30 * 60 * 1000;

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const VerdictSchema = z.enum(["pass", "warn", "fail", "unknown"]);

const SealCandidateSchema = z
  .object({
    verdict: VerdictSchema,
    confidence: z.coerce.number().min(0).max(100),
    summary: z.string().trim().min(10).max(800),
  })
  .passthrough();

const RubricSchema = z
  .object({
    score: z.coerce.number().min(0).max(100),
    reasons: z.string().trim().min(1).max(1600),
  })
  .passthrough();

type ParserItem = {
  id?: string;
  guid?: string;
  link?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  isoDate?: string;
};

function nowMs(): number {
  return Date.now();
}

function clampInt(value: number, min: number, max: number): number {
  const floored = Math.floor(value);
  return Math.max(min, Math.min(max, floored));
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function isBlockedIp(address: string): boolean {
  const zoneIndex = address.indexOf("%");
  const normalized = (zoneIndex === -1 ? address : address.slice(0, zoneIndex)).toLowerCase();

  const ipVersion = net.isIP(normalized);
  if (!ipVersion) return true;

  if (ipVersion === 4) {
    const parts = normalized.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true;
    }

    const [a, b] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  const bytes = parseIpv6Bytes(normalized);
  if (!bytes) return true;

  const isAllZero = bytes.every((b) => b === 0);
  if (isAllZero) return true;

  const isLoopback = bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1;
  if (isLoopback) return true;

  const isMulticast = bytes[0] === 0xff;
  if (isMulticast) return true;

  const isUniqueLocal = (bytes[0] & 0xfe) === 0xfc;
  if (isUniqueLocal) return true;

  const isLinkLocal = bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80;
  if (isLinkLocal) return true;

  const isIpv4Compatible = bytes.slice(0, 12).every((b) => b === 0);
  if (isIpv4Compatible) {
    const ipv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isBlockedIp(ipv4);
  }

  const isIpv4Mapped =
    bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  if (isIpv4Mapped) {
    const ipv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isBlockedIp(ipv4);
  }

  return false;
}

function parseIpv6Bytes(address: string): number[] | null {
  const hasIpv4 = address.includes(".");
  let input = address;

  if (hasIpv4) {
    const lastColon = input.lastIndexOf(":");
    if (lastColon === -1) return null;
    const ipv4Part = input.slice(lastColon + 1);
    const parts = ipv4Part.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return null;
    }
    const left = input.slice(0, lastColon);
    const hextet1 = ((parts[0] as number) << 8) | (parts[1] as number);
    const hextet2 = ((parts[2] as number) << 8) | (parts[3] as number);
    input = `${left}:${hextet1.toString(16)}:${hextet2.toString(16)}`;
  }

  const [leftRaw, rightRaw] = input.split("::", 2);
  const leftParts = leftRaw ? leftRaw.split(":").filter(Boolean) : [];
  const rightParts = rightRaw ? rightRaw.split(":").filter(Boolean) : [];

  if (input.includes("::")) {
    if (rightRaw === undefined) return null;
  } else if (rightParts.length > 0) {
    return null;
  }

  const totalHextets = leftParts.length + rightParts.length;
  if (totalHextets > 8) return null;

  const missing = input.includes("::") ? 8 - totalHextets : 0;
  if (!input.includes("::") && totalHextets !== 8) return null;

  const hextets: number[] = [];

  for (const part of leftParts) {
    const value = Number.parseInt(part, 16);
    if (!Number.isFinite(value) || value < 0 || value > 0xffff) return null;
    hextets.push(value);
  }

  for (let i = 0; i < missing; i += 1) hextets.push(0);

  for (const part of rightParts) {
    const value = Number.parseInt(part, 16);
    if (!Number.isFinite(value) || value < 0 || value > 0xffff) return null;
    hextets.push(value);
  }

  if (hextets.length !== 8) return null;

  const bytes: number[] = [];
  for (const value of hextets) {
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }

  return bytes;
}

function assertSafeExternalUrl(raw: string): string {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed.");
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname) throw new Error("URL must include a hostname.");
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Blocked hostname.");
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion && isBlockedIp(hostname)) {
    throw new Error("Blocked IP address.");
  }

  return url.toString();
}

function parseDateMs(raw?: string): number | undefined {
  if (!raw) return undefined;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function getFeedItemId(item: ParserItem): string | null {
  const candidate = item.id ?? item.guid ?? item.link;
  if (candidate && typeof candidate === "string") return candidate;
  if (item.title && (item.isoDate ?? item.pubDate)) {
    return `${item.title}::${item.isoDate ?? item.pubDate}`;
  }
  return null;
}

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…`;
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
        if (stack.length === 0) return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function tryParseJsonFromText(text: string): unknown | null {
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

function shouldRetryHttp(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function cortensorCompletionText(prompt: string): Promise<string> {
  const baseUrl = process.env.CORTENSOR_ROUTER_URL;
  const apiKey = process.env.CORTENSOR_API_KEY;
  const sessionId = Number(process.env.CORTENSOR_SESSION_ID ?? "0");
  const timeoutSeconds = Number(process.env.CORTENSOR_TIMEOUT_SECONDS ?? "60");

  if (!baseUrl) throw new Error("Missing CORTENSOR_ROUTER_URL in Convex env.");
  if (!apiKey) throw new Error("Missing CORTENSOR_API_KEY in Convex env.");
  if (!Number.isFinite(sessionId) || sessionId < 0) throw new Error("Invalid CORTENSOR_SESSION_ID.");
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    throw new Error("Invalid CORTENSOR_TIMEOUT_SECONDS.");
  }

  const url = `${normalizeBaseUrl(baseUrl)}/api/v1/completions/${sessionId}`;

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        stream: false,
        timeout: timeoutSeconds,
      }),
    },
    timeoutSeconds * 1000 + 2000
  );

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const preview =
      typeof body === "string"
        ? truncateText(body, 800)
        : truncateText(JSON.stringify(body), 800);
    throw new Error(`Cortensor request failed (HTTP ${res.status}): ${preview}`);
  }

  if (typeof body === "string") return body;

  if (typeof body === "object" && body !== null) {
    const maybeOutput = (body as any).output ?? (body as any).result;
    if (typeof maybeOutput === "string") return maybeOutput;
    try {
      return JSON.stringify(maybeOutput ?? body);
    } catch {
      return String(maybeOutput ?? body);
    }
  }

  return String(body);
}

async function cortensorCompletionWithRetry(prompt: string): Promise<string> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await cortensorCompletionText(prompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const statusMatch = message.match(/HTTP\s+(\d{3})/i);
      const status = statusMatch ? Number(statusMatch[1]) : null;

      if (!status || !shouldRetryHttp(status) || attempt === maxAttempts) {
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

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function toFreqVector(tokens: string[]): Map<string, number> {
  const vector = new Map<string, number>();
  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let a2 = 0;
  let b2 = 0;

  for (const [, value] of a) a2 += value * value;
  for (const [, value] of b) b2 += value * value;

  for (const [token, av] of a) {
    const bv = b.get(token);
    if (bv) dot += av * bv;
  }

  const denom = Math.sqrt(a2) * Math.sqrt(b2);
  return denom === 0 ? 0 : dot / denom;
}

function meanPairwiseCosineSimilarity(texts: string[]): number {
  if (texts.length < 2) return 1;

  const vectors = texts.map((text) => toFreqVector(tokenize(text)));

  let sum = 0;
  let count = 0;

  for (let i = 0; i < vectors.length; i += 1) {
    for (let j = i + 1; j < vectors.length; j += 1) {
      sum += cosineSimilarity(vectors[i]!, vectors[j]!);
      count += 1;
    }
  }

  return count ? sum / count : 0;
}

function verdictSeverity(verdict: Verdict): number {
  switch (verdict) {
    case "fail":
      return 3;
    case "warn":
      return 2;
    case "unknown":
      return 1;
    case "pass":
      return 0;
  }
}

function summarizeConsensus(okRuns: Array<z.infer<typeof SealCandidateSchema>>) {
  if (okRuns.length === 0) {
    return { verdict: "unknown" as const, confidence: 0 };
  }

  const counts = new Map<Verdict, number>();
  for (const run of okRuns) {
    counts.set(run.verdict, (counts.get(run.verdict) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  const candidates = [...counts.entries()]
    .filter(([, c]) => c === maxCount)
    .map(([v]) => v);

  const consensusVerdict =
    candidates.length === 1
      ? candidates[0]!
      : candidates.sort((a, b) => verdictSeverity(b) - verdictSeverity(a))[0]!;

  const matching = okRuns.filter((run) => run.verdict === consensusVerdict);
  const avgConfidence =
    matching.reduce((sum, run) => sum + run.confidence, 0) / Math.max(1, matching.length);

  return { verdict: consensusVerdict, confidence: Math.round(avgConfidence) };
}

function buildSealPrompt(input: { sourceUrl: string; title?: string; excerpt: string }): string {
  const title = input.title?.trim() ? input.title.trim() : "(none)";

  return [
    "You are CortSeal Monitor. Return STRICT JSON only (no markdown).",
    "",
    "Task:",
    "Given the source excerpt, produce a conservative safety/verifiability signal for audiences.",
    "",
    "Schema:",
    '{ "verdict": "pass" | "warn" | "fail" | "unknown", "confidence": 0-100, "summary": "string" }',
    "",
    "Verdict rubric:",
    '- "pass": low-risk content; no obvious harmful misinformation or compliance issues in the excerpt.',
    '- "warn": unclear or potentially risky; makes claims without supporting evidence in the excerpt.',
    '- "fail": clearly harmful/false or policy-violating content in the excerpt.',
    '- "unknown": insufficient context to decide.',
    "",
    "Rules:",
    "- Only use the excerpt below; do not claim to have verified external sources.",
    "- Be conservative when unsure.",
    "",
    `SOURCE_URL: ${input.sourceUrl}`,
    `TITLE: ${title}`,
    "",
    "EXCERPT:",
    input.excerpt,
  ].join("\n");
}

function buildRubricPrompt(input: { sourceUrl: string; excerpt: string; candidateJson: string }): string {
  return [
    "You are a verifier scoring a proposed seal JSON against the excerpt.",
    "Return STRICT JSON only (no markdown).",
    "",
    "Schema:",
    '{ "score": 0-100, "reasons": "string" }',
    "",
    "Scoring guidelines:",
    "- Candidate is valid JSON and matches schema.",
    "- Summary accurately reflects excerpt.",
    "- Verdict is conservative (does not overclaim).",
    "- Confidence matches uncertainty.",
    "",
    `SOURCE_URL: ${input.sourceUrl}`,
    "",
    "EXCERPT:",
    input.excerpt,
    "",
    "CANDIDATE_JSON:",
    input.candidateJson,
  ].join("\n");
}

async function generateSealViaCortensor(input: {
  sourceUrl: string;
  title?: string;
  excerpt: string;
}) {
  const excerpt = truncateText(input.excerpt.trim(), MAX_EXCERPT_CHARS);
  const prompt = buildSealPrompt({ sourceUrl: input.sourceUrl, title: input.title, excerpt });
  const runs: Array<{
    runIndex: number;
    ok: boolean;
    durationMs: number;
    rawText?: string;
    error?: string;
    verdict?: Verdict;
    confidence?: number;
    summary?: string;
    rubricScore?: number;
    rubricReasons?: string;
  }> = [];

  const okParsed: Array<z.infer<typeof SealCandidateSchema> & { rubric: z.infer<typeof RubricSchema> }> =
    [];

  const N = 3;

  for (let runIndex = 0; runIndex < N; runIndex += 1) {
    const startedAt = nowMs();

    try {
      const raw = await cortensorCompletionWithRetry(prompt);
      const durationMs = nowMs() - startedAt;
      const rawText = truncateText(raw, MAX_MODEL_RAW_TEXT_CHARS);

      const parsedJson = tryParseJsonFromText(raw);
      if (!parsedJson) {
        runs.push({
          runIndex,
          ok: false,
          durationMs,
          rawText,
          error: "Unable to parse JSON from model output.",
        });
        continue;
      }

      const candidate = SealCandidateSchema.safeParse(parsedJson);
      if (!candidate.success) {
        const issue = candidate.error.issues[0]?.message ?? "Invalid seal output.";
        runs.push({
          runIndex,
          ok: false,
          durationMs,
          rawText,
          error: issue,
        });
        continue;
      }

      const candidateJson = JSON.stringify(candidate.data);
      const rubricRaw = await cortensorCompletionWithRetry(
        buildRubricPrompt({
          sourceUrl: input.sourceUrl,
          excerpt,
          candidateJson,
        })
      );

      const rubricJson = tryParseJsonFromText(rubricRaw);
      if (!rubricJson) {
        runs.push({
          runIndex,
          ok: false,
          durationMs,
          rawText,
          error: "Unable to parse rubric JSON from model output.",
        });
        continue;
      }

      const rubric = RubricSchema.safeParse(rubricJson);
      if (!rubric.success) {
        const issue = rubric.error.issues[0]?.message ?? "Invalid rubric output.";
        runs.push({
          runIndex,
          ok: false,
          durationMs,
          rawText,
          error: issue,
        });
        continue;
      }

      runs.push({
        runIndex,
        ok: true,
        durationMs,
        rawText,
        verdict: candidate.data.verdict,
        confidence: candidate.data.confidence,
        summary: candidate.data.summary,
        rubricScore: rubric.data.score,
        rubricReasons: rubric.data.reasons,
      });

      okParsed.push({ ...candidate.data, rubric: rubric.data });
    } catch (err) {
      const durationMs = nowMs() - startedAt;
      const message = err instanceof Error ? err.message : "Unknown error";
      runs.push({ runIndex, ok: false, durationMs, error: message });
    }
  }

  const consensus = summarizeConsensus(okParsed);
  const consensusScore = meanPairwiseCosineSimilarity(okParsed.map((run) => run.summary));

  const selected =
    okParsed.length === 0
      ? null
      : [...okParsed].sort((a, b) => b.rubric.score - a.rubric.score)[0]!;

  const finalSummary =
    selected?.summary ??
    "Unable to generate a seal from the provided excerpt (all verifier runs failed).";

  return {
    excerpt,
    verdict: consensus.verdict,
    confidence: consensus.confidence,
    summary: finalSummary,
    evidence: {
      consensusScore,
      runs,
    },
  };
}

async function maybeSendDiscordAlert(args: {
  title: string;
  verdict: Verdict;
  confidence: number;
  sourceUrl: string;
  sealPublicId?: string;
  extra?: string;
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const appUrl = process.env.APP_URL;
  const sealUrl =
    args.sealPublicId && appUrl ? `${normalizeBaseUrl(appUrl)}/seal/${args.sealPublicId}` : null;

  const lines = [
    `**${args.title}**`,
    `Source: ${args.sourceUrl}`,
    `Verdict: **${args.verdict.toUpperCase()}** (${args.confidence}%)`,
    ...(args.extra ? [args.extra] : []),
    ...(sealUrl ? [`Seal: ${sealUrl}`] : []),
  ];

  const res = await fetchWithTimeout(
    webhookUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: lines.join("\n") }),
    },
    10_000
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord webhook failed (HTTP ${res.status}): ${truncateText(body, 300)}`);
  }
}

export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("monitors").withIndex("by_createdAt").order("desc").collect();
  },
});

export const get = queryGeneric({
  args: { id: v.id("monitors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listRuns = queryGeneric({
  args: { monitorId: v.id("monitors"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 25, 200));
    return await ctx.db
      .query("monitorRuns")
      .withIndex("by_monitorId_startedAt", (q) => q.eq("monitorId", args.monitorId))
      .order("desc")
      .take(limit);
  },
});

export const create = mutationGeneric({
  args: {
    name: v.string(),
    kind: v.union(v.literal("rss"), v.literal("router")),
    intervalMinutes: v.number(),
    feedUrl: v.optional(v.string()),
    routerBaseUrl: v.optional(v.string()),
    minMinerCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < MIN_MONITOR_NAME_LEN || name.length > MAX_MONITOR_NAME_LEN) {
      throw new Error(`name must be between ${MIN_MONITOR_NAME_LEN} and ${MAX_MONITOR_NAME_LEN}.`);
    }

    const intervalMinutes = clampInt(args.intervalMinutes, MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES);
    const t = nowMs();

    let feedUrl: string | undefined = undefined;
    let routerBaseUrl: string | undefined = undefined;
    let minMinerCount: number | undefined = undefined;

    if (args.kind === "rss") {
      if (!args.feedUrl) throw new Error("feedUrl is required for rss monitors.");
      feedUrl = assertSafeExternalUrl(args.feedUrl);
    } else if (args.kind === "router") {
      if (args.routerBaseUrl) {
        routerBaseUrl = assertSafeExternalUrl(args.routerBaseUrl);
      }
      minMinerCount = Math.max(0, Math.floor(args.minMinerCount ?? 1));
    } else {
      throw new Error("Unsupported monitor kind.");
    }

    const monitorId = await ctx.db.insert("monitors", {
      name,
      kind: args.kind,
      enabled: true,
      intervalMinutes,
      nextRunAt: t + intervalMinutes * 60_000,
      lockedUntil: t + LOCK_MS,
      feedUrl,
      lastSeenItemId: undefined,
      routerBaseUrl,
      minMinerCount,
      lastHealthOk: undefined,
      lastAlertAt: undefined,
      createdAt: t,
      updatedAt: t,
    });

    await ctx.scheduler.runAfter(0, anyApi.monitors.runMonitor, { monitorId });
    return monitorId;
  },
});

export const toggleEnabled = mutationGeneric({
  args: { id: v.id("monitors"), enabled: v.boolean() },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.id);
    if (!monitor) throw new Error("Monitor not found.");

    const t = nowMs();
    await ctx.db.patch(args.id, {
      enabled: args.enabled,
      nextRunAt: args.enabled ? Math.min(monitor.nextRunAt, t) : monitor.nextRunAt,
      lockedUntil: args.enabled ? Math.min(monitor.lockedUntil ?? t - 1, t - 1) : monitor.lockedUntil,
      updatedAt: t,
    });
  },
});

export const runNow = mutationGeneric({
  args: { id: v.id("monitors") },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.id);
    if (!monitor) throw new Error("Monitor not found.");

    const t = nowMs();
    if (monitor.lockedUntil && monitor.lockedUntil > t) {
      throw new Error("Monitor is currently locked (already running).");
    }

    const nextRunAt = t + monitor.intervalMinutes * 60_000;

    await ctx.db.patch(args.id, {
      lockedUntil: t + LOCK_MS,
      nextRunAt,
      updatedAt: t,
    });

    await ctx.scheduler.runAfter(0, anyApi.monitors.runMonitor, { monitorId: monitor._id });
  },
});

export const tick = internalMutationGeneric({
  args: {},
  handler: async (ctx) => {
    const t = nowMs();

    const due = await ctx.db
      .query("monitors")
      .withIndex("by_enabled_nextRunAt", (q) =>
        (q as any).eq("enabled", true).lte("nextRunAt", t)
      )
      .order("asc")
      .take(MAX_DUE_MONITORS_PER_TICK);

    for (const monitor of due) {
      if (monitor.lockedUntil && monitor.lockedUntil > t) continue;

      const nextRunAt = t + monitor.intervalMinutes * 60_000;

      await ctx.db.patch(monitor._id, {
        lockedUntil: t + LOCK_MS,
        nextRunAt,
        updatedAt: t,
      });

      await ctx.scheduler.runAfter(0, anyApi.monitors.runMonitor, { monitorId: monitor._id });
    }
  },
});

export const _getInternal = internalQueryGeneric({
  args: { monitorId: v.id("monitors") },
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get(args.monitorId);
    if (!monitor) throw new Error("Monitor not found.");
    return monitor;
  },
});

export const _createRun = internalMutationGeneric({
  args: { monitorId: v.id("monitors"), startedAt: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("monitorRuns", {
      monitorId: args.monitorId,
      startedAt: args.startedAt,
      status: "success",
      createdAt: args.startedAt,
    });
  },
});

export const _finishRun = internalMutationGeneric({
  args: {
    runId: v.id("monitorRuns"),
    finishedAt: v.number(),
    durationMs: v.number(),
    status: v.union(v.literal("success"), v.literal("error"), v.literal("skipped")),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
    newItems: v.optional(v.number()),
    createdSeals: v.optional(v.number()),
    routerStatusHttp: v.optional(v.number()),
    minerCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      finishedAt: args.finishedAt,
      durationMs: args.durationMs,
      status: args.status,
      summary: args.summary,
      error: args.error,
      newItems: args.newItems,
      createdSeals: args.createdSeals,
      routerStatusHttp: args.routerStatusHttp,
      minerCount: args.minerCount,
    });
  },
});

export const _updateMonitorAfterRun = internalMutationGeneric({
  args: {
    monitorId: v.id("monitors"),
    unlockAt: v.number(),
    lastSeenItemId: v.optional(v.string()),
    lastHealthOk: v.optional(v.boolean()),
    lastAlertAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      lockedUntil: args.unlockAt - 1,
      updatedAt: args.unlockAt,
    };

    if (args.lastSeenItemId !== undefined) {
      patch.lastSeenItemId = args.lastSeenItemId;
    }
    if (args.lastHealthOk !== undefined) {
      patch.lastHealthOk = args.lastHealthOk;
    }
    if (args.lastAlertAt !== undefined) {
      patch.lastAlertAt = args.lastAlertAt;
    }

    await ctx.db.patch(args.monitorId, patch);
  },
});

export const runMonitor = internalActionGeneric({
  args: { monitorId: v.id("monitors") },
  handler: async (ctx, args) => {
    const startedAt = nowMs();
    const runId = await ctx.runMutation(anyApi.monitors._createRun, {
      monitorId: args.monitorId,
      startedAt,
    });

    const finish = async (params: {
      status: "success" | "error" | "skipped";
      summary?: string;
      error?: string;
      newItems?: number;
      createdSeals?: number;
      routerStatusHttp?: number;
      minerCount?: number;
    }) => {
      const finishedAt = nowMs();
      await ctx.runMutation(anyApi.monitors._finishRun, {
        runId,
        finishedAt,
        durationMs: finishedAt - startedAt,
        status: params.status,
        summary: params.summary,
        error: params.error,
        newItems: params.newItems,
        createdSeals: params.createdSeals,
        routerStatusHttp: params.routerStatusHttp,
        minerCount: params.minerCount,
      });
    };

    try {
      const monitor = await ctx.runQuery(anyApi.monitors._getInternal, {
        monitorId: args.monitorId,
      });

      if (!monitor.enabled) {
        await finish({ status: "skipped", summary: "Skipped (disabled)." });
        await ctx.runMutation(anyApi.monitors._updateMonitorAfterRun, {
          monitorId: args.monitorId,
          unlockAt: nowMs(),
        });
        return;
      }

      if (monitor.kind === "rss") {
        const result = await runRssMonitor(ctx, monitor);
        await finish({
          status: "success",
          summary: result.summary,
          newItems: result.newItems,
          createdSeals: result.createdSeals,
        });
        await ctx.runMutation(anyApi.monitors._updateMonitorAfterRun, {
          monitorId: args.monitorId,
          unlockAt: nowMs(),
          lastSeenItemId: result.lastSeenItemId,
        });
        return;
      }

      if (monitor.kind === "router") {
        const result = await runRouterMonitor(ctx, monitor);
        await finish({
          status: "success",
          summary: result.summary,
          routerStatusHttp: result.routerStatusHttp,
          minerCount: result.minerCount,
        });
        await ctx.runMutation(anyApi.monitors._updateMonitorAfterRun, {
          monitorId: args.monitorId,
          unlockAt: nowMs(),
          lastHealthOk: result.lastHealthOk,
          lastAlertAt: result.lastAlertAt,
        });
        return;
      }

      throw new Error("Unsupported monitor kind.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await finish({ status: "error", error: message });
      await ctx.runMutation(anyApi.monitors._updateMonitorAfterRun, {
        monitorId: args.monitorId,
        unlockAt: nowMs(),
      });
    }
  },
});

async function runRssMonitor(ctx: any, monitor: any) {
  const feedUrl = monitor.feedUrl as string | undefined;
  if (!feedUrl) throw new Error("RSS monitor is missing feedUrl.");

  const xmlRes = await fetchWithTimeout(
    feedUrl,
    {
      method: "GET",
      headers: {
        "User-Agent": "cort-seal-monitor/1.0",
        Accept: "application/rss+xml, application/atom+xml, text/xml, */*",
      },
      redirect: "follow",
    },
    15_000
  );

  if (!xmlRes.ok) {
    const body = await xmlRes.text();
    throw new Error(`Feed fetch failed (HTTP ${xmlRes.status}): ${truncateText(body, 300)}`);
  }

  const xml = await xmlRes.text();
  const parser: Parser<unknown, ParserItem> = new Parser();
  const feed = await parser.parseString(xml);

  const items = (feed.items ?? []) as ParserItem[];
  if (items.length === 0) {
    return { summary: "Feed has no items.", newItems: 0, createdSeals: 0, lastSeenItemId: monitor.lastSeenItemId };
  }

  const latestId = getFeedItemId(items[0]) ?? monitor.lastSeenItemId ?? null;
  const lastSeen = monitor.lastSeenItemId as string | undefined;

  const newItems: ParserItem[] = [];
  for (const item of items) {
    const id = getFeedItemId(item);
    if (!id) continue;
    if (lastSeen && id === lastSeen) break;
    newItems.push(item);
    if (newItems.length >= MAX_ITEMS_PER_RUN) break;
  }

  if (!lastSeen) {
    newItems.splice(1);
  }

  let createdSeals = 0;
  for (const item of newItems) {
    const feedItemId = getFeedItemId(item);
    if (!feedItemId) continue;

    const title = item.title?.trim();
    const link = item.link?.trim();
    const sourceUrl = link ? assertSafeExternalUrl(link) : feedUrl;

    const excerptRaw = item.contentSnippet ?? item.content ?? title ?? "";
    const excerptBase = excerptRaw.includes("<") ? stripHtml(excerptRaw) : excerptRaw;
    const excerpt = truncateText(excerptBase.trim() || title || "No excerpt available.", MAX_EXCERPT_CHARS);

    const seal = await generateSealViaCortensor({ sourceUrl, title, excerpt });

    const sealPublicId = await ctx.runMutation(anyApi.seals._upsertFromMonitor, {
      monitorId: monitor._id,
      feedItemId,
      sourceUrl,
      sourceTitle: title,
      sourcePublishedAt: parseDateMs(item.isoDate ?? item.pubDate),
      sourceExcerpt: seal.excerpt,
      verdict: seal.verdict,
      confidence: seal.confidence,
      summary: seal.summary,
      evidence: seal.evidence,
      createdAt: nowMs(),
    });

    createdSeals += 1;

    await maybeSendDiscordAlert({
      title: title ?? "New feed item",
      verdict: seal.verdict,
      confidence: seal.confidence,
      sourceUrl,
      sealPublicId: String(sealPublicId),
    });
  }

  return {
    summary: `Processed ${newItems.length} new item(s), created ${createdSeals} seal(s).`,
    newItems: newItems.length,
    createdSeals,
    lastSeenItemId: latestId ?? monitor.lastSeenItemId,
  };
}

async function runRouterMonitor(ctx: any, monitor: any) {
  const baseUrl = monitor.routerBaseUrl ?? process.env.CORTENSOR_ROUTER_URL;
  const apiKey = process.env.CORTENSOR_API_KEY;

  if (!baseUrl) throw new Error("Missing router base URL (routerBaseUrl or CORTENSOR_ROUTER_URL).");
  if (!apiKey) throw new Error("Missing CORTENSOR_API_KEY in Convex env.");

  const base = normalizeBaseUrl(String(baseUrl));
  const statusUrl = `${base}/api/v1/status`;
  const minersUrl = `${base}/api/v1/miners`;

  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };

  const [statusRes, minersRes] = await Promise.all([
    fetchWithTimeout(statusUrl, { method: "GET", headers }, 10_000),
    fetchWithTimeout(minersUrl, { method: "GET", headers }, 10_000),
  ]);

  let minerCount: number | undefined = undefined;
  if (minersRes.ok) {
    const data = await minersRes.json();
    if (Array.isArray(data)) minerCount = data.length;
    else if (Array.isArray((data as any)?.miners)) minerCount = (data as any).miners.length;
  }

  const minMinerCount = Math.max(0, Math.floor(monitor.minMinerCount ?? 1));
  const ok = statusRes.ok && (minerCount === undefined || minerCount >= minMinerCount);

  const summary = ok
    ? `Router OK (status ${statusRes.status}, miners ${minerCount ?? "?"}).`
    : `Router ALERT (status ${statusRes.status}, miners ${minerCount ?? "?"}, threshold ${minMinerCount}).`;

  const lastHealthOk = ok;
  let lastAlertAt: number | undefined = monitor.lastAlertAt as number | undefined;
  const previousHealthOk = monitor.lastHealthOk as boolean | undefined;

  const shouldAlert =
    !ok &&
    (previousHealthOk !== false ||
      lastAlertAt === undefined ||
      nowMs() - lastAlertAt > ROUTER_ALERT_COOLDOWN_MS);

  if (shouldAlert) {
    await maybeSendDiscordAlert({
      title: "Cortensor Router Health Alert",
      verdict: "warn",
      confidence: 90,
      sourceUrl: statusUrl,
      extra: summary,
    });

    lastAlertAt = nowMs();
  }

  return {
    summary,
    routerStatusHttp: statusRes.status,
    minerCount,
    lastHealthOk,
    lastAlertAt,
  };
}
