# CortSeal

CortSeal is a Next.js 15 + Convex app that extracts verifiable claims from draft content, runs redundant Cortensor Router verifier completions to measure agreement (dispersion), and adds a PoUW-style rubric score with evidence bundle exports.

## Prerequisites

- Node.js 20+
- `pnpm`
- A Convex project (via `pnpm convex:dev`)
- A reachable Cortensor Router (Web2 API)

## Local development

1) Install dependencies:

```bash
pnpm install
```

2) Create `.env.local` from `.env.example` and set values.

Generate a strong ingest token (used to prevent direct client writes into Convex):

```bash
openssl rand -hex 32
```

Set the same token in Convex env vars:

```bash
pnpm convex env set CORTSEAL_INGEST_TOKEN "<your-token>"
```

3) Start Convex (Terminal A):

```bash
pnpm convex:dev
```

4) Start Next.js (Terminal B):

```bash
pnpm dev
```

5) Open:

`http://localhost:3000/try`

## Production checks

```bash
pnpm typecheck
pnpm build
```

## Routes

- `/` — landing
- `/try` — submit draft content for claim extraction + redundant verifier runs
- `/try/results/[id]` — view a stored Analysis (claims + consensus/dispersion)
- `/audit` — audit a public URL by extracting claims + verifier runs
- `/validate` — validate a single claim against a URL and mint a shareable seal
- `/directory` — public directory of recent seals (links + badge + embed)
- `/seal/[publicId]` — public seal page (shareable)
- `/embed/[publicId]` — iframe-friendly embed card for a seal
- `/monitors` — schedule RSS audits and router health checks (new feed items mint seals)
- `/share/[id]` — public share page for an Analysis proof bundle
- `/api/validate` — public validator endpoint for `{ url, claim, runs }` (returns result + seal metadata)
- `/api/seals/[publicId]` — download a seal JSON bundle
- `/api/badge/[publicId].svg` — SVG badge for a seal
- `/api/openapi.json` — OpenAPI schema for public endpoints

## Environment variables

See `.env.example` for the full list.
