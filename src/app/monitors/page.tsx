import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { listMonitors } from "@/features/cortseal/services/monitors"

import { runMonitorNow, setMonitorEnabled } from "./actions"

export const dynamic = "force-dynamic"

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString()
}

export default async function MonitorsPage() {
  const monitors = await listMonitors()

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="underline underline-offset-4">
              CortSeal
            </Link>{" "}
            / Monitors
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Monitors</h1>
          <p className="text-muted-foreground">
            Schedule RSS audits and router health checks. New feed items generate shareable seals.
          </p>
        </div>

        <Button asChild variant="secondary">
          <Link href="/monitors/new">New monitor</Link>
        </Button>
      </div>

      {monitors.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">No monitors yet.</p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/monitors/new">Create your first monitor</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {monitors.map((monitor) => {
            const locked =
              typeof monitor.lockedUntil === "number" && monitor.lockedUntil > Date.now()

            return (
              <Card key={monitor._id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/monitors/${monitor._id}`}
                        className="font-medium underline underline-offset-4"
                      >
                        {monitor.name}
                      </Link>
                      <Badge variant={monitor.enabled ? "default" : "secondary"}>
                        {monitor.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Badge variant="outline">{monitor.kind.toUpperCase()}</Badge>
                      {locked ? <Badge variant="outline">Running…</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Every {monitor.intervalMinutes} min · Next run:{" "}
                      <span className="font-medium text-foreground">
                        {formatWhen(monitor.nextRunAt)}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={runMonitorNow}>
                      <input type="hidden" name="monitorId" value={monitor._id} />
                      <input type="hidden" name="returnTo" value="/monitors" />
                      <Button type="submit" variant="secondary" disabled={locked}>
                        Run now
                      </Button>
                    </form>

                    <form action={setMonitorEnabled}>
                      <input type="hidden" name="monitorId" value={monitor._id} />
                      <input type="hidden" name="returnTo" value="/monitors" />
                      <input type="hidden" name="enabled" value={String(!monitor.enabled)} />
                      <Button type="submit" variant="outline" disabled={locked}>
                        {monitor.enabled ? "Disable" : "Enable"}
                      </Button>
                    </form>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
