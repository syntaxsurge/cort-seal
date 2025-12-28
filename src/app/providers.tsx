"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, createConnector, type CreateConnectorFn } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  baseAccount,
  metaMaskWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { arbitrumSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { http, type EIP1193Provider, type Transport } from "viem";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!walletConnectProjectId) {
  throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local.");
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local.");
}

const chains = [arbitrumSepolia] as const;
const transports: Record<(typeof chains)[number]["id"], Transport> = {
  [arbitrumSepolia.id]: http(),
};

type EthereumProvider = EIP1193Provider & {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  _events?: unknown;
  _state?: unknown;
  isApexWallet?: boolean;
  isAvalanche?: boolean;
  isBackpack?: boolean;
  isBifrost?: boolean;
  isBinance?: boolean;
  isBitKeep?: boolean;
  isBitski?: boolean;
  isBlockWallet?: boolean;
  isBraveWallet?: boolean;
  isCoin98?: boolean;
  isCoinbaseWallet?: boolean;
  isCTRL?: boolean;
  isDawn?: boolean;
  isEnkrypt?: boolean;
  isExodus?: boolean;
  isFrame?: boolean;
  isFrontier?: boolean;
  isGamestop?: boolean;
  isHyperPay?: boolean;
  isImToken?: boolean;
  isKuCoinWallet?: boolean;
  isMathWallet?: boolean;
  isMEWwallet?: boolean;
  isNestWallet?: boolean;
  isOKExWallet?: boolean;
  isOkxWallet?: boolean;
  isOneInchAndroidWallet?: boolean;
  isOneInchIOSWallet?: boolean;
  isOpera?: boolean;
  isPhantom?: boolean;
  isPortal?: boolean;
  isRainbow?: boolean;
  isRabby?: boolean;
  isSafeheron?: boolean;
  isSafePal?: boolean;
  isStatus?: boolean;
  isTalisman?: boolean;
  isTally?: boolean;
  isTokenary?: boolean;
  isTokenPocket?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isUniswapWallet?: boolean;
  isWigwam?: boolean;
  isZeal?: boolean;
  isZerion?: boolean;
  isZilPay?: boolean;
  __seif?: boolean;
};

function isMetaMaskProvider(provider?: EthereumProvider): boolean {
  if (!provider?.isMetaMask) return false;
  if (provider.isBraveWallet && !provider._events && !provider._state) return false;
  const flags: Array<keyof EthereumProvider> = [
    "isApexWallet",
    "isAvalanche",
    "isBitKeep",
    "isBlockWallet",
    "isKuCoinWallet",
    "isMathWallet",
    "isOkxWallet",
    "isOKExWallet",
    "isOneInchIOSWallet",
    "isOneInchAndroidWallet",
    "isOpera",
    "isPhantom",
    "isPortal",
    "isRabby",
    "isTokenPocket",
    "isTokenary",
    "isUniswapWallet",
    "isZerion",
  ];
  return flags.every((flag) => !provider[flag]);
}

function getMetaMaskProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  if (!ethereum) return undefined;
  const providers: EthereumProvider[] = Array.isArray(ethereum.providers)
    ? ethereum.providers
    : [];
  const candidates = providers.length ? providers : [ethereum];
  return candidates.find((provider) => isMetaMaskProvider(provider));
}

const metaMaskInjectedWallet = (params: Parameters<typeof metaMaskWallet>[0]) => {
  const baseWallet = metaMaskWallet(params);
  const isMetaMaskInstalled = typeof window !== "undefined" ? Boolean(getMetaMaskProvider()) : false;
  return {
    ...baseWallet,
    installed: isMetaMaskInstalled ? true : baseWallet.installed,
    createConnector: (walletDetails: Parameters<typeof baseWallet.createConnector>[0]) => {
      return createConnector((config) => ({
        ...injected({ target: "metaMask", unstable_shimAsyncInject: true })(config),
        ...walletDetails,
      }));
    },
  };
};

const walletList = [
  {
    groupName: "Popular",
    wallets: [safeWallet, rainbowWallet, baseAccount, metaMaskInjectedWallet, walletConnectWallet],
  },
];

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
      wallets: walletList,
      multiInjectedProviderDiscovery: true,
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
