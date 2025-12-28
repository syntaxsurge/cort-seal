import Link from "next/link";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listPublicSeals } from "@/features/cortseal/services/seals";

export const dynamic = "force-dynamic";

const verdictParamSchema = z.enum(["pass", "warn", "fail", "unknown"]);

type PageProps = {
  searchParams: Promise<{ verdict?: string }>;
};

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString();
}

export default async function DirectoryPage({ searchParams }: PageProps) {
  const { verdict } = await searchParams;
  const parsedVerdict = verdictParamSchema.safeParse(verdict);

  const seals = await listPublicSeals({
    verdict: parsedVerdict.success ? parsedVerdict.data : undefined,
    limit: 40,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 space-y-8">
      <PageHeader
        eyebrow={
          <>
            <Link href="/" className="underline underline-offset-4">
              CortSeal
            </Link>{" "}
            / Directory
          </>
        }
        title="Seal directory"
        description="Browse public verification artifacts with share pages, badges, and embeds."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/try">Try drafts</Link>
            </Button>
            <Button asChild>
              <Link href="/validate">Validate a claim</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant={parsedVerdict.success ? "secondary" : "default"} size="sm">
          <Link href="/directory">All</Link>
        </Button>
        {(["pass", "warn", "fail", "unknown"] as const).map((v) => (
          <Button
            key={v}
            asChild
            variant={parsedVerdict.success && parsedVerdict.data === v ? "default" : "secondary"}
            size="sm"
          >
            <Link href={`/directory?verdict=${v}`}>{v.toUpperCase()}</Link>
          </Button>
        ))}
      </div>

      {seals.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">No seals yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {seals.map((seal) => (
            <Card key={seal._id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline">
                  {seal.verdict.toUpperCase()} · {Math.round(seal.confidence)}%
                </Badge>
                <span className="text-xs text-muted-foreground">{formatWhen(seal.createdAt)}</span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium line-clamp-2">
                  {seal.claim ?? seal.sourceTitle ?? seal.sourceUrl}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-3">{seal.summary}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Link className="underline underline-offset-4" href={`/seal/${seal.publicId}`}>
                  View
                </Link>
                <a
                  className="underline underline-offset-4"
                  href={`/api/seals/${seal.publicId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  JSON
                </a>
                <a
                  className="underline underline-offset-4"
                  href={`/api/badge/${seal.publicId}.svg`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Badge
                </a>
                <Link className="underline underline-offset-4" href={`/embed/${seal.publicId}`}>
                  Embed
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
