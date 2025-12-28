import Link from "next/link"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RequireWallet } from "@/components/auth/RequireWallet"

import { NewMonitorForm } from "./NewMonitorForm"

export default function NewMonitorPage() {
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
              <Link href="/monitors" className="underline underline-offset-4">
                Monitors
              </Link>{" "}
              / New
            </>
          }
          title="New monitor"
          description="RSS monitors generate seals for new feed items. Router monitors alert on health issues."
          actions={
            <Button asChild variant="secondary">
              <Link href="/monitors">Back</Link>
            </Button>
          }
        />

        <Card className="p-6">
          <NewMonitorForm />
        </Card>
      </div>
    </RequireWallet>
  )
}
