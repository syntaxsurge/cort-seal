import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

const convexUrlSchema = z.string().url();

let cachedClient: ConvexHttpClient | null = null;

export function getConvexHttpClient(): ConvexHttpClient {
  if (cachedClient) return cachedClient;

  const parsed = convexUrlSchema.safeParse(process.env.NEXT_PUBLIC_CONVEX_URL);
  if (!parsed.success) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is missing or invalid. Set it in `.env.local` (and keep `.env.example` updated)."
    );
  }

  cachedClient = new ConvexHttpClient(parsed.data);
  return cachedClient;
}

