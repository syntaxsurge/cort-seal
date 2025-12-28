"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WalletAddressHiddenInput } from "@/components/auth/WalletAddressHiddenInput";

import { runAudit, type RunAuditState } from "./actions";

const DEFAULT_URL =
  "https://docs.cortensor.network/community-and-ecosystem/hackathon/hackathon-3";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Running…" : "Run URL Audit"}
    </Button>
  );
}

export function AuditForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<RunAuditState | null, FormData>(
    runAudit,
    null
  );

  useEffect(() => {
    if (!state?.ok) return;
    router.push(`/audit/results/${state.analysisId}`);
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-4">
      <WalletAddressHiddenInput />
      <div className="space-y-2">
        <Label htmlFor="url">Source URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          required
          defaultValue={DEFAULT_URL}
          placeholder="https://example.com/article"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maxClaims">Max claims (1–20)</Label>
          <Input
            id="maxClaims"
            name="maxClaims"
            type="number"
            min={1}
            max={20}
            required
            defaultValue={12}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="runsPerClaim">Redundancy (2–5)</Label>
          <Input
            id="runsPerClaim"
            name="runsPerClaim"
            type="number"
            min={2}
            max={5}
            required
            defaultValue={3}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <p className="text-sm text-muted-foreground">
          Fetches the URL, extracts claims, runs redundant validators (PoI-style), and adds a rubric
          score (PoUW-style).
        </p>
      </div>

      {state && !state.ok ? (
        <p className="whitespace-pre-wrap text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
