"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DirectoryArtifacts } from "@/features/cortseal/types/directory";

type Filter = "all" | "analyses" | "proofs" | "seals" | "monitors";

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString();
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildAbsoluteLink(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy copy
    }
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }

  return false;
}

function verdictVariant(
  verdict: "pass" | "warn" | "fail" | "unknown"
): "default" | "secondary" | "destructive" | "outline" {
  if (verdict === "pass") return "default";
  if (verdict === "warn") return "secondary";
  if (verdict === "fail") return "destructive";
  return "outline";
}

export function ArtifactsLibrary({ artifacts }: { artifacts: DirectoryArtifacts }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const matches = (value: unknown) => {
      if (!normalizedQuery) return true;
      return String(value ?? "").toLowerCase().includes(normalizedQuery);
    };

    return {
      analyses: artifacts.analyses.filter((analysis) =>
        [
          analysis.id,
          analysis.promptPreview,
          analysis.status,
          analysis.resultKind,
          analysis.analysisType,
        ].some(matches)
      ),
      proofs: artifacts.proofs.filter((proof) =>
        [proof.id, proof.publicId, proof.analysisId, proof.bundleHashSha256].some(matches)
      ),
      seals: artifacts.seals.filter((seal) =>
        [
          seal.id,
          seal.publicId,
          seal.verdict,
          seal.claim,
          seal.sourceTitle,
          seal.sourceUrl,
        ].some(matches)
      ),
      monitors: artifacts.monitors.filter((monitor) =>
        [monitor.id, monitor.name, monitor.kind, monitor.feedUrl, monitor.routerBaseUrl].some(
          matches
        )
      ),
    };
  }, [artifacts, normalizedQuery]);

  const counts = {
    analyses: filtered.analyses.length,
    proofs: filtered.proofs.length,
    seals: filtered.seals.length,
    monitors: filtered.monitors.length,
  };

  const totalCount = counts.analyses + counts.proofs + counts.seals + counts.monitors;
  const activeCount = filter === "all" ? totalCount : counts[filter];

  const handleCopy = async (key: string, href: string) => {
    const ok = await copyToClipboard(buildAbsoluteLink(href));
    if (!ok) return;
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
  };

  const showAnalyses = filter === "all" || filter === "analyses";
  const showProofs = filter === "all" || filter === "proofs";
  const showSeals = filter === "all" || filter === "seals";
  const showMonitors = filter === "all" || filter === "monitors";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", `All (${totalCount})`],
              ["analyses", `Analyses (${counts.analyses})`],
              ["proofs", `Proofs (${counts.proofs})`],
              ["seals", `Seals (${counts.seals})`],
              ["monitors", `Monitors (${counts.monitors})`],
            ] as Array<[Filter, string]>
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={filter === value ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="w-full md:max-w-xs">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by ID, URL, title, or verdict"
            aria-label="Search artifacts"
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{activeCount}</span> items
      </div>

      {totalCount === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            No artifacts yet. Run a draft check, audit a URL, validate a claim, or create a monitor.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {showAnalyses ? (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Analyses</div>
                <Badge variant="secondary">{counts.analyses}</Badge>
              </div>
              {filtered.analyses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No analyses match this filter. Run /try or /audit to generate one.
                </p>
              ) : (
                <div className="space-y-3">
                  {filtered.analyses.map((analysis) => {
                    const href =
                      analysis.analysisType === "audit"
                        ? `/audit/results/${analysis.id}`
                        : `/try/results/${analysis.id}`;
                    const label =
                      analysis.promptPreview && analysis.promptPreview.length > 0
                        ? analysis.promptPreview
                        : "Analysis run";
                    const statusVariant = analysis.status === "error" ? "destructive" : "outline";
                    const copyKey = `analysis-${analysis.id}`;
                    return (
                      <div
                        key={analysis.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {analysis.analysisType === "audit" ? "Audit" : "Try"}
                            </Badge>
                            <Badge variant={statusVariant}>{analysis.status}</Badge>
                            {analysis.resultKind ? (
                              <Badge variant="outline">{analysis.resultKind}</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm font-medium line-clamp-2">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatWhen(analysis.createdAt)} - {analysis.id}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={href}>Open</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleCopy(copyKey, href)}
                          >
                            {copiedKey === copyKey ? "Copied" : "Copy link"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : null}

          {showProofs ? (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Proofs</div>
                <Badge variant="secondary">{counts.proofs}</Badge>
              </div>
              {filtered.proofs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No proofs match this filter. Generate one from a results page.
                </p>
              ) : (
                <div className="space-y-3">
                  {filtered.proofs.map((proof) => {
                    const href = `/share/${proof.publicId}`;
                    const copyKey = `proof-${proof.id}`;
                    return (
                      <div
                        key={proof.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">Proof</Badge>
                            <Badge variant="secondary">{proof.publicId}</Badge>
                          </div>
                          <p className="text-sm font-medium line-clamp-1">
                            {formatBytes(proof.bundleBytes)} - {proof.bundleHashSha256.slice(0, 12)}
                            ...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatWhen(proof.createdAt)} - {proof.id}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={href}>Open</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleCopy(copyKey, href)}
                          >
                            {copiedKey === copyKey ? "Copied" : "Copy link"}
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <a href={`/api/proofs/${proof.publicId}`} target="_blank" rel="noreferrer">
                              JSON
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : null}

          {showSeals ? (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Seals</div>
                <Badge variant="secondary">{counts.seals}</Badge>
              </div>
              {filtered.seals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No seals match this filter. Mint one via /validate or /monitors.
                </p>
              ) : (
                <div className="space-y-3">
                  {filtered.seals.map((seal) => {
                    const href = `/seal/${seal.publicId}`;
                    const copyKey = `seal-${seal.id}`;
                    const title = seal.claim ?? seal.sourceTitle ?? seal.sourceUrl ?? "Seal";
                    return (
                      <div
                        key={seal.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={verdictVariant(seal.verdict)}>
                              {seal.verdict.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{Math.round(seal.confidence)}%</Badge>
                            <Badge variant="secondary">{seal.publicId}</Badge>
                          </div>
                          <p className="text-sm font-medium line-clamp-2">{title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatWhen(seal.createdAt)}
                            {seal.sourceUrl ? ` - ${seal.sourceUrl}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={href}>Open</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleCopy(copyKey, href)}
                          >
                            {copiedKey === copyKey ? "Copied" : "Copy link"}
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/embed/${seal.publicId}`}>Embed</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={`/api/badge/${seal.publicId}.svg`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Badge
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={`/api/seals/${seal.publicId}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              JSON
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : null}

          {showMonitors ? (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Monitors</div>
                <Badge variant="secondary">{counts.monitors}</Badge>
              </div>
              {filtered.monitors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No monitors match this filter. Create one at /monitors/new.
                </p>
              ) : (
                <div className="space-y-3">
                  {filtered.monitors.map((monitor) => {
                    const href = `/monitors/${monitor.id}`;
                    const copyKey = `monitor-${monitor.id}`;
                    const statusVariant = monitor.enabled ? "default" : "outline";
                    const subtitle =
                      monitor.kind === "rss" ? monitor.feedUrl : monitor.routerBaseUrl;
                    return (
                      <div
                        key={monitor.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{monitor.kind.toUpperCase()}</Badge>
                            <Badge variant={statusVariant}>
                              {monitor.enabled ? "Enabled" : "Paused"}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium line-clamp-1">{monitor.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatWhen(monitor.createdAt)}
                            {subtitle ? ` - ${subtitle}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={href}>Open</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleCopy(copyKey, href)}
                          >
                            {copiedKey === copyKey ? "Copied" : "Copy link"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
