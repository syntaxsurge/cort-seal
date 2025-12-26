import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidateForm } from "@/app/validate/ValidateForm";

export const dynamic = "force-dynamic";

export default function ValidatePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            CortSeal
          </Link>{" "}
          / Validate
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Validate a claim</h1>
        <p className="text-muted-foreground">
          Submit a claim plus a public URL. CortSeal fetches readable text, runs redundant verifier
          calls (PoI-style), and stores a shareable seal with a badge and embed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public validator</CardTitle>
          <CardDescription>
            This route powers the Hackathon Router surface: a `/validate` endpoint with evidence,
            dispersion, and downloadable artifacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ValidateForm />
        </CardContent>
      </Card>
    </div>
  );
}

