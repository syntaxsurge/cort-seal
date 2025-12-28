"use client";

import { useAccount } from "wagmi";
import { useQuery } from "convex/react";

import { Card } from "@/components/ui/card";
import { ArtifactsLibrary } from "@/app/directory/components/ArtifactsLibrary";
import { normalizeWalletAddress } from "@/lib/wallet/address";
import { api } from "../../../convex/_generated/api";

export function LibraryClient() {
  const { address } = useAccount();
  const ownerAddress = normalizeWalletAddress(address);

  const artifacts = useQuery(
    api.directory.listArtifactsByOwner,
    ownerAddress ? { ownerAddress, limit: 50 } : "skip"
  );

  if (!ownerAddress) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Connect a wallet to load your artifacts.</p>
      </Card>
    );
  }

  if (!artifacts) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Loading your artifacts...</p>
      </Card>
    );
  }

  return <ArtifactsLibrary artifacts={artifacts} />;
}
