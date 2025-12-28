import { z } from "zod";

const addressSchema = z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/);

export function normalizeWalletAddress(value: unknown): string | null {
  const parsed = addressSchema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data.toLowerCase();
}
