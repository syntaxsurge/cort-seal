import { z } from "zod";
import { anyApi } from "convex/server";

import { CortensorHttpError } from "@/lib/cortensor/types";
import { getConvexHttpClient } from "@/lib/db/convex/httpClient";
import { getServerEnv } from "@/lib/env/server";
import { fetchReadableText } from "@/lib/fetchers/readableText";
import { assertSafeRemoteUrl } from "@/lib/security/safeUrl";
import { validateClaimAgainstSource } from "@/features/cortseal/services/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  url: z.string().trim().url(),
  claim: z.string().trim().min(8).max(600),
  runs: z.coerce.number().int().min(2).max(5).default(3),
  ownerAddress: z.string().optional(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function formatUnknownError(err: unknown): string {
  if (err instanceof CortensorHttpError) {
    const bodyPreview = err.body.length > 1000 ? `${err.body.slice(0, 1000)}…` : err.body;
    return `Cortensor request failed (HTTP ${err.status}): ${bodyPreview}`;
  }

  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function clampText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function ensureMinSummary(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (trimmed.length >= 10) return clampText(trimmed, 800);

  const fallbackTrimmed = fallback.trim();
  if (fallbackTrimmed.length >= 10) return clampText(fallbackTrimmed, 800);

  return "Verifier returned an insufficient summary.";
}

function mapClaimVerdictToSealVerdict(verdict: "supported" | "unsupported" | "unclear") {
  if (verdict === "supported") return "pass" as const;
  if (verdict === "unsupported") return "fail" as const;
  return "warn" as const;
}

function buildRunReasons(args: { rationale: string; evidence: string[] }): string {
  const quotes = args.evidence
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 5);

  const parts: string[] = [];
  if (quotes.length > 0) {
    parts.push("Evidence:");
    for (const q of quotes) parts.push(`- "${q}"`);
    parts.push("");
  }

  parts.push("Rationale:");
  parts.push(args.rationale.trim());

  return clampText(parts.join("\n").trim(), 1600);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  let env: ReturnType<typeof getServerEnv>;

  try {
    env = getServerEnv();
  } catch (err) {
    return Response.json({ error: formatUnknownError(err) }, { status: 500, headers: corsHeaders });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body.";
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }

  try {
    const convex = getConvexHttpClient();
    const ip = getClientIp(req);
    const ingestToken = env.CORTSEAL_INGEST_TOKEN;

    if (!ingestToken) {
      return Response.json(
        {
          error:
            "CORTSEAL_INGEST_TOKEN is missing. Set it in your Next.js env and in Convex env vars to enable seal creation.",
        },
        { status: 500, headers: { ...corsHeaders, "Cache-Control": "no-store" } }
      );
    }

    const rate = await convex.mutation(anyApi.rateLimit.consume, {
      key: `validate:${ip}`,
      limit: 20,
      windowSeconds: 60,
    });

    if (!rate.allowed) {
      return Response.json(
        { error: "rate_limited", resetAt: rate.resetAt },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Cache-Control": "no-store",
            "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
          },
        }
      );
    }

    const safeUrl = await assertSafeRemoteUrl(body.url);
    const fetchedAt = Date.now();
    const doc = await fetchReadableText(safeUrl);

    const result = await validateClaimAgainstSource({
      sourceUrl: doc.finalUrl,
      title: doc.title,
      text: doc.text,
      fetchedAt,
      claim: body.claim,
      runs: body.runs,
      concurrency: env.CORTSEAL_VERIFIER_CONCURRENCY,
    });

    const okRuns = result.runs.filter((run) => run.ok && run.parsed);
    const consensusVerdict = result.summary.consensusVerdict;

    const selected =
      okRuns.length === 0
        ? null
        : [...okRuns]
            .filter((run) => run.parsed!.verdict === consensusVerdict)
            .sort((a, b) => {
              const scoreA = a.parsed!.score ?? a.parsed!.confidence * 10;
              const scoreB = b.parsed!.score ?? b.parsed!.confidence * 10;
              return scoreB - scoreA;
            })[0] ?? okRuns[0]!;

    const sealVerdict =
      okRuns.length === 0
        ? ("unknown" as const)
        : result.summary.divergent && consensusVerdict === "supported"
          ? ("warn" as const)
          : mapClaimVerdictToSealVerdict(consensusVerdict);

    const sealConfidence = Math.round(result.summary.consensusConfidence * 100);
    const sealSummary = ensureMinSummary(
      selected?.parsed?.rationale ?? "",
      `Consensus: ${sealVerdict.toUpperCase()} (${sealConfidence}%).`
    );

    const sealRuns = result.runs.map((run) => {
      if (!run.ok || !run.parsed) {
        return {
          runIndex: run.runIndex,
          ok: false,
          durationMs: run.durationMs,
          rawText: run.rawText,
          error: run.error ?? "Unknown error",
        };
      }

      const verdict = mapClaimVerdictToSealVerdict(run.parsed.verdict);
      const confidence = Math.round(run.parsed.confidence * 100);
      const score = run.parsed.score ?? run.parsed.confidence * 10;

      return {
        runIndex: run.runIndex,
        ok: true,
        durationMs: run.durationMs,
        rawText: run.rawText,
        verdict,
        confidence,
        summary: ensureMinSummary(run.parsed.rationale, `Verdict: ${verdict.toUpperCase()} (${confidence}%).`),
        rubricScore: Math.round(score * 10),
        rubricReasons: buildRunReasons({
          rationale: run.parsed.rationale,
          evidence: run.parsed.evidence ?? [],
        }),
      };
    });

    const createdAt = result.createdAt;

    const seal = await convex.mutation(anyApi.seals.ingestFromApi, {
      token: ingestToken,
      ownerAddress: body.ownerAddress,
      claim: body.claim,
      sourceUrl: doc.finalUrl,
      sourceTitle: doc.title,
      sourceExcerpt: result.excerpt,
      verdict: sealVerdict,
      confidence: sealConfidence,
      summary: sealSummary,
      evidence: {
        consensusScore: result.summary.meanRationaleCosine,
        runs: sealRuns,
      },
      createdAt,
    });

    const href = `/seal/${seal.publicId}`;
    const origin = new URL(req.url).origin;

    return Response.json(
      {
        ...result,
        seal: {
          publicId: seal.publicId,
          href,
          url: `${origin}${href}`,
          downloadHref: `/api/seals/${seal.publicId}`,
          badgeHref: `/api/badge/${seal.publicId}.svg`,
          embedHref: `/embed/${seal.publicId}`,
        },
        rateLimit: { remaining: rate.remaining, resetAt: rate.resetAt },
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    return Response.json(
      { error: formatUnknownError(err) },
      { status: 400, headers: { ...corsHeaders, "Cache-Control": "no-store" } }
    );
  }
}
