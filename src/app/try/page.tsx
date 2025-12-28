import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TryForm } from "@/app/try/TryForm";

export default function TryPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 space-y-8">
      <PageHeader
        eyebrow={
          <>
            <Link href="/" className="underline underline-offset-4">
              CortSeal
            </Link>{" "}
            / Try
          </>
        }
        title="Claim check studio"
        description="Paste draft content, extract claims, and run redundant verifier checks to measure agreement (PoI) plus rubric scoring (PoUW)."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/audit">Audit a URL</Link>
            </Button>
            <Button asChild>
              <Link href="/validate">Mint a seal</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Draft content</CardTitle>
            <CardDescription>
              Extract verifiable claims, run redundant verifiers, and store results in Convex for
              shareable proof URLs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TryForm />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What you get</CardTitle>
              <CardDescription>Proof artifacts ready for sharing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Claim list with consensus verdicts and dispersion metrics.</p>
              <p>PoUW rubric summary with issues and recommendations.</p>
              <p>Evidence bundle download plus shareable proof link.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended flow</CardTitle>
              <CardDescription>Run this before publishing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Paste your draft or notes.</p>
              <p>2. Review claim verdicts and rubric flags.</p>
              <p>3. Publish with the proof link or badge.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
