import { z } from "zod";

export const claimVerdictSchema = z.union([
  z.literal("supported"),
  z.literal("unsupported"),
  z.literal("unclear"),
]);

export type ClaimVerdict = z.infer<typeof claimVerdictSchema>;

const confidenceSchema = z.preprocess((value) => {
  let numeric = value;

  if (typeof numeric === "string") {
    const parsed = Number(numeric);
    numeric = Number.isFinite(parsed) ? parsed : numeric;
  }

  if (typeof numeric !== "number" || !Number.isFinite(numeric)) return numeric;

  let normalized = numeric;
  if (normalized > 1 && normalized <= 100) normalized = normalized / 100;

  return Math.max(0, Math.min(1, normalized));
}, z.number().min(0).max(1));

const scoreSchema = z.preprocess((value) => {
  let numeric = value;

  if (typeof numeric === "string") {
    const parsed = Number(numeric);
    numeric = Number.isFinite(parsed) ? parsed : numeric;
  }

  if (typeof numeric !== "number" || !Number.isFinite(numeric)) return numeric;

  let normalized = numeric;

  if (normalized >= 0 && normalized <= 1) {
    normalized = normalized * 100;
  }

  return Math.max(0, Math.min(100, normalized));
}, z.number().min(0).max(100));

const stdevSchema = z.number().min(0).max(100);

export const claimSchema = z.object({
  claim: z.string().trim().min(1).max(500),
});

export type Claim = z.infer<typeof claimSchema>;

export const rubricCategoriesSchema = z.object({
  factuality: scoreSchema,
  compliance: scoreSchema,
  brandSafety: scoreSchema,
  clarity: scoreSchema,
});

export type RubricCategories = z.infer<typeof rubricCategoriesSchema>;

export const rubricParsedSchema = z
  .object({
    overall: scoreSchema,
    categories: rubricCategoriesSchema,
    summary: z.string().trim().min(1).max(800),
    issues: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
    recommendations: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
  })
  .passthrough();

export type RubricParsed = z.infer<typeof rubricParsedSchema>;

export const verificationParsedSchema = z
  .object({
    verdict: claimVerdictSchema,
    confidence: confidenceSchema,
    score: z.preprocess((value) => {
      let numeric = value;

      if (typeof numeric === "string") {
        const parsed = Number(numeric);
        numeric = Number.isFinite(parsed) ? parsed : numeric;
      }

      if (typeof numeric !== "number" || !Number.isFinite(numeric)) return numeric;

      return Math.max(0, Math.min(10, numeric));
    }, z.number().min(0).max(10)).optional(),
    rationale: z.string().trim().min(1).max(2000),
    evidence: z
      .array(z.string().trim().min(1).max(400))
      .max(5)
      .default([]),
  })
  .passthrough();

export type VerificationParsed = z.infer<typeof verificationParsedSchema>;

export const verifierRunSchema = z.object({
  runIndex: z.number().int().nonnegative(),
  ok: z.boolean(),
  durationMs: z.number().nonnegative(),
  rawText: z.string().optional(),
  error: z.string().optional(),
  parsed: verificationParsedSchema.optional(),
});

export type VerifierRun = z.infer<typeof verifierRunSchema>;

export const rubricRunSchema = z.object({
  runIndex: z.number().int().nonnegative(),
  ok: z.boolean(),
  durationMs: z.number().nonnegative(),
  rawText: z.string().optional(),
  error: z.string().optional(),
  parsed: rubricParsedSchema.optional(),
});

export type RubricRun = z.infer<typeof rubricRunSchema>;

export const rubricMeanScoresSchema = z.object({
  overall: scoreSchema,
  factuality: scoreSchema,
  compliance: scoreSchema,
  brandSafety: scoreSchema,
  clarity: scoreSchema,
});

export type RubricMeanScores = z.infer<typeof rubricMeanScoresSchema>;

export const rubricSummarySchema = z.object({
  okRuns: z.number().int().nonnegative(),
  meanScores: rubricMeanScoresSchema,
  stdevOverall: stdevSchema,
  dispersion: z.number().min(0).max(1),
  selectedRunIndex: z.number().int().nonnegative().nullable(),
  selected: rubricParsedSchema.nullable(),
});

export type RubricSummary = z.infer<typeof rubricSummarySchema>;

export const verdictCountsSchema = z.object({
  supported: z.number().int().nonnegative(),
  unsupported: z.number().int().nonnegative(),
  unclear: z.number().int().nonnegative(),
});

export type VerdictCounts = z.infer<typeof verdictCountsSchema>;

export const claimVerificationSummarySchema = z.object({
  okRuns: z.number().int().nonnegative(),
  verdictCounts: verdictCountsSchema,
  consensusVerdict: claimVerdictSchema,
  consensusConfidence: z.number().min(0).max(1),
  dispersion: z.number().min(0).max(1),
});

