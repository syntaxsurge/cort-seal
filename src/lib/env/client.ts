import { z } from "zod";

const clientEnvSchema = z
  .object({
    NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  })
  .strict();

export type ClientEnv = z.infer<typeof clientEnvSchema>;

type ClientEnvResult =
  | { ok: true; env: ClientEnv }
  | { ok: false; error: string };

let cachedClientEnvResult: ClientEnvResult | null = null;

export function getClientEnvResult(): ClientEnvResult {
  if (cachedClientEnvResult) return cachedClientEnvResult;

  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    cachedClientEnvResult = { ok: false, error: issues };
    return cachedClientEnvResult;
  }

  cachedClientEnvResult = { ok: true, env: parsed.data };
  return cachedClientEnvResult;
}

