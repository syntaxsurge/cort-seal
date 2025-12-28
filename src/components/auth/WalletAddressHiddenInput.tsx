"use client";

import { useAccount } from "wagmi";

import { normalizeWalletAddress } from "@/lib/wallet/address";

export function WalletAddressHiddenInput({ name = "ownerAddress" }: { name?: string }) {
  const { address } = useAccount();
  const normalized = normalizeWalletAddress(address);

  return <input type="hidden" name={name} value={normalized ?? ""} />;
}
