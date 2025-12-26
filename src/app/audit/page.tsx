import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditForm } from "@/app/audit/AuditForm";

export default function AuditPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            CortSeal
          </Link>{" "}
          / Audit
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Audit a URL</h1>
        <p className="text-muted-foreground">
          Fetch a public webpage, extract verifiable claims, run redundant validators, and produce
          an evidence bundle you can share.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source audit</CardTitle>
          <CardDescription>
            CortSeal fetches the URL server-side with SSRF protections and stores the result in
            Convex.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditForm />
        </CardContent>
      </Card>
    </div>
  );
}

