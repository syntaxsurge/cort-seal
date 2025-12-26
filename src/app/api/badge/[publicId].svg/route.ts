import { z } from "zod";

import { getSealByPublicId } from "@/features/cortseal/services/seals";

export const runtime = "nodejs";

const publicIdSchema = z.string().trim().min(12).max(64);

function verdictLabel(verdict: string): string {
  return verdict.toUpperCase();
}

function verdictColor(verdict: string): { fg: string; bg: string } {
  switch (verdict) {
    case "pass":
      return { fg: "#065F46", bg: "#D1FAE5" };
    case "warn":
      return { fg: "#92400E", bg: "#FEF3C7" };
    case "fail":
      return { fg: "#991B1B", bg: "#FEE2E2" };
    default:
      return { fg: "#374151", bg: "#E5E7EB" };
  }
}

function badgeSvg(args: { verdict: string; confidence: number; sealUrl: string }) {
  const label = verdictLabel(args.verdict);
  const pct = Math.round(args.confidence);
  const colors = verdictColor(args.verdict);

  const leftWidth = 92;
  const rightWidth = 168;
  const height = 36;
  const totalWidth = leftWidth + rightWidth;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="CortSeal ${label}">
  <title>CortSeal ${label}</title>
  <a href="${args.sealUrl}" target="_blank" rel="noreferrer">
    <rect width="${totalWidth}" height="${height}" rx="10" ry="10" fill="#111827"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="${height}" rx="10" ry="10" fill="${colors.bg}"/>
    <path d="M${leftWidth} 0h10v${height}h-10z" fill="${colors.bg}"/>
    <text x="16" y="23" font-family="ui-sans-serif, system-ui, -apple-system" font-size="13" fill="#F9FAFB">CortSeal</text>
    <text x="${leftWidth + 14}" y="23" font-family="ui-sans-serif, system-ui, -apple-system" font-size="13" fill="${colors.fg}">${label}</text>
    <text x="${totalWidth - 44}" y="23" font-family="ui-sans-serif, system-ui, -apple-system" font-size="13" fill="${colors.fg}">${pct}%</text>
  </a>
</svg>`;
}

export async function GET(
  request: Request,
  context: { params: Promise<unknown> }
) {
  const params = await context.params;
  const parsedParams = z.object({ publicId: publicIdSchema }).safeParse(params);

  if (!parsedParams.success) {
    return new Response("Invalid seal id.", { status: 400 });
  }

  const { publicId } = parsedParams.data;
  const seal = await getSealByPublicId(publicId);
  if (!seal) {
    return new Response("Not found", { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const sealUrl = `${origin}/seal/${seal.publicId}`;
  const svg = badgeSvg({ verdict: seal.verdict, confidence: seal.confidence, sealUrl });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
