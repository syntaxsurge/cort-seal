import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TryForm } from "@/app/try/TryForm";

export default function TryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            CortSeal
          </Link>{" "}
          / Try
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Try CortSeal</h1>
        <p className="text-muted-foreground">
          Extract claims from your draft and run redundant verifier checks to measure agreement
          (PoI-style) plus rubric scoring (PoUW-style).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Draft content</CardTitle>
          <CardDescription>
            CortSeal extracts verifiable claims, runs redundant verifiers plus a PoUW rubric, and
            stores results in Convex for shareable URLs and evidence downloads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TryForm />
        </CardContent>
      </Card>
    </div>
  );
}
