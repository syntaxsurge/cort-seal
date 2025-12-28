import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuditForm } from "@/app/audit/AuditForm";

export default function AuditPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 space-y-8">
      <PageHeader
        eyebrow={
          <>
            <Link href="/" className="underline underline-offset-4">
              CortSeal
            </Link>{" "}
            / Audit
          </>
        }
        title="Source audit"
        description="Fetch a public webpage, extract verifiable claims, run redundant validators, and publish a proof bundle you can share."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/try">Analyze a draft</Link>
            </Button>
            <Button asChild>
              <Link href="/validate">Validate a claim</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>URL input</CardTitle>
            <CardDescription>
              CortSeal fetches the URL server-side with SSRF protections and stores the result in
              Convex.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditForm />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit highlights</CardTitle>
              <CardDescription>What the proof bundle includes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Source metadata, text hash, and readable excerpts.</p>
              <p>Consensus verdicts with dispersion and cosine metrics.</p>
              <p>Rubric scoring and evidence bundles for downstream use.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Best practice</CardTitle>
              <CardDescription>Keep audits reproducible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Use stable URLs and archived sources when possible.</p>
              <p>Include claims that are specific and time-bounded.</p>
              <p>Share the evidence bundle link with reviewers.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
