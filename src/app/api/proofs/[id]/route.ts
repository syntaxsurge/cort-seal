import { z } from "zod";

import { getProofByPublicId } from "@/features/cortseal/services/proofs";

const idSchema = z.string().trim().min(8).max(64);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return Response.json({ error: "Invalid proof id." }, { status: 400 });
  }

  const proof = await getProofByPublicId(parsedId.data);
  if (!proof) {
    return Response.json({ error: "Proof not found." }, { status: 404 });
  }

  return new Response(proof.bundleJson, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"cortseal-proof-${proof.publicId}.json\"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${proof.bundleHashSha256}"`,
    },
  });
}

