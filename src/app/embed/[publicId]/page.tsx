import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSealByPublicId } from "@/features/cortseal/services/seals";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString();
}

export default async function EmbedPage({ params }: PageProps) {
  const { publicId } = await params;

  const seal = await getSealByPublicId(publicId);
  if (!seal) notFound();

  return (
    <div className="p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">CortSeal</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {seal.verdict.toUpperCase()} · {Math.round(seal.confidence)}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatWhen(seal.createdAt)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {seal.claim ? (
            <p className="text-sm">
              <span className="font-medium">Claim:</span> {seal.claim}
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">{seal.summary}</p>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Link className="underline underline-offset-4" href={`/seal/${seal.publicId}`}>
              View seal
            </Link>
            <a
              className="underline underline-offset-4"
              href={seal.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Source
            </a>
            <a
              className="underline underline-offset-4"
              href={`/api/badge/${seal.publicId}.svg`}
              target="_blank"
              rel="noreferrer"
            >
              Badge
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

