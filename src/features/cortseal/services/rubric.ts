import "server-only";

import type { ClaimVerification, RubricRun, RubricSummary } from "@/features/cortseal/schemas";

export function normalizeRubricJson(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;

  const obj = value as Record<string, unknown>;
  const categoriesRaw = obj.categories;

  if (typeof categoriesRaw !== "object" || categoriesRaw === null) {
    const factuality = obj.factuality;
    const compliance = obj.compliance;
    const brandSafety = obj.brandSafety ?? obj.brand_safety;
    const clarity = obj.clarity;

    if (
      factuality !== undefined ||
      compliance !== undefined ||
      brandSafety !== undefined ||
      clarity !== undefined
    ) {
      return {
        ...obj,
        categories: {
          factuality,
          compliance,
          brandSafety,
          clarity,
        },
      };
    }

    return obj;
  }

  const categories = { ...(categoriesRaw as Record<string, unknown>) };

  if (categories.brandSafety === undefined) {
    const brandSafety = categories.brand_safety ?? categories.brandsafety;
    if (brandSafety !== undefined) {
      categories.brandSafety = brandSafety;
    }
  }

  return {
    ...obj,
    categories,
  };
}

export function buildRubricPrompt(content: string, claims: ClaimVerification[]): string {
  const claimPreview = claims
    .slice(0, 18)
    .map((claim) => {
      const verdict = claim.summary.consensusVerdict;
      const confidence = claim.summary.consensusConfidence.toFixed(2);
      return `- ${claim.claim} (verdict: ${verdict}, confidence: ${confidence})`;
    })
    .join("\n");

  return [
    "You are a scoring judge for creator content risk and quality.",
    "Return ONLY valid JSON (no markdown, no code fences, no commentary).",
    'Schema: {"overall":0-100,"categories":{"factuality":0-100,"compliance":0-100,"brandSafety":0-100,"clarity":0-100},"summary":"string","issues":["string"],"recommendations":["string"]}',
    "Scoring guidance:",
    "- Higher is better. Start at 100 and subtract for issues and uncertainty.",
    '- Factuality: penalize unverifiable, too-specific, or likely-false claims.',
    "- Compliance: penalize missing disclosure (#ad / paid partnership), medical/financial advice, or risky promises.",
    "- BrandSafety: penalize hate/harassment, adult content, violence, scams, illegal activity, or unsafe instructions.",
    "- Clarity: penalize confusing or misleading wording; reward clear disclaimers and specificity.",
    "Rules:",
    "- Do not invent citations or pretend to have checked external sources.",
    "- issues/recommendations must be concrete and actionable (max 12 each).",
    "",
    "CONTENT:",
    content,
    "",
    "CLAIMS (with redundant verifier consensus):",
    claimPreview || "(none)",
  ].join("\n");
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function summarizeRubricRuns(runs: RubricRun[]): RubricSummary {
  const okRuns = runs.filter((run) => run.ok && run.parsed);
  const meanOverall = mean(okRuns.map((run) => run.parsed!.overall));
  const stdevOverall = stdev(okRuns.map((run) => run.parsed!.overall));
  const dispersion = okRuns.length === 0 ? 1 : Math.min(1, stdevOverall / 25);

  const meanScores = {
    overall: meanOverall,
    factuality: mean(okRuns.map((run) => run.parsed!.categories.factuality)),
    compliance: mean(okRuns.map((run) => run.parsed!.categories.compliance)),
    brandSafety: mean(okRuns.map((run) => run.parsed!.categories.brandSafety)),
    clarity: mean(okRuns.map((run) => run.parsed!.categories.clarity)),
  };

  const selectedRun =
    okRuns.length === 0
      ? null
      : okRuns.reduce((best, candidate) => {
          const bestDistance = Math.abs(best.parsed!.overall - meanOverall);
          const candidateDistance = Math.abs(candidate.parsed!.overall - meanOverall);

          if (candidateDistance < bestDistance) return candidate;
          if (candidateDistance === bestDistance && candidate.runIndex < best.runIndex) {
            return candidate;
          }
          return best;
        });

  return {
    okRuns: okRuns.length,
    meanScores,
    stdevOverall,
    dispersion,
    selectedRunIndex: selectedRun?.runIndex ?? null,
    selected: selectedRun?.parsed ?? null,
  };
}

