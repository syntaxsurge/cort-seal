import Link from "next/link";
import { notFound } from "next/navigation";
import type { GenericId } from "convex/values";

import { Button } from "@/components/ui/button";
import { AnalysisResultCards } from "@/features/cortseal/components/AnalysisResultCards";
import { getAnalysisById } from "@/features/cortseal/services/analyses";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AuditResultsPage({ params }: PageProps) {
  const { id } = await params;
  const analysisId = id as GenericId<"analyses">;

  let analysisResult: Awaited<ReturnType<typeof getAnalysisById>>;

  try {
    analysisResult = await getAnalysisById(analysisId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Unable to load results</h1>
        <p className="mt-2 text-muted-foreground">
          Fix your environment configuration and try again.
        </p>
        <pre className="mt-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-6">
          {message}
        </pre>
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link href="/audit">Back to Audit</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!analysisResult) notFound();
  const analysis = analysisResult;
  const createdAtLabel = new Date(analysis.createdAt).toLocaleString();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="underline underline-offset-4">
              CortSeal
            </Link>{" "}
            /{" "}
            <Link href="/audit" className="underline underline-offset-4">
              Audit
            </Link>{" "}
            / Results
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Results</h1>
          <p className="text-muted-foreground">
            Status: <span className="font-medium text-foreground">{analysis.status}</span> ·
            Duration:{" "}
            <span className="font-medium text-foreground">
              {Math.round(analysis.durationMs)}ms
            </span>{" "}
            · Created: <span className="font-medium text-foreground">{createdAtLabel}</span> ·
            Session: <span className="font-medium text-foreground">{analysis.sessionId}</span>
          </p>
        </div>

        <Button asChild variant="secondary">
          <Link href="/audit">New audit</Link>
        </Button>
      </div>

      <AnalysisResultCards analysisId={id} analysis={analysis} variant="try" />
    </div>
  );
}

