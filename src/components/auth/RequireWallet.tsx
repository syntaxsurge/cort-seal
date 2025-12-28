"use client";

import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { Card } from "@/components/ui/card";

export function RequireWallet({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <Card className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Connect your wallet to continue
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              CortSeal uses wallet identity to keep analyses, seals, and monitors scoped to you.
            </p>
          </div>
          <ConnectButton />
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
