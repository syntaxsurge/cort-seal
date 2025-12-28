import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ValidateForm } from "@/app/validate/ValidateForm";

export const dynamic = "force-dynamic";

export default function ValidatePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 space-y-8">
      <PageHeader
        eyebrow={
          <>
            <Link href="/" className="underline underline-offset-4">
              CortSeal
            </Link>{" "}
            / Validate
          </>
        }
        title="Public validator"
        description="Submit a claim and source URL. CortSeal fetches readable text, runs redundant verifiers (PoI), and mints a shareable seal."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/try">Check a draft</Link>
            </Button>
            <Button asChild>
              <Link href="/directory">Open library</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Validator inputs</CardTitle>
            <CardDescription>
              This powers the /api/validate endpoint with evidence, dispersion, and downloadable
              artifacts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ValidateForm />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Artifacts produced</CardTitle>
              <CardDescription>Everything you can share publicly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Public seal page with verdict + evidence summary.</p>
              <p>Badge SVG and embed card for creators.</p>
              <p>JSON bundle with full evidence and provenance.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ideal for demos</CardTitle>
              <CardDescription>Judge-friendly proof flow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Use a concrete claim tied to a stable public URL.</p>
              <p>Show dispersion + consensus to highlight PoI.</p>
              <p>Open the seal page and badge immediately.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
