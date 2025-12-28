"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WalletAddressHiddenInput } from "@/components/auth/WalletAddressHiddenInput";

import { runTry, type RunTryState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Running…" : "Run CortSeal Check"}
    </Button>
  );
}

export function TryForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<RunTryState | null, FormData>(
    runTry,
    null
  );

  useEffect(() => {
    if (!state?.ok) return;
    router.push(`/try/results/${state.analysisId}`);
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-4">
      <WalletAddressHiddenInput />
      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          name="prompt"
          required
          minLength={1}
          maxLength={12000}
          placeholder="Paste your draft content or ask a question..."
          className="min-h-[160px]"
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton />
        <p className="text-sm text-muted-foreground">
          This runs redundant verifiers plus a rubric judge and stores the result in Convex.
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
