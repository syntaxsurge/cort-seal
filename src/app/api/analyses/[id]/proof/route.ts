import type { GenericId } from "convex/values";
import { z } from "zod";

import { createProofForAnalysis, proofSharePath } from "@/features/cortseal/services/proofs";

const idSchema = z.string().trim().min(1).max(128);

function formatUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return Response.json({ error: "Invalid analysis id." }, { status: 400 });
  }

  const analysisId = parsedId.data as GenericId<"analyses">;

  try {
    const proof = await createProofForAnalysis({ analysisId });

    return Response.json(
      {
        publicId: proof.publicId,
        shareUrl: proofSharePath(proof.publicId),
        evidenceUrl: `/api/proofs/${proof.publicId}`,
        bundleHashSha256: proof.bundleHashSha256,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = formatUnknownError(err);
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
