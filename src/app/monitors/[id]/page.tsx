import Link from "next/link"
import { notFound } from "next/navigation"
import type { GenericId } from "convex/values"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getMonitorById, listMonitorRuns } from "@/features/cortseal/services/monitors"
import { listSealsByMonitor } from "@/features/cortseal/services/seals"

import { runMonitorNow, setMonitorEnabled } from "../actions"

type PageProps = {
  params: Promise<{ id: string }>
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString()
}

export default async function MonitorDetailsPage({ params }: PageProps) {
  const { id } = await params
  const monitorId = id as GenericId<"monitors">

  const monitor = await getMonitorById(monitorId)
  if (!monitor) notFound()

  const [runs, seals] = await Promise.all([
    listMonitorRuns({ monitorId, limit: 25 }),
    listSealsByMonitor({ monitorId, limit: 10 }),
  ])

  const locked = typeof monitor.lockedUntil === "number" && monitor.lockedUntil > Date.now()

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="underline underline-offset-4">
              CortSeal
            </Link>{" "}
            /{" "}
            <Link href="/monitors" className="underline underline-offset-4">
              Monitors
            </Link>{" "}
            / {monitor.name}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{monitor.name}</h1>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{monitor.kind.toUpperCase()}</span> ·{" "}
            Every{" "}
            <span className="font-medium text-foreground">{monitor.intervalMinutes} min</span> ·{" "}
            Next run{" "}
            <span className="font-medium text-foreground">
              {formatWhen(monitor.nextRunAt)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={runMonitorNow}>
            <input type="hidden" name="monitorId" value={monitor._id} />
            <input type="hidden" name="returnTo" value={`/monitors/${monitor._id}`} />
            <Button type="submit" variant="secondary" disabled={locked}>
              {locked ? "Running…" : "Run now"}
            </Button>
          </form>

          <form action={setMonitorEnabled}>
            <input type="hidden" name="monitorId" value={monitor._id} />
            <input type="hidden" name="returnTo" value={`/monitors/${monitor._id}`} />
            <input type="hidden" name="enabled" value={String(!monitor.enabled)} />
            <Button type="submit" variant="outline" disabled={locked}>
              {monitor.enabled ? "Disable" : "Enable"}
            </Button>
          </form>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={monitor.enabled ? "default" : "secondary"}>
              {monitor.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant="outline">{monitor.kind.toUpperCase()}</Badge>
            {locked ? <Badge variant="outline">Locked</Badge> : null}
          </div>

          {monitor.kind === "rss" ? (
            <div className="text-sm text-muted-foreground">
              Feed:{" "}
              {monitor.feedUrl ? (
                <Link
                  href={monitor.feedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {monitor.feedUrl}
                </Link>
              ) : (
                <span className="text-foreground">missing</span>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Router:{" "}
                <span className="font-medium text-foreground">
                  {monitor.routerBaseUrl ?? "CORTENSOR_ROUTER_URL (Convex env)"}
                </span>
              </p>
              <p>
                Min miners:{" "}
                <span className="font-medium text-foreground">
                  {monitor.minMinerCount ?? 1}
                </span>
                {monitor.lastHealthOk === undefined ? null : (
                  <>
                    {" "}
                    · Last health:{" "}
                    <span className="font-medium text-foreground">
                      {monitor.lastHealthOk ? "ok" : "alert"}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-medium">Recent seals</h2>
          {seals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No seals yet.</p>
          ) : (
            <div className="space-y-2">
              {seals.map((seal) => (
                <div key={seal._id} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {seal.verdict.toUpperCase()} · {Math.round(seal.confidence)}%
                    </Badge>
                    <Link
                      href={`/seal/${seal.publicId}`}
                      className="font-medium underline underline-offset-4"
                    >
                      {seal.sourceTitle ?? seal.sourceUrl}
                    </Link>
                  </div>
                  <p className="text-sm text-muted-foreground">{seal.summary}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-medium">Run history</h2>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div key={run._id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          run.status === "success"
                            ? "default"
                            : run.status === "skipped"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {run.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatWhen(run.startedAt)}
                      </span>
                      {typeof run.durationMs === "number" ? (
                        <span className="text-sm text-muted-foreground">
                          · {Math.round(run.durationMs / 1000)}s
                        </span>
                      ) : null}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {typeof run.createdSeals === "number"
                        ? `seals=${run.createdSeals}`
                        : typeof run.newItems === "number"
                          ? `items=${run.newItems}`
                          : null}
                      {typeof run.minerCount === "number" ? ` · miners=${run.minerCount}` : null}
                      {typeof run.routerStatusHttp === "number"
                        ? ` · status=${run.routerStatusHttp}`
                        : null}
                    </div>
                  </div>

                  {run.summary ? (
                    <p className="mt-2 text-sm text-muted-foreground">{run.summary}</p>
                  ) : null}
                  {run.error ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-destructive">
                      {run.error}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
