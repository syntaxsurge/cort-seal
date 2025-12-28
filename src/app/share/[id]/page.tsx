import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { AnalysisResultCards } from "@/features/cortseal/components/AnalysisResultCards";
import type { AnalysisDoc } from "@/features/cortseal/services/analyses";
import { getProofByPublicId, cortsealProofBundleSchema } from "@/features/cortseal/services/proofs";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  let proofResult: Awaited<ReturnType<typeof getProofByPublicId>>;

  try {
    proofResult = await getProofByPublicId(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Unable to load proof</h1>
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
    );
  }

  if (!proofResult) notFound();

  const parsedBundle = cortsealProofBundleSchema.safeParse(JSON.parse(proofResult.bundleJson));
  if (!parsedBundle.success) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Invalid proof bundle</h1>
        <p className="mt-2 text-muted-foreground">
          The stored proof bundle JSON did not match the expected schema.
        </p>
        <pre className="mt-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-6">
          {proofResult.bundleJson}
        </pre>
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link href="/try">Back to Try</Link>
          </Button>
        </div>
      </div>
    );
  }

  const bundle = parsedBundle.data.evidence;
  const deterministicChecks = parsedBundle.data.deterministicChecks;
  const analysis: AnalysisDoc = {
    prompt: bundle.prompt,
    status: bundle.status,
    result: bundle.result,
    error: bundle.error,
    createdAt: bundle.createdAt,
    durationMs: bundle.durationMs,
    sessionId: bundle.sessionId,
  };

  const createdAtLabel = new Date(proofResult.createdAt).toLocaleString();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 space-y-8">
      <PageHeader
        eyebrow={
          <>
            <Link href="/" className="underline underline-offset-4">
              CortSeal
            </Link>{" "}
            / Share
          </>
        }
        title="Shareable proof"
        description="Immutable proof bundle with deterministic checks and evidence snapshot."
        meta={
          <>
            Proof ID: <span className="font-medium text-foreground">{proofResult.publicId}</span> ·
            Created: <span className="font-medium text-foreground">{createdAtLabel}</span> · Hash:{" "}
            <span className="font-medium text-foreground">
              {proofResult.bundleHashSha256}
            </span>
          </>
        }
        actions={
          <Button asChild variant="secondary">
            <Link href="/try">Try CortSeal</Link>
          </Button>
        }
      />

      {deterministicChecks.length > 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/70 p-5 text-sm">
          <p className="font-medium">Deterministic checks</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            {deterministicChecks.map((check) => (
              <li key={check.id} className="flex flex-wrap items-start gap-2">
                <span className={check.passed ? "text-emerald-700" : "text-rose-700"}>
                  {check.passed ? "Passed" : "Failed"}
                </span>
                <span className="flex-1">
                  {check.description}
                  {check.detail ? (
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      {check.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AnalysisResultCards
        analysisId={String(proofResult.analysisId)}
        analysis={analysis}
        evidenceHref={`/api/proofs/${proofResult.publicId}`}
        variant="share"
      />
    </div>
  );
}
