"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useAccount } from "wagmi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeWalletAddress } from "@/lib/wallet/address";

type ValidateResponse = {
  kind: "cortseal:validate:v1";
  createdAt: number;
  source: { url: string; title: string; fetchedAt: number; textSha256: string };
  claim: string;
  excerpt: string;
  summary: {
    consensusVerdict: "supported" | "unsupported" | "unclear";
    consensusConfidence: number;
    dispersion: number;
    meanRationaleCosine: number;
    poiDisagreement: number;
    averageScore: number;
    divergent: boolean;
  };
  seal?: {
    publicId: string;
    href: string;
    url: string;
    downloadHref: string;
    badgeHref: string;
    embedHref: string;
  };
  rateLimit?: { remaining: number; resetAt: number };
};

function getApiError(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const error = (value as { error?: unknown }).error;
  if (typeof error !== "string") return null;
  const trimmed = error.trim();
  return trimmed ? trimmed : null;
}

export function ValidateForm() {
  const [url, setUrl] = useState("");
  const [claim, setClaim] = useState("");
  const [runs, setRuns] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const { address } = useAccount();

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const ownerAddress = normalizeWalletAddress(address);
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, claim, runs, ownerAddress }),
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(getApiError(json) ?? `Request failed (HTTP ${res.status}).`);
        return;
      }

      setResult(json as ValidateResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const badgeUrl = result?.seal?.badgeHref ? `${origin}${result.seal.badgeHref}` : null;
  const embedUrl = result?.seal?.embedHref ? `${origin}${result.seal.embedHref}` : null;

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Source URL</Label>
          <Input
            id="url"
            name="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            inputMode="url"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="claim">Claim</Label>
          <Textarea
            id="claim"
            name="claim"
            placeholder="The submission deadline is January 4, 2026."
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            required
            rows={3}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="runs">Redundant runs</Label>
            <Input
              id="runs"
              name="runs"
              type="number"
              min={2}
              max={5}
              value={runs}
              onChange={(e) => setRuns(Number(e.target.value))}
              className="w-28"
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Validating…" : "Validate"}
          </Button>
        </div>
      </form>

      {error ? (
        <Card className="p-4 border-destructive/40">
          <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{result.summary.consensusVerdict.toUpperCase()}</Badge>
              <span className="text-sm text-muted-foreground">
                Confidence {Math.round(result.summary.consensusConfidence * 100)}% · Dispersion{" "}
                {result.summary.dispersion.toFixed(2)} · PoI{" "}
                {result.summary.meanRationaleCosine.toFixed(2)}
                {result.summary.divergent ? " · divergent" : ""}
              </span>
            </div>

            <p className="text-sm">
              <span className="font-medium">Source:</span>{" "}
              <a className="underline underline-offset-4" href={result.source.url} target="_blank" rel="noreferrer">
                {result.source.title}
              </a>
            </p>

            {result.seal ? (
              <div className="text-sm space-y-2">
                <p>
                  <span className="font-medium">Seal:</span>{" "}
                  <a className="underline underline-offset-4" href={result.seal.url} target="_blank" rel="noreferrer">
                    {result.seal.url}
                  </a>
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <a className="underline underline-offset-4" href={result.seal.downloadHref} target="_blank" rel="noreferrer">
                    Download JSON
                  </a>
                  <a className="underline underline-offset-4" href={result.seal.badgeHref} target="_blank" rel="noreferrer">
                    SVG badge
                  </a>
                  <a className="underline underline-offset-4" href={result.seal.embedHref} target="_blank" rel="noreferrer">
                    Embed
                  </a>
                </div>
              </div>
            ) : null}
          </Card>

          {badgeUrl ? (
            <Card className="p-5 space-y-2">
              <p className="text-sm font-medium">Badge</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badgeUrl} alt="CortSeal badge" className="h-9 w-auto" />
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-5">{`<img src="${badgeUrl}" alt="CortSeal badge" />`}</pre>
            </Card>
          ) : null}

          {embedUrl ? (
            <Card className="p-5 space-y-2">
              <p className="text-sm font-medium">Embed</p>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-5">{`<iframe src="${embedUrl}" width="520" height="220" style="border:0" loading="lazy"></iframe>`}</pre>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
