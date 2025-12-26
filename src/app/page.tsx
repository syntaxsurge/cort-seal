import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-4xl px-6 py-14">
      <header className="mb-10 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">CortSeal</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight">
          Creator-grade content checks powered by decentralized inference.
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          Extract verifiable claims, run redundant verifier checks (PoI-style), and share the
          results as a proof URL.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild>
            <Link href="/try">Try CortSeal</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/audit">Audit a URL</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/validate">Validate a claim</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/directory">Directory</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/monitors">Monitors</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="https://docs.cortensor.network" target="_blank" rel="noreferrer">
              Cortensor docs
            </Link>
          </Button>
        </div>
      </header>

      <main className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Claim checks</CardTitle>
            <CardDescription>Redundant verifier runs with dispersion.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Paste draft content, extract claims, and compute agreement across multiple decentralized
            inference runs.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What’s next</CardTitle>
            <CardDescription>PoI/PoUW, evidence bundles, monitoring.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Layer in rubric scoring, exportable evidence bundles, and agentic monitors that run
            checks on a schedule.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
