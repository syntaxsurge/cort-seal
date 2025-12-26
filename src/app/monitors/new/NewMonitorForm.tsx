"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createMonitor, type CreateMonitorState } from "../actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Creating…" : "Create monitor"}
    </Button>
  )
}

export function NewMonitorForm() {
  const router = useRouter()
  const [kind, setKind] = useState<"rss" | "router">("rss")
  const [state, formAction] = useActionState<CreateMonitorState | null, FormData>(
    createMonitor,
    null
  )

  useEffect(() => {
    if (!state?.ok) return
    router.push(`/monitors/${state.monitorId}`)
  }, [router, state])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required minLength={3} maxLength={80} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kind">Kind</Label>
          <select
            id="kind"
            name="kind"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={kind}
            onChange={(event) => setKind(event.target.value === "router" ? "router" : "rss")}
          >
            <option value="rss">RSS feed</option>
            <option value="router">Router health</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="intervalMinutes">Interval (minutes)</Label>
          <Input
            id="intervalMinutes"
            name="intervalMinutes"
            type="number"
            min={1}
            max={1440}
            required
            defaultValue={30}
          />
        </div>
      </div>

      {kind === "rss" ? (
        <div className="space-y-2">
          <Label htmlFor="feedUrl">Feed URL</Label>
          <Input id="feedUrl" name="feedUrl" type="url" required />
          <p className="text-sm text-muted-foreground">
            Use a public RSS/Atom feed. New items generate a CortSeal monitor seal.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="minMinerCount">Min miner count</Label>
            <Input
              id="minMinerCount"
              name="minMinerCount"
              type="number"
              min={0}
              max={10000}
              defaultValue={1}
            />
            <p className="text-sm text-muted-foreground">
              Alerts when the connected miner count drops below this threshold.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="routerBaseUrl">Router base URL (optional)</Label>
            <Input id="routerBaseUrl" name="routerBaseUrl" type="url" />
            <p className="text-sm text-muted-foreground">
              Leave empty to use <code>CORTENSOR_ROUTER_URL</code> from Convex env.
            </p>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <p className="text-sm text-muted-foreground">
          Monitor runs are executed by Convex cron and stored as run history.
        </p>
      </div>

      {state && !state.ok ? (
        <p className="whitespace-pre-wrap text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
