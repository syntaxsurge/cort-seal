"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, type CreateConnectorFn } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, base, mainnet, optimism, polygon } from "wagmi/chains";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { http, type Transport } from "viem";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!walletConnectProjectId) {
  throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local.");
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local.");
}

const chains = [mainnet, polygon, optimism, arbitrum, base] as const;
const transports: Record<(typeof chains)[number]["id"], Transport> = {
  [mainnet.id]: http(),
  [polygon.id]: http(),
  [optimism.id]: http(),
  [arbitrum.id]: http(),
  [base.id]: http(),
};

function createFallbackConfig() {
  return createConfig({
    chains,
    connectors: [] as CreateConnectorFn[],
    transports,
    multiInjectedProviderDiscovery: false,
    ssr: true,
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [convexClient] = useState(() => new ConvexReactClient(convexUrl!));
  const [wagmiConfig, setWagmiConfig] = useState(() => createFallbackConfig());

  useEffect(() => {
    const config = getDefaultConfig({
      appName: "CortSeal",
      projectId: walletConnectProjectId!,
      chains,
      transports,
      ssr: true,
    });
    setWagmiConfig(config);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ConvexProvider client={convexClient}>{children}</ConvexProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
