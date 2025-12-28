import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "Extract claims",
    description: "Turn draft text or URLs into a focused list of verifiable claims.",
  },
  {
    title: "Run redundant checks",
    description: "Measure agreement and dispersion across multiple router verifiers.",
  },
  {
    title: "Ship proof artifacts",
    description: "Generate seals, badges, embeds, and evidence bundles you can share.",
  },
];

const proofSurfaces = [
  {
    title: "Public seals",
    description: "Shareable proof pages with verdicts, evidence, and consensus metrics.",
    href: "/directory",
  },
  {
    title: "Badges + embeds",
    description: "Drop trust badges into blogs, newsletters, and creator profiles.",
    href: "/validate",
  },
  {
    title: "OpenAPI surface",
    description: "Integrate with the public /api/validate endpoint in minutes.",
    href: "/api/openapi.json",
  },
  {
    title: "Always-on monitors",
    description: "Schedule RSS audits and router health checks with alerts.",
    href: "/monitors",
  },
];

const workflows = [
  {
    title: "Creator drafts",
    description: "Validate claims before publishing, then attach a seal to the final post.",
  },
  {
    title: "Public URL audits",
    description: "Analyze sources, cite evidence, and export a proof bundle for reviewers.",
  },
  {
    title: "Agentic monitoring",
    description: "Keep claims fresh with scheduled checks and automated re-verification.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-12">
      <section className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 animate-rise">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="w-fit border-primary/30 bg-background/70 text-foreground"
            >
              Decentralized trust for creators
            </Badge>
            <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Cortensor Router
            </span>
          </div>
          <h1 className="font-display text-balance text-4xl leading-tight md:text-6xl">
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-accent bg-clip-text text-transparent">
              Proof-ready seals
            </span>{" "}
            for creator claims and public sources.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-muted-foreground">
            CortSeal extracts verifiable claims, runs redundant router checks (PoI), applies a
            PoUW-style rubric, and publishes shareable evidence bundles.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-primary via-indigo-500 to-primary text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              <Link href="/try">Start a check</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/validate">Mint a seal</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/audit">Audit a URL</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="border border-border/60">
              PoI redundancy
            </Badge>
            <Badge variant="secondary" className="border border-border/60">
              PoUW scoring
            </Badge>
            <Badge variant="secondary" className="border border-border/60">
              Evidence bundles
            </Badge>
            <Badge variant="secondary" className="border border-border/60">
              Public proofs
            </Badge>
          </div>
        </div>

        <div className="relative animate-rise" style={{ animationDelay: "120ms" }}>
          <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 right-0 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />
          <Card className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Proof snapshot</CardTitle>
              <CardDescription>What a finished seal delivers in one run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">SUPPORTED · 92%</Badge>
                <span className="text-xs text-muted-foreground">
                  Dispersion 0.12 · Runs 3x
                </span>
              </div>
              <p className="text-muted-foreground">
                Claim: Submission deadline is Jan 4, 2026. Evidence includes quotes, verdict
                rationales, and deterministic checks.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">Proof bundle</p>
                  <p className="mt-1 font-medium">Download JSON</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">Badge + embed</p>
                  <p className="mt-1 font-medium">Public share assets</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 px-2 py-0.5">Consensus</span>
                <span className="rounded-full border border-border/60 px-2 py-0.5">PoI</span>
                <span className="rounded-full border border-border/60 px-2 py-0.5">PoUW</span>
                <span className="rounded-full border border-border/60 px-2 py-0.5">Proof</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-20 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Workflow</p>
          <h2 className="font-display text-3xl">How CortSeal works</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="border-border/60 bg-card/80 backdrop-blur">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Step 0{index + 1}
                </p>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Proof surfaces</p>
          <h2 className="font-display text-3xl">Everything you need to share trust</h2>
          <p className="text-muted-foreground">
            CortSeal turns decentralized inference into tangible artifacts that creators, teams,
            and audiences can verify.
          </p>
          <Button asChild variant="secondary">
            <Link href="/directory">Browse public seals</Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {proofSurfaces.map((surface) => (
            <Card key={surface.title} className="border-border/60 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">{surface.title}</CardTitle>
                <CardDescription>{surface.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={surface.href}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  Explore
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Use cases</p>
          <h2 className="font-display text-3xl">Built for hackathon-grade demos</h2>
          <p className="text-muted-foreground">
            Make PoI agreement, PoUW scoring, and evidence bundles obvious in every flow.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {workflows.map((flow) => (
            <Card key={flow.title} className="border-border/60 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">{flow.title}</CardTitle>
                <CardDescription>{flow.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <Card className="border-border/60 bg-card/80 px-6 py-10 backdrop-blur">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="space-y-3">
              <h2 className="font-display text-3xl">Ready to seal your first claim?</h2>
              <p className="text-muted-foreground">
                Start with a draft or a public URL. CortSeal handles extraction, verification, and
                proof publishing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-primary via-indigo-500 to-primary text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                <Link href="/try">Run a draft check</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/audit">Audit a URL</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
