"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ProofResponse =
  | {
      publicId: string;
      shareUrl: string;
      evidenceUrl: string;
      bundleHashSha256: string;
    }
  | { error: string };

export function ProofActions({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<Exclude<ProofResponse, { error: string }> | null>(
    null
  );

  const shareUrlAbs =
    proof && typeof window !== "undefined"
      ? new URL(proof.shareUrl, window.location.origin).toString()
      : null;

  async function onGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/analyses/${analysisId}/proof`, { method: "POST" });
      const json = (await res.json()) as ProofResponse;

      if (!res.ok) {
        const message = "error" in json ? json.error : "Failed to generate proof.";
        throw new Error(message);
      }

      if ("error" in json) {
        throw new Error(json.error);
      }

      setProof(json);

      try {
        const text = new URL(json.shareUrl, window.location.origin).toString();
        await navigator.clipboard.writeText(text);
      } catch {
        // Ignore clipboard errors (permissions, unsupported browsers).
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!shareUrlAbs) return;
    try {
      await navigator.clipboard.writeText(shareUrlAbs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to copy link.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={onGenerate}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Generating…" : "Generate proof link"}
      </Button>

      {proof ? (
        <>
          <Button asChild variant="outline">
            <a href={proof.shareUrl} target="_blank" rel="noreferrer">
              Open share page
            </a>
          </Button>
          <Button type="button" variant="outline" onClick={onCopy} disabled={!shareUrlAbs}>
            Copy link
          </Button>
        </>
      ) : null}

      {error ? (
        <p className="w-full whitespace-pre-wrap text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