export type ClaimVerificationSummary = z.infer<typeof claimVerificationSummarySchema>;

export const claimVerificationSchema = z.object({
  claim: z.string(),
  runs: z.array(verifierRunSchema),
  summary: claimVerificationSummarySchema,
});

export type ClaimVerification = z.infer<typeof claimVerificationSchema>;

export const cortsealClaimCheckResultSchema = z.object({
  kind: z.literal("cortseal:claimcheck:v1"),
  config: z.object({
    maxClaims: z.number().int().positive(),
    runsPerClaim: z.number().int().positive(),
    verifierConcurrency: z.number().int().positive(),
  }),
  extraction: z.object({
    durationMs: z.number().nonnegative(),
    rawText: z.string().optional(),
    claims: z.array(claimSchema),
  }),
  verification: z.object({
    durationMs: z.number().nonnegative(),
    claims: z.array(claimVerificationSchema),
  }),
  rubric: z
    .object({
      durationMs: z.number().nonnegative(),
      config: z.object({
        runs: z.number().int().positive(),
        concurrency: z.number().int().positive(),
      }),
      runs: z.array(rubricRunSchema),
      summary: rubricSummarySchema,
    })
    .optional(),
  summary: z.object({
    claimCount: z.number().int().nonnegative(),
    okRunCount: z.number().int().nonnegative(),
    avgDispersion: z.number().min(0).max(1),
  }),
});

export type CortsealClaimCheckResult = z.infer<typeof cortsealClaimCheckResultSchema>;

const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/i);

export const sourceAuditClaimSchema = z.object({
  claim: z.string().trim().min(10).max(500),
  quote: z.string().trim().min(5).max(800),
});

export type SourceAuditClaim = z.infer<typeof sourceAuditClaimSchema>;

export const sourceAuditClaimSummarySchema = claimVerificationSummarySchema.extend({
  meanRationaleCosine: z.number().min(0).max(1),
  poiDisagreement: z.number().min(0).max(1),
  averageScore: z.number().min(0).max(10),
  divergent: z.boolean(),
});

export type SourceAuditClaimSummary = z.infer<typeof sourceAuditClaimSummarySchema>;

export const sourceAuditClaimVerificationSchema = z.object({
  claim: z.string(),
  quote: z.string(),
  excerpt: z.string().trim().min(1).max(4000),
  runs: z.array(verifierRunSchema),
  summary: sourceAuditClaimSummarySchema,
});

export type SourceAuditClaimVerification = z.infer<typeof sourceAuditClaimVerificationSchema>;

export const cortsealSourceAuditResultSchema = z.object({
  kind: z.literal("cortseal:sourceaudit:v1"),
  config: z.object({
    maxClaims: z.number().int().positive(),
    runsPerClaim: z.number().int().positive(),
    verifierConcurrency: z.number().int().positive(),
  }),
  source: z.object({
    url: z.string().url(),
    title: z.string().trim().min(1).max(300),
    fetchedAt: z.number().nonnegative(),
    textSha256: sha256HexSchema,
  }),
  extraction: z.object({
    durationMs: z.number().nonnegative(),
    rawText: z.string().optional(),
    claims: z.array(sourceAuditClaimSchema),
  }),
  verification: z.object({
    durationMs: z.number().nonnegative(),
    claims: z.array(sourceAuditClaimVerificationSchema),
  }),
  rubric: z
    .object({
      durationMs: z.number().nonnegative(),
      config: z.object({
        runs: z.number().int().positive(),
        concurrency: z.number().int().positive(),
      }),
      runs: z.array(rubricRunSchema),
      summary: rubricSummarySchema,
    })
    .optional(),
  summary: z.object({
    claimCount: z.number().int().nonnegative(),
    okRunCount: z.number().int().nonnegative(),
    avgDispersion: z.number().min(0).max(1),
    avgMeanRationaleCosine: z.number().min(0).max(1),
    averageScore: z.number().min(0).max(10),
    divergentClaimCount: z.number().int().nonnegative(),
  }),
});

export type CortsealSourceAuditResult = z.infer<typeof cortsealSourceAuditResultSchema>;

export const cortsealValidateResultSchema = z.object({
  kind: z.literal("cortseal:validate:v1"),
  createdAt: z.number().nonnegative(),
  source: z.object({
    url: z.string().url(),
    title: z.string().trim().min(1).max(300),
    fetchedAt: z.number().nonnegative(),
    textSha256: sha256HexSchema,
  }),
  claim: z.string().trim().min(1).max(500),
  excerpt: z.string().trim().min(1).max(4000),
  runs: z.array(verifierRunSchema),
  summary: sourceAuditClaimSummarySchema,
});

export type CortsealValidateResult = z.infer<typeof cortsealValidateResultSchema>;
