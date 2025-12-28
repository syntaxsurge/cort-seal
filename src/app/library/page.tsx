import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { RequireWallet } from "@/components/auth/RequireWallet";
import { LibraryClient } from "@/app/library/LibraryClient";

export const dynamic = "force-dynamic";

export default function LibraryPage() {
  return (
    <RequireWallet>
      <div className="mx-auto w-full max-w-6xl px-6 py-12 space-y-8">
        <PageHeader
          eyebrow={
            <>
              <Link href="/" className="underline underline-offset-4">
                CortSeal
              </Link>{" "}
              / Library
            </>
          }
          title="My artifacts"
          description="Your analyses, proofs, seals, and monitors tied to your wallet."
          actions={
            <>
              <Button asChild variant="secondary">
                <Link href="/try">Run a draft check</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/audit">Audit a URL</Link>
              </Button>
              <Button asChild>
                <Link href="/validate">Validate a claim</Link>
              </Button>
            </>
          }
        />

        <LibraryClient />
      </div>
    </RequireWallet>
  );
}
