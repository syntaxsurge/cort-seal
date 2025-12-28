export type DirectoryArtifacts = {
  analyses: Array<{
    id: string;
    createdAt: number;
    status: "completed" | "error";
    resultKind: string | null;
    analysisType: "try" | "audit";
    promptPreview: string;
  }>;
  proofs: Array<{
    id: string;
    createdAt: number;
    publicId: string;
    analysisId: string;
    bundleHashSha256: string;
    bundleBytes: number;
  }>;
  seals: Array<{
    id: string;
    createdAt: number;
    publicId: string;
    verdict: "pass" | "warn" | "fail" | "unknown";
    confidence: number;
    claim?: string | null;
    sourceTitle?: string | null;
    sourceUrl?: string | null;
  }>;
  monitors: Array<{
    id: string;
    createdAt: number;
    name: string;
    kind: "rss" | "router";
    enabled: boolean;
    feedUrl?: string | null;
    routerBaseUrl?: string | null;
  }>;
};
