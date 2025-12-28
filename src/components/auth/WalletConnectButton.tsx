"use client";

import { ConnectButton, useChainModal } from "@rainbow-me/rainbowkit";
import { useAccount, useChains } from "wagmi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WalletConnectButtonProps = {
  className?: string;
  showChain?: boolean;
};

export function WalletConnectButton({ className, showChain = true }: WalletConnectButtonProps) {
  const { isConnected, chainId } = useAccount();
  const chains = useChains();
  const { openChainModal } = useChainModal();
  const activeChain = chains.find((chain) => chain.id === chainId);
  const isSupported = Boolean(activeChain);
  const shouldShowChain = showChain && isConnected && (isSupported || chainId !== undefined);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {shouldShowChain ? (
        <Button
          type="button"
          variant={isSupported ? "outline" : "destructive"}
          size="sm"
          onClick={openChainModal}
        >
          {isSupported ? activeChain?.name : "Wrong network"}
        </Button>
      ) : null}
      <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
    </div>
  );
}
