import "server-only";

import type {
  ClaimVerdict,
  ClaimVerificationSummary,
  VerifierRun,
} from "@/features/cortseal/schemas";

export function summarizeClaimRuns(runs: VerifierRun[]): ClaimVerificationSummary {
  const okRuns = runs.filter((run) => run.ok && run.parsed);
  const verdictCounts = { supported: 0, unsupported: 0, unclear: 0 };

  for (const run of okRuns) {
    verdictCounts[run.parsed!.verdict] += 1;
  }

  const okRunCount = okRuns.length;
  const maxCount = Math.max(
    verdictCounts.supported,
    verdictCounts.unsupported,
    verdictCounts.unclear
  );

  const candidates = (Object.keys(verdictCounts) as ClaimVerdict[]).filter(
    (verdict) => verdictCounts[verdict] === maxCount
  );

  let consensusVerdict: ClaimVerdict = "unclear";

  if (okRunCount === 0) {
    consensusVerdict = "unclear";
  } else if (candidates.length === 1) {
    consensusVerdict = candidates[0]!;
  } else if (candidates.includes("unclear")) {
    consensusVerdict = "unclear";
  } else {
    const avgConfidence = (verdict: ClaimVerdict) => {
      const matching = okRuns.filter((run) => run.parsed!.verdict === verdict);
      if (matching.length === 0) return 0;
      const sum = matching.reduce((acc, run) => acc + run.parsed!.confidence, 0);
      return sum / matching.length;
    };

    const supportedAvg = avgConfidence("supported");
    const unsupportedAvg = avgConfidence("unsupported");

    if (supportedAvg === unsupportedAvg) {
      consensusVerdict = "unclear";
    } else {
      consensusVerdict = supportedAvg > unsupportedAvg ? "supported" : "unsupported";
    }
  }

  const consensusRuns = okRuns.filter((run) => run.parsed!.verdict === consensusVerdict);
  const consensusConfidence =
    consensusRuns.length === 0
      ? 0
      : consensusRuns.reduce((acc, run) => acc + run.parsed!.confidence, 0) / consensusRuns.length;

  const dispersion = okRunCount === 0 ? 1 : 1 - maxCount / okRunCount;

  return {
    okRuns: okRunCount,
    verdictCounts,
    consensusVerdict,
    consensusConfidence,
    dispersion,
  };
}

