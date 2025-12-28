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
  isWigwam?: boolean;
  isZeal?: boolean;
  isZerion?: boolean;
  isZilPay?: boolean;
  __seif?: boolean;
};

function isMetaMaskProvider(ethereum?: EthereumProvider): boolean {
  if (!ethereum?.isMetaMask) return false;
  if (ethereum.isBraveWallet && !ethereum._events && !ethereum._state) return false;
  if (ethereum.isApexWallet) return false;
  if (ethereum.isAvalanche) return false;
  if (ethereum.isBackpack) return false;
  if (ethereum.isBifrost) return false;
  if (ethereum.isBitKeep) return false;
  if (ethereum.isBitski) return false;
  if (ethereum.isBinance) return false;
  if (ethereum.isBlockWallet) return false;
  if (ethereum.isCoinbaseWallet) return false;
  if (ethereum.isDawn) return false;
  if (ethereum.isEnkrypt) return false;
  if (ethereum.isExodus) return false;
  if (ethereum.isFrame) return false;
  if (ethereum.isFrontier) return false;
  if (ethereum.isGamestop) return false;
  if (ethereum.isHyperPay) return false;
  if (ethereum.isImToken) return false;
  if (ethereum.isKuCoinWallet) return false;
  if (ethereum.isMathWallet) return false;
  if (ethereum.isNestWallet) return false;
  if (ethereum.isOkxWallet || ethereum.isOKExWallet) return false;
  if (ethereum.isOneInchIOSWallet || ethereum.isOneInchAndroidWallet) return false;
  if (ethereum.isOpera) return false;
  if (ethereum.isPhantom) return false;
  if (ethereum.isZilPay) return false;
  if (ethereum.isPortal) return false;
  if (ethereum.isRabby) return false;
  if (ethereum.isRainbow) return false;
  if (ethereum.isStatus) return false;
  if (ethereum.isTalisman) return false;
  if (ethereum.isTally) return false;
  if (ethereum.isTokenPocket) return false;
  if (ethereum.isTokenary) return false;
  if (ethereum.isTrust || ethereum.isTrustWallet) return false;
  if (ethereum.isCTRL) return false;
  if (ethereum.isZeal) return false;
  if (ethereum.isCoin98) return false;
  if (ethereum.isMEWwallet) return false;
  if (ethereum.isSafeheron) return false;
  if (ethereum.isSafePal) return false;
  if (ethereum.isWigwam) return false;
  if (ethereum.isZerion) return false;
  if (ethereum.__seif) return false;
  return true;
}

function getMetaMaskProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  if (!ethereum) return undefined;
  if (isMetaMaskProvider(ethereum)) return ethereum;
  const providers: EthereumProvider[] = Array.isArray(ethereum.providers)
    ? ethereum.providers
    : [];
  return providers.find((provider) => isMetaMaskProvider(provider));
}

const metaMaskInjectedWallet = (params: Parameters<typeof metaMaskWallet>[0]) => {
  const baseWallet = metaMaskWallet(params);
  return {
    ...baseWallet,
    installed: typeof window !== "undefined" ? Boolean(getMetaMaskProvider()) : baseWallet.installed,
    createConnector: (walletDetails: Parameters<typeof baseWallet.createConnector>[0]) => {
      const hasMetaMask = Boolean(getMetaMaskProvider());
      if (!hasMetaMask) {
        return baseWallet.createConnector(walletDetails);
      }
      return createConnector((config) => ({
        ...injected({ target: "metaMask" })(config),
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
