import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { NewMonitorForm } from "./NewMonitorForm"

export default function NewMonitorPage() {
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
            / New
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">New monitor</h1>
          <p className="text-muted-foreground">
            RSS monitors generate seals for new feed items. Router monitors alert on health issues.
          </p>
        </div>

        <Button asChild variant="secondary">
          <Link href="/monitors">Back</Link>
        </Button>
      </div>

      <Card className="p-6">
        <NewMonitorForm />
      </Card>
    </div>
  )
}

