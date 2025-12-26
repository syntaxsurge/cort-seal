import type { GenericId } from "convex/values";
import { z } from "zod";

import { getAnalysisById } from "@/features/cortseal/services/analyses";
import { buildEvidenceBundle } from "@/features/cortseal/services/evidence";

const idSchema = z.string().trim().min(1).max(128);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return Response.json({ error: "Invalid analysis id." }, { status: 400 });
  }

  const analysisId = parsedId.data as GenericId<"analyses">;
  const analysis = await getAnalysisById(analysisId);
  if (!analysis) {
    return Response.json({ error: "Analysis not found." }, { status: 404 });
  }

  const bundle = buildEvidenceBundle({ analysisId: parsedId.data, analysis });
  const body = JSON.stringify(bundle, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"cortseal-evidence-${parsedId.data}.json\"`,
      "Cache-Control": "no-store",
    },
  });
}
