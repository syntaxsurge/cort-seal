import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSealByPublicId } from "@/features/cortseal/services/seals"

type PageProps = {
  params: Promise<{ publicId: string }>
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString()
}

export default async function SealPage({ params }: PageProps) {
  const { publicId } = await params

  let seal: Awaited<ReturnType<typeof getSealByPublicId>>

  try {
    seal = await getSealByPublicId(publicId)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">
          Unable to load seal
        </h1>
        <p className="mt-2 text-muted-foreground">
          Fix your environment configuration and try again.
        </p>
        <pre className="mt-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-6">
          {message}
        </pre>
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link href="/monitors">Back to Monitors</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!seal) notFound()

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 space-y-8">
      <PageHeader
        eyebrow={
          <>
            <Link href="/" className="underline underline-offset-4">
              CortSeal
            </Link>{" "}
            / Seal
          </>
        }
        title={seal.sourceTitle ?? "CortSeal Monitor Seal"}
        description="Public proof page with verdict, evidence, and downloadable artifacts."
        meta={
          <>
            Created{" "}
            <span className="font-medium text-foreground">{formatWhen(seal.createdAt)}</span>
          </>
        }
        actions={
          <Button asChild variant="secondary">
            <Link href="/directory">Back to directory</Link>
          </Button>
        }
      />

      <Card className="p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {seal.verdict.toUpperCase()} · {Math.round(seal.confidence)}%
          </Badge>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/api/seals/${seal.publicId}`}>Download JSON</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/api/badge/${seal.publicId}.svg`}>SVG badge</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/embed/${seal.publicId}`}>Embed</Link>
          </Button>
        </div>

        {seal.claim ? (
          <p className="text-sm">
            <span className="font-medium">Claim:</span> {seal.claim}
          </p>
        ) : null}

        <div className="text-sm text-muted-foreground">
          Source:{" "}
          <Link
            href={seal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            {seal.sourceUrl}
          </Link>
          {seal.sourcePublishedAt ? (
            <>
              {" "}
              · Published{" "}
              <span className="font-medium text-foreground">
                {formatWhen(seal.sourcePublishedAt)}
              </span>
            </>
          ) : null}
        </div>

        <p>{seal.summary}</p>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-medium">Evidence</h2>
        <p className="text-sm text-muted-foreground">
          Consensus score:{" "}
          <span className="font-medium text-foreground">
            {seal.evidence.consensusScore.toFixed(2)}
          </span>
        </p>

        <div className="space-y-2">
          {seal.evidence.runs.map((run) => (
            <div key={run.runIndex} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={run.ok ? "default" : "destructive"}>
                    Run {run.runIndex} · {run.ok ? "OK" : "ERROR"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(run.durationMs)}ms
                  </span>
                  {run.ok && run.verdict ? (
                    <span className="text-sm text-muted-foreground">
                      · {run.verdict.toUpperCase()} {Math.round(run.confidence ?? 0)}%
                    </span>
                  ) : null}
                  {run.ok && typeof run.rubricScore === "number" ? (
                    <span className="text-sm text-muted-foreground">
                      · rubric {Math.round(run.rubricScore)}
                    </span>
                  ) : null}
                </div>
              </div>

              {run.ok && run.summary ? <p className="mt-2">{run.summary}</p> : null}
              {run.ok && run.rubricReasons ? (
                <p className="mt-2 text-sm text-muted-foreground">{run.rubricReasons}</p>
              ) : null}
              {!run.ok && run.error ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-destructive">{run.error}</p>
              ) : null}
              {run.rawText ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Raw output
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-5">
                    {run.rawText}
                  </pre>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-medium">Excerpt</h2>
        <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-6">
          {seal.sourceExcerpt}
        </pre>
      </Card>
    </div>
  )
}
