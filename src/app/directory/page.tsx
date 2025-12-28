import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { listDirectoryArtifacts } from "@/features/cortseal/services/directory";
import { ArtifactsLibrary } from "@/app/directory/components/ArtifactsLibrary";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const artifacts = await listDirectoryArtifacts({ limit: 50 });

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
        title="Artifacts library"
        description="Every analysis, proof, seal, and monitor you have created in one place."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/try">Try drafts</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/audit">Audit a URL</Link>
            </Button>
            <Button asChild>
              <Link href="/validate">Validate a claim</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/monitors/new">New monitor</Link>
            </Button>
          </>
        }
      />

      <ArtifactsLibrary artifacts={artifacts} />
    </div>
  );
}
