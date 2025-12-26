import "server-only";

import { z } from "zod";

const serverEnvSchema = z
  .object({
    CORTENSOR_ROUTER_URL: z.string().url(),
    CORTENSOR_API_KEY: z.string().min(1),
    CORTENSOR_SESSION_ID: z.coerce.number().int().nonnegative().default(0),
    CORTENSOR_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(60),
    CORTSEAL_INGEST_TOKEN: z.string().min(16).optional(),
    CORTSEAL_MAX_CLAIMS: z.coerce.number().int().positive().max(50).default(12),
    CORTSEAL_VERIFIER_RUNS_PER_CLAIM: z.coerce.number().int().positive().max(10).default(3),
    CORTSEAL_VERIFIER_CONCURRENCY: z.coerce.number().int().positive().max(10).default(3),
    CORTSEAL_RUBRIC_RUNS: z.coerce.number().int().positive().max(10).default(3),
    CORTSEAL_RUBRIC_CONCURRENCY: z.coerce.number().int().positive().max(10).default(2),
    CORTSEAL_PROOF_MAX_BYTES: z.coerce.number().int().positive().max(950_000).default(900_000),
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid server environment variables:\n${issues}`);
  }

  cachedServerEnv = parsed.data;
  return parsed.data;
}
