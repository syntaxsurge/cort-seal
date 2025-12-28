import Link from "next/link";
import { notFound } from "next/navigation";
import type { GenericId } from "convex/values";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { RequireWallet } from "@/components/auth/RequireWallet";
import { AnalysisResultCards } from "@/features/cortseal/components/AnalysisResultCards";
import { getAnalysisById } from "@/features/cortseal/services/analyses";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TryResultsPage({ params }: PageProps) {
  const { id } = await params;
  const analysisId = id as GenericId<"analyses">;

  let analysisResult: Awaited<ReturnType<typeof getAnalysisById>>;

  try {
    analysisResult = await getAnalysisById(analysisId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <RequireWallet>
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">
            Unable to load results
          </h1>
          <p className="mt-2 text-muted-foreground">
            Fix your environment configuration and try again.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-6">
            {message}
          </pre>
          <div className="mt-6">
            <Button asChild variant="secondary">
              <Link href="/try">Back to Try</Link>
            </Button>
          </div>
        </div>
      </RequireWallet>
    );
  }

  if (!analysisResult) notFound();
  const analysis = analysisResult;
  const createdAtLabel = new Date(analysis.createdAt).toLocaleString();

  return (
    <RequireWallet>
      <div className="mx-auto w-full max-w-6xl px-6 py-12 space-y-8">
        <PageHeader
          eyebrow={
            <>
              <Link href="/" className="underline underline-offset-4">
                CortSeal
              </Link>{" "}
              /{" "}
              <Link href="/try" className="underline underline-offset-4">
                Try
              </Link>{" "}
              / Results
            </>
          }
          title="Results"
          description="Claim checks with agreement, dispersion, and rubric scoring."
          meta={
            <>
              Status: <span className="font-medium text-foreground">{analysis.status}</span> ·
              Duration:{" "}
              <span className="font-medium text-foreground">
                {Math.round(analysis.durationMs)}ms
              </span>{" "}
              · Created: <span className="font-medium text-foreground">{createdAtLabel}</span> ·
              Session: <span className="font-medium text-foreground">{analysis.sessionId}</span>
            </>
          }
          actions={
            <Button asChild variant="secondary">
              <Link href="/try">New run</Link>
            </Button>
          }
        />

        <AnalysisResultCards analysisId={id} analysis={analysis} variant="try" />
      </div>
    </RequireWallet>
  );
}
