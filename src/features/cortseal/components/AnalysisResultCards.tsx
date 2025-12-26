import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cortsealClaimCheckResultSchema,
  cortsealSourceAuditResultSchema,
} from "@/features/cortseal/schemas";
import type { AnalysisDoc } from "@/features/cortseal/services/analyses";
import { VerdictPill } from "@/features/cortseal/components/VerdictPill";
import { ProofActions } from "@/features/cortseal/components/ProofActions";

type AnalysisResultCardsProps = {
  analysisId: string;
  analysis: AnalysisDoc;
  evidenceHref?: string;
  variant: "try" | "share";
};

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value: number): string {
  const clamped = clamp(value, 0, 1);
  return `${Math.round(clamped * 100)}%`;
}

function formatConfidence(value: number): string {
  const clamped = clamp(value, 0, 1);
  return clamped.toFixed(2);
}

function formatScore(value: number): string {
  const clamped = clamp(value, 0, 100);
  return `${Math.round(clamped)}`;
}

function formatScore10(value: number): string {
  const clamped = clamp(value, 0, 10);
  return clamped.toFixed(1);
}

function formatCosine(value: number): string {
  const clamped = clamp(value, 0, 1);
  return clamped.toFixed(2);
}

export function AnalysisResultCards({
  analysisId,
  analysis,
  evidenceHref,
  variant,
}: AnalysisResultCardsProps) {
  const parsedClaimCheck =
    analysis.status === "completed"
      ? cortsealClaimCheckResultSchema.safeParse(analysis.result)
      : null;

  const parsedSourceAudit =
    analysis.status === "completed"
      ? cortsealSourceAuditResultSchema.safeParse(analysis.result)
      : null;

  const resolvedEvidenceHref = evidenceHref ?? `/api/analyses/${analysisId}/evidence`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap break-words text-sm leading-6">
            {analysis.prompt}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Output</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <a href={resolvedEvidenceHref}>Download evidence</a>
              </Button>
              {variant === "try" && analysis.status === "completed" ? (
                <ProofActions analysisId={analysisId} />
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analysis.status === "error" ? (
            <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-destructive">
              {analysis.error ?? "Unknown error"}
            </pre>
          ) : parsedClaimCheck?.success ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Claims extracted</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {parsedClaimCheck.data.summary.claimCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Verifier runs (ok)</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {parsedClaimCheck.data.summary.okRunCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Avg dispersion (PoI)</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatPercent(parsedClaimCheck.data.summary.avgDispersion)}
                  </p>
                </div>
              </div>

              {parsedClaimCheck.data.rubric ? (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Rubric score (PoUW)</p>
                    <p className="text-xs text-muted-foreground">
                      {parsedClaimCheck.data.rubric.summary.okRuns}/
                      {parsedClaimCheck.data.rubric.config.runs} runs ok · Dispersion{" "}
                      {formatPercent(parsedClaimCheck.data.rubric.summary.dispersion)}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Overall</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(parsedClaimCheck.data.rubric.summary.meanScores.overall)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Factuality</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(parsedClaimCheck.data.rubric.summary.meanScores.factuality)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Compliance</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(parsedClaimCheck.data.rubric.summary.meanScores.compliance)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Brand safety</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(parsedClaimCheck.data.rubric.summary.meanScores.brandSafety)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Clarity</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(parsedClaimCheck.data.rubric.summary.meanScores.clarity)}
                      </p>
                    </div>
                  </div>

                  {parsedClaimCheck.data.rubric.summary.selected ? (
                    <div className="space-y-4">
                      <div className="rounded-md border bg-muted/20 p-4">
                        <p className="text-xs font-medium text-muted-foreground">Summary</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                          {parsedClaimCheck.data.rubric.summary.selected.summary}
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-md border p-4">
                          <p className="text-sm font-medium">Issues</p>
                          {parsedClaimCheck.data.rubric.summary.selected.issues.length === 0 ? (
                            <p className="mt-2 text-sm text-muted-foreground">None flagged.</p>
                          ) : (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                              {parsedClaimCheck.data.rubric.summary.selected.issues.map(
                                (issue) => (
                                  <li key={issue}>{issue}</li>
                                )
                              )}
                            </ul>
                          )}
                        </div>

                        <div className="rounded-md border p-4">
                          <p className="text-sm font-medium">Recommendations</p>
                          {parsedClaimCheck.data.rubric.summary.selected.recommendations.length ===
                          0 ? (
                            <p className="mt-2 text-sm text-muted-foreground">No suggestions.</p>
                          ) : (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                              {parsedClaimCheck.data.rubric.summary.selected.recommendations.map(
                                (rec) => (
                                  <li key={rec}>{rec}</li>
                                )
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No rubric output available for this run.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                  <p className="text-sm font-medium">Claim verdicts</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedClaimCheck.data.config.runsPerClaim} runs/claim · Concurrency{" "}
                    {parsedClaimCheck.data.config.verifierConcurrency}
                  </p>
                </div>

                {parsedClaimCheck.data.verification.claims.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No verifiable claims found in this draft.
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="w-full px-4 py-2 font-medium">
                            Claim
                          </th>
                          <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">
                            Consensus
                          </th>
                          <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">
                            Confidence
                          </th>
                          <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">
                            Dispersion
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedClaimCheck.data.verification.claims.map((claim) => (
                          <tr key={claim.claim}>
                            <td className="px-4 py-3 align-top">
                              <p className="whitespace-pre-wrap leading-6">{claim.claim}</p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Votes · Supported: {claim.summary.verdictCounts.supported},{" "}
                                Unsupported: {claim.summary.verdictCounts.unsupported},{" "}
                                Unclear: {claim.summary.verdictCounts.unclear}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              <VerdictPill verdict={claim.summary.consensusVerdict} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              {formatConfidence(claim.summary.consensusConfidence)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              {formatPercent(claim.summary.dispersion)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : parsedSourceAudit?.success ? (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="mt-1 text-sm font-medium">{parsedSourceAudit.data.source.title}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {parsedSourceAudit.data.source.url}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Fetched:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(parsedSourceAudit.data.source.fetchedAt).toLocaleString()}
                  </span>{" "}
                  · Text SHA-256:{" "}
                  <span className="font-mono text-[11px] text-foreground">
                    {parsedSourceAudit.data.source.textSha256}
                  </span>
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Claims extracted</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {parsedSourceAudit.data.summary.claimCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Verifier runs (ok)</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {parsedSourceAudit.data.summary.okRunCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Avg dispersion (PoI)</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatPercent(parsedSourceAudit.data.summary.avgDispersion)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Avg rationale cosine</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatCosine(parsedSourceAudit.data.summary.avgMeanRationaleCosine)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Avg score (0–10)</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatScore10(parsedSourceAudit.data.summary.averageScore)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Divergent claims</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {parsedSourceAudit.data.summary.divergentClaimCount}
                  </p>
                </div>
              </div>

              {parsedSourceAudit.data.rubric ? (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Rubric score (PoUW)</p>
                    <p className="text-xs text-muted-foreground">
                      {parsedSourceAudit.data.rubric.summary.okRuns}/
                      {parsedSourceAudit.data.rubric.config.runs} runs ok · Dispersion{" "}
                      {formatPercent(parsedSourceAudit.data.rubric.summary.dispersion)}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Overall</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(parsedSourceAudit.data.rubric.summary.meanScores.overall)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Factuality</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(
                          parsedSourceAudit.data.rubric.summary.meanScores.factuality
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Compliance</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(
                          parsedSourceAudit.data.rubric.summary.meanScores.compliance
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Brand safety</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(
                          parsedSourceAudit.data.rubric.summary.meanScores.brandSafety
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Clarity</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatScore(parsedSourceAudit.data.rubric.summary.meanScores.clarity)}
                      </p>
                    </div>
                  </div>

                  {parsedSourceAudit.data.rubric.summary.selected ? (
                    <div className="space-y-4">
                      <div className="rounded-md border p-4">
                        <p className="text-sm font-medium">Summary</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {parsedSourceAudit.data.rubric.summary.selected.summary}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-md border p-4">
                          <p className="text-sm font-medium">Issues</p>
                          {parsedSourceAudit.data.rubric.summary.selected.issues.length === 0 ? (
                            <p className="mt-2 text-sm text-muted-foreground">No issues.</p>
                          ) : (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                              {parsedSourceAudit.data.rubric.summary.selected.issues.map(
                                (issue) => (
                                  <li key={issue}>{issue}</li>
                                )
                              )}
                            </ul>
                          )}
                        </div>

                        <div className="rounded-md border p-4">
                          <p className="text-sm font-medium">Recommendations</p>
                          {parsedSourceAudit.data.rubric.summary.selected.recommendations.length ===
                          0 ? (
                            <p className="mt-2 text-sm text-muted-foreground">No suggestions.</p>
                          ) : (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                              {parsedSourceAudit.data.rubric.summary.selected.recommendations.map(
                                (rec) => (
                                  <li key={rec}>{rec}</li>
                                )
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No rubric output available for this run.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                  <p className="text-sm font-medium">Claim validations</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedSourceAudit.data.config.runsPerClaim} runs/claim · Concurrency{" "}
                    {parsedSourceAudit.data.config.verifierConcurrency}
                  </p>
                </div>

                {parsedSourceAudit.data.verification.claims.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No verifiable claims found in this source.
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="w-full px-4 py-2 font-medium">
                            Claim
                          </th>
                          <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">
                            Consensus
                          </th>
                          <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">
                            Confidence
                          </th>
                          <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">
                            Dispersion
                          </th>
                          <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">
                            Cosine
                          </th>
                          <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">
                            Score
                          </th>
                          <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedSourceAudit.data.verification.claims.map((claim) => (
                          <tr key={claim.claim}>
                            <td className="px-4 py-3 align-top">
                              <p className="whitespace-pre-wrap leading-6">{claim.claim}</p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Quote: “{claim.quote}”
                              </p>
                              {claim.summary.divergent ? (
                                <p className="mt-2 text-xs font-medium text-amber-700">
                                  Divergent (low similarity or high disagreement)
                                </p>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              <VerdictPill verdict={claim.summary.consensusVerdict} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              {formatConfidence(claim.summary.consensusConfidence)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              {formatPercent(claim.summary.dispersion)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              {formatCosine(claim.summary.meanRationaleCosine)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              {formatScore10(claim.summary.averageScore)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top">
                              <details className="max-w-[520px]">
                                <summary className="cursor-pointer text-xs font-medium text-muted-foreground underline underline-offset-4">
                                  View runs
                                </summary>
                                <div className="mt-3 space-y-3">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                      Excerpt
                                    </p>
                                    <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs leading-5">
                                      {claim.excerpt}
                                    </pre>
                                  </div>

                                  <div className="space-y-3">
                                    {claim.runs.map((run) => (
                                      <div
                                        key={run.runIndex}
                                        className="rounded-md border bg-background p-3"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className="text-xs font-medium">
                                            Run {run.runIndex + 1} ·{" "}
                                            {run.ok && run.parsed ? (
                                              <VerdictPill verdict={run.parsed.verdict} />
                                            ) : (
                                              <span className="text-destructive">Error</span>
                                            )}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {Math.round(run.durationMs)}ms
                                          </p>
                                        </div>

                                        {run.ok && run.parsed ? (
                                          <div className="mt-2 space-y-2">
                                            <p className="text-xs text-muted-foreground">
                                              Confidence:{" "}
                                              <span className="font-medium text-foreground">
                                                {formatConfidence(run.parsed.confidence)}
                                              </span>{" "}
                                              · Score:{" "}
                                              <span className="font-medium text-foreground">
                                                {formatScore10(
                                                  run.parsed.score ??
                                                    run.parsed.confidence * 10
                                                )}
                                              </span>
                                            </p>

                                            <p className="text-sm leading-6">{run.parsed.rationale}</p>

                                            {Array.isArray(run.parsed.evidence) &&
                                            run.parsed.evidence.length > 0 ? (
                                              <div>
                                                <p className="text-xs font-medium text-muted-foreground">
                                                  Evidence
                                                </p>
                                                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                                                  {run.parsed.evidence.map((quote, index) => (
                                                    <li key={`${index}-${quote}`}>“{quote}”</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <div className="mt-2 space-y-2">
                                            <p className="text-sm text-destructive">
                                              {run.error ?? "Unknown error"}
                                            </p>
                                            {run.rawText ? (
                                              <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs leading-5">
                                                {run.rawText}
                                              </pre>
                                            ) : null}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm leading-6">
              {formatJson(analysis.result)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
