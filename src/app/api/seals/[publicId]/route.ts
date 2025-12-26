import { z } from "zod";

import { getSealByPublicId } from "@/features/cortseal/services/seals";

const publicIdSchema = z.string().trim().min(12).max(64);

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params;
  const parsedId = publicIdSchema.safeParse(publicId);
  if (!parsedId.success) return Response.json({ error: "Invalid seal id." }, { status: 400 });

  const seal = await getSealByPublicId(parsedId.data);
  if (!seal) {
    return Response.json({ error: "Seal not found." }, { status: 404 });
  }

  const json = JSON.stringify(seal, null, 2);

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"cortseal-seal-${seal.publicId}.json\"`,
      "Cache-Control": "no-store",
    },
  });
}
