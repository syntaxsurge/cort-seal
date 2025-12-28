After you finish every task, I want you to give me one line or one sentence GitHub commit message so that I can manually commit all of the changes that you've done using the commit message in just one line or one sentence.

# Agent Playbook (Living Document)

This file is the authoritative reference for platform architecture and agent expectations. It must always describe the current, production-ready state of the system—never legacy behavior. Update this file alongside any material feature change. Only capture structural, user-visible, or integration-impacting details; omit trivia. When we remove/replace something, like a feature, I DO NOT want you to document the removal or replacement here, but instead, if that feature is documented here currently, I want you to just remove it if we done removal and replace it with teh new feature if we did replacement. The reason is that I only want to support latest versions of my application here without documenting the previous iterations, this file should serve as the current machination explanation of my codebase and not for changelogs. If any previous version explanation is present here, then it should be removed. Do not also imply that we just implemented a certain feature here, by using words like "we now have this X feature" since I only want to imply that the features we have iin our application was in here already initially, without any implications of the new changes we made.

## Documentation Expectations

- Update this document whenever routes, flows, data contracts, or integration requirements change.
- Describe the latest behavior succinctly; avoid references to prior implementations.
- Skip minor cosmetic tweaks—limit entries to structural or behavioral updates that affect future engineering work.

## Engineering Principles

1. **Import cleanly, delete legacy.** Never add re‑exports or preserve legacy APIs. Always import from canonical sources and remove unused branches, empty blocks, or deprecated files during every change.

2. **Extend before you create.** Before writing new functions, components, or libraries, analyze existing ones in `src/lib`, shared UI, and feature modules. Check related files for possible extension points—props, return types, or configuration options. Prefer enhancing them by adding parameters or return variants rather than duplicating logic. Only build something new when there’s *no existing code* that can be extended without harm.

3. **Simplify through reuse.** If you or the AI analysis discover that a piece of code can be simplified by calling an existing component, function, or library instead of re‑implementing logic, refactor it. Merge redundant utilities or components when their behavior overlaps and eliminate unnecessary abstractions. The codebase should always converge toward fewer, more capable building blocks.

4. **Be minimal and accessible.** All new pages and components should follow the modern, minimal UI style—clean, responsive, and accessible (ARIA labels, focus states, keyboard navigation, color contrast). Avoid over‑engineering or speculative flexibility.

5. **Type‑sound and consistent.** Run `pnpm typecheck` before merging. Maintain consistent naming, small API surfaces, and clear defaults. Remove unused files and ensure new or extended helpers live in canonical locations to encourage immediate reuse. Also run `pnpm build` after all changes you made and fix all errors before finalizing everything.

### Examples

* Instead of creating `formatDate2`, extend `formatDate` with `options: { locale?: string; format?: string }`.
* Replace custom loaders with an existing `Spinner` component configured via props rather than duplicating markup.
* If two button variants differ only in color and spacing, merge them into one component with configurable variants.
* When adding a new fetch utility, inspect existing APIs—if a related `fetchData` exists, add optional parameters or expand return types instead of building another function.

### Guiding Mindset

Analyze → Extend → Simplify → Delete. Every change should either improve clarity, reduce duplication, or enable reuse. Only create new code when absolutely necessary and back it with clear reasoning in the PR description.

# Next.js 15 App Router Project Structure Guide

You are an AI coding assistant that builds **production-grade, scalable Next.js 15 App Router** applications.

When creating or editing a project, assume this blueprint as the default unless explicitly told otherwise:

- Use **Next.js 15** with the **App Router** under `src/app`.
- Use **TypeScript** everywhere (`.ts`, `.tsx`).
- Use a **`src/`-based layout**: application code under `src`, configuration at the project root.
- Treat components in `app/` as **Server Components by default**; add `"use client"` only when necessary.
- Use **`middleware.ts`** at `src/middleware.ts` to run logic before a request is completed (auth, redirects, rewrites, logging).
- Manage environment variables with **workspace-scoped `.env` files**:
  - Root `.env.local` / `.env.*` for the Next.js app and cross-cutting services.
  - `blockchain/.env` for on-chain tooling (Hardhat/Foundry), with `blockchain/.env.example` as a template.
- Support **at most one off-chain backend stack per project** (or none):
  - **Supabase + Drizzle/Postgres** (SQL stack), or  
  - **Convex** (managed backend stack).
- Optionally support a **blockchain workspace** under `blockchain/`:
  - **Hardhat** *or* **Foundry** as the primary smart-contract tool (choose at most one by default),
  - A shared `blockchain/contracts/` folder as the canonical Solidity source of truth,
  - Optional frontend integration in `src/lib/contracts/`.
- Keep **caching explicit** in Next.js 15:
  - `GET` Route Handlers are **not cached by default**.
  - `fetch` is **`no-store` by default** in many server contexts.
  - Opt into caching via route segment config (`dynamic`, `revalidate`, etc.) and `fetch` options.
  - Centralize caching decisions in a small number of modules instead of scattering them.

Everything below defines **where to place each file**, **what belongs in each folder**, and **how to avoid redundant files**.

---

## 1. Target Project Tree (Baseline Template)

Use this as the **default template**. Extend or trim as needed. Folders marked `# OPTIONAL` are add-ons.

~~~txt
.
├─ public/
│  ├─ favicon.ico
│  ├─ icons/
│  ├─ images/
│  └─ manifest.webmanifest
├─ blockchain/                   # OPTIONAL: smart-contract workspace (only if using blockchain)
│  ├─ .env.example               # Template for blockchain/.env (Hardhat/Foundry secrets)
│  ├─ contracts/                 # Shared Solidity contracts (source of truth)
│  ├─ hardhat/                   # OPTIONAL: choose Hardhat OR Foundry (not both by default)
│  │  ├─ hardhat.config.ts
│  │  ├─ package.json
│  │  ├─ scripts/
│  │  ├─ test/
│  │  ├─ ignition/               # OPTIONAL: Hardhat Ignition modules
│  │  ├─ artifacts/              # generated (usually gitignored)
│  │  └─ cache/                  # generated (usually gitignored)
│  └─ foundry/                   # OPTIONAL: choose Foundry OR Hardhat (not both by default)
│     ├─ foundry.toml
│     ├─ script/
│     ├─ test/
│     ├─ lib/
│     ├─ out/                    # generated (build output, often gitignored)
│     └─ cache/                  # generated (often gitignored)
├─ drizzle/                      # OPTIONAL: Drizzle SQL migrations output
├─ supabase/                     # OPTIONAL: Supabase CLI config + SQL migrations
│  ├─ config.toml
│  └─ migrations/
├─ convex/                       # OPTIONAL: Convex backend (schema + functions)
│  ├─ schema.ts
│  ├─ functions/
│  └─ auth/
├─ scripts/                      # One-off CLIs and dev helpers
│  ├─ convex-dev.cjs             # Starts Convex dev server
│  ├─ disable-sentry.cjs         # Disables Sentry for local/dev builds
│  └─ reset-convex.ts            # Resets Convex tables via admin mutation
├─ infra/                        # IaC: Terraform/Pulumi/Docker/etc.
├─ docs/                         # Architecture docs, ADRs, runbooks
├─ e2e/                          # Playwright/Cypress tests
├─ .github/
│  └─ workflows/                 # CI/CD pipelines
├─ .gitignore                    # Git ignore rules
├─ package.json
├─ next.config.js                # Next.js config
├─ tsconfig.json                 # TypeScript config
├─ postcss.config.js             # PostCSS/Tailwind pipeline
├─ tailwind.config.ts            # Tailwind theme (if used)
├─ .eslintrc.json                # ESLint config
├─ .env.example                  # Documented root env variables (Next.js + services)
├─ next-env.d.ts                 # Generated by Next
└─ src/
   ├─ app/
   │  ├─ (marketing)/            # Marketing / public routes
   │  │  ├─ layout.tsx
   │  │  ├─ page.tsx
   │  │  └─ ...
   │  ├─ (app)/                  # Authenticated workspace routes
   │  │  ├─ layout.tsx
   │  │  ├─ dashboard/
   │  │  │  ├─ page.tsx
   │  │  │  └─ components/
   │  │  └─ settings/
   │  │     ├─ page.tsx
   │  │     └─ components/
   │  ├─ (auth)/                 # Sign-in / sign-up / reset flows
   │  │  ├─ layout.tsx
   │  │  ├─ sign-in/
   │  │  │  └─ page.tsx
   │  │  └─ sign-up/
   │  │     └─ page.tsx
   │  ├─ api/                    # Route Handlers (server-only endpoints)
   │  │  ├─ auth/
   │  │  │  └─ route.ts
   │  │  ├─ webhooks/
   │  │  │  └─ route.ts
   │  │  └─ health/
   │  │     └─ route.ts
   │  ├─ layout.tsx              # Root layout (wraps entire app)
   │  ├─ page.tsx                # "/" route (usually marketing home)
   │  ├─ loading.tsx             # Root loading UI
   │  ├─ error.tsx               # Root segment error boundary
   │  ├─ global-error.tsx        # Global error boundary
   │  ├─ not-found.tsx           # 404 for App Router
   │  ├─ sitemap.ts              # Dynamic sitemap
   │  └─ robots.ts               # Dynamic robots.txt
   ├─ components/                # Cross-route, reusable UI
   │  ├─ ui/                     # Design-system primitives (Button, Input, Dialog)
   │  ├─ layout/                 # Shells, navbars, sidebars, footers
   │  ├─ data-display/           # Charts, tables, cards, lists
   │  ├─ feedback/               # Toasts, alerts, skeletons, spinners
   │  └─ form/                   # Reusable form controls & wrappers
   ├─ features/                  # Vertical domain slices
   │  └─ <feature>/
   │     ├─ components/          # Feature-specific UI (forms, panels, modals)
   │     ├─ hooks/               # Feature hooks
   │     ├─ services/            # Feature data access & orchestration
   │     ├─ state/               # Feature-level stores
   │     ├─ types/               # Feature-only types
   │     └─ tests/               # Feature tests (if not colocated)
   ├─ hooks/                     # Shared hooks reusable across features/routes
   ├─ lib/                       # Framework-agnostic helpers & integrations
   │  ├─ api/                    # Fetch clients, server actions, API SDKs
   │  ├─ auth/                   # Auth/session helpers, guards
   │  ├─ cache/                  # Caching helpers, cache tags
   │  ├─ config/                 # Runtime config builders/constants
   │  ├─ db/                     # Database layer (choose one stack per project)
   │  │  ├─ drizzle/             # Drizzle ORM (if used)
   │  │  │  ├─ schema/           # Drizzle tables & relations
   │  │  │  ├─ client.ts         # Drizzle client factory (server-only)
   │  │  │  └─ migrations.ts     # Helpers for migrations
   │  │  ├─ supabase/            # Supabase client adapters
   │  │  │  ├─ client-server.ts  # SSR/server Supabase client
   │  │  │  ├─ client-browser.ts # Browser Supabase client
   │  │  │  └─ types.ts          # Generated Supabase types
   │  │  └─ convex/              # Convex client adapter (if used)
   │  │     └─ client.ts
   │  ├─ contracts/              # OPTIONAL: frontend smart-contract integration
   │  │  ├─ abi/                 # ABI JSON files imported by the frontend
   │  │  ├─ clients/             # Typed contract clients (viem/wagmi/ethers)
   │  │  └─ addresses.ts         # Chain → contract address mapping
   │  ├─ env/                    # Zod-validated environment variables
   │  ├─ observability/          # Logging, tracing, metrics
   │  ├─ queue/                  # Background job clients
   │  ├─ security/               # Crypto, permissions, rate limiting
   │  ├─ storage/                # File/object storage adapters
   │  ├─ utils/                  # Pure helpers (dates, formatting, ids)
   │  └─ validation/             # Zod/Yup schemas used across app
   ├─ services/                  # Cross-cutting service clients (email, payments)
   ├─ state/                     # Global app-level stores (rare)
   ├─ types/
   │  ├─ domain/                 # Domain model types shared across features
   │  ├─ api/                    # DTOs and API contracts
   │  └─ global.d.ts             # Global type declarations, module shims
   ├─ styles/
   │  ├─ globals.css             # Imported once in app/layout.tsx
   │  ├─ tailwind.css            # Tailwind entry (if applicable)
   │  └─ tokens.css              # CSS tokens (or tokens.ts)
   ├─ content/
   │  ├─ mdx/                    # MD/MDX content (blog, docs, marketing)
   │  └─ locales/                # i18n translation files
   ├─ assets/
   │  ├─ images/                 # Importable images (non-direct URL)
   │  ├─ icons/                  # SVGs, icon sprites
   │  └─ fonts/                  # Self-hosted fonts
   ├─ mocks/
   │  ├─ msw/                    # MSW handlers for dev/tests
   │  ├─ data/                   # Fixture data / factories
   │  └─ handlers.ts             # MSW setup
   ├─ tests/
   │  ├─ setup/                  # Jest/Vitest/Playwright setup
   │  └─ utils/                  # Shared test helpers
   ├─ workers/
   │  ├─ edge/                   # Edge-specific workers/helpers
   │  └─ queue/                  # Background job processors
   ├─ middleware.ts              # Next.js Middleware (runs before routes)
   ├─ instrumentation.ts         # Server-side instrumentation
   └─ instrumentation-client.ts  # Client-side instrumentation
~~~

---

## 2. Placement Rules for New Files and Folders

When adding or modifying code, follow these steps.

### 2.1 Determine the correct layer

1. **Route UI**  
   → `src/app/**`
2. **Shared UI** (reused across routes/features)  
   → `src/components/**`
3. **Feature-specific UI or domain logic**  
   → `src/features/<feature>/**`
4. **Hook**  
   - Feature-specific → `src/features/<feature>/hooks`  
   - Cross-cutting → `src/hooks`
5. **Data access / env / caching / auth / contracts / utilities**  
   - Cross-cutting infra → `src/lib/**`  
   - Domain workflow → `src/features/<feature>/services`
6. **Vendor service client** (payments, email, analytics)  
   → `src/services/**`
7. **Global app state**  
   → `src/state/**` (only if truly global)
8. **Smart-contract code/tooling**  
   - Solidity contracts → `blockchain/contracts`  
   - Hardhat files → `blockchain/hardhat/**`  
   - Foundry files → `blockchain/foundry/**`  
   - Frontend ABIs/addresses/clients → `src/lib/contracts/**`
9. **Environment configuration**  
   - Next.js app + services → root `.env.*` + `src/lib/env/**`  
   - Blockchain tooling → `blockchain/.env` (template: `blockchain/.env.example`)

### 2.2 Prefer extending existing modules over creating new ones

Before creating a new helper or service file:

1. Search existing modules:
   - `src/lib/utils`
   - `src/lib/api`
   - `src/lib/env`
   - `src/lib/db`
   - `src/lib/contracts`
   - `src/features/<feature>/services`
2. If similar behavior exists:
   - Extend the existing module:
     - Add a new function or overload.
     - Add options/parameters.
     - Add code paths that preserve existing behavior by default.
3. Only create new files when:
   - Responsibility is clearly distinct.
   - Extending existing modules would reduce clarity.

### 2.3 Server vs client boundaries

- Do **not** import:
  - `src/lib/db/**`,
  - `src/lib/env/**`,
  - `blockchain/**`  
  in client-only components or hooks.
- Client components may:
  - Call server actions in `src/lib/api`.
  - Use browser-safe clients like `src/lib/db/supabase/client-browser.ts` or contract clients designed for the browser.
- Secrets, DB access, and low-level contract deployment logic must stay in:
  - Server Components.
  - Route handlers.
  - Server actions.
  - Scripts.
  - Feature services invoked from server contexts.

### 2.4 Routing-specific decisions

- Use route groups `(marketing)`, `(app)`, `(auth)` to organize sections.
- Use dynamic segments `[id]` for resource-specific pages.
- Introduce additional route groups as needed (`(admin)`, `(studio)`, etc.).
- Keep URLs stable; refactor internals via groups and feature refactors rather than URL churn.

### 2.5 Caching and performance (Next.js 15)

- Centralize expensive logic in:
  - `src/lib/cache`, `src/lib/db`, or feature services.
- Remember:
  - `GET` Route Handlers are uncached by default.
  - `fetch` defaults to no-store in many server scenarios.
- Opt into caching explicitly using:
  - Route config (`dynamic`, `revalidate`).
  - `fetch` options.
- Avoid copy-pasting caching logic; prefer shared helpers.

### 2.6 Database and services

- For Drizzle+Supabase:
  - Tables and relations in `src/lib/db/drizzle/schema`.
  - Supabase clients in `src/lib/db/supabase`.
  - Domain-specific queries in feature services or DB helper modules.
- For Convex:
  - Schema and functions under `convex/`.
  - Client helpers under `src/lib/db/convex/client.ts`.

Select **one** backend stack (Drizzle+Supabase or Convex) per project by default.

### 2.7 Blockchain workspace (if present)

- Keep all Solidity in `blockchain/contracts`.
- Configure Hardhat/Foundry to read from this shared source directory.
- Use `scripts/` to compile/deploy contracts and keep frontend ABIs/addresses in sync when a blockchain workspace is added.
- Never import from `blockchain/**` in the Next.js runtime; rely on `src/lib/contracts/**`.


**KEEP THE HEADINGS CONTENTS BELOW UPDATED:**


# Platform Summary

CortSeal is a Next.js (App Router) web app that audits creator drafts, public URLs, and monitored RSS feeds by extracting verifiable claims where applicable, running redundant Cortensor Router verifier completions to measure agreement (dispersion / PoI-style disagreement), adding a PoUW-style rubric score, and persisting outputs in Convex as wallet-scoped Analyses/Proofs/Monitors plus shareable public Seals (public IDs, badges, embeds) and immutable Proofs with public share IDs and downloadable bundles.

## Core Commands

- `pnpm dev` — run the Next.js dev server
- `pnpm convex:dev` — run the Convex dev workflow (separate terminal)
- `pnpm typecheck` — TypeScript typecheck
- `pnpm build` — production build (includes lint + type validation)
- `pnpm lint` — ESLint

## Route Inventory

- `/` — landing page
- `/try` — submit draft content; extracts claims, runs redundant verifier checks, and stores an Analysis
- `/try/results/[id]` — render a stored Analysis result by ID (claim table + consensus/dispersion + proof link generator)
- `/audit` — audit a public URL; fetches readable text, extracts claims, runs redundant validators, and stores an Analysis
- `/audit/results/[id]` — render a stored URL audit result by ID (claims + dispersion + evidence quotes + proof link generator)
- `/validate` — validate a single claim against a public URL and mint a shareable Seal
- `/directory` — public seal directory with share pages, badges, and embeds
- `/library` — private artifact library for the connected wallet (analyses, proofs, seals, monitors)
- `/monitors` — list and manage RSS/router monitors (creates scheduled checks + seal artifacts)
- `/monitors/new` — create a new monitor
- `/monitors/[id]` — monitor detail page (recent seals + run history)
- `/seal/[publicId]` — public seal page (verdict + evidence)
- `/embed/[publicId]` — iframe-friendly embed card for a seal
- `/share/[id]` — public share page for a stored Proof bundle (claims + rubric + deterministic checks)
- `/api/analyses/[id]/evidence` — download an Analysis evidence bundle JSON (raw analysis snapshot)
- `/api/analyses/[id]/proof` — generate (or fetch) a public Proof for an Analysis
- `/api/seals/[publicId]` — download a Seal bundle JSON
- `/api/badge/[publicId].svg` — SVG badge for a Seal
- `/api/proofs/[id]` — download an immutable Proof bundle JSON
- `/api/validate` — public validator endpoint for `{ url, claim, runs }` (returns `cortseal:validate:v1` plus minted Seal metadata)
- `/api/openapi.json` — OpenAPI schema for public endpoints

## Architecture Overview

- `src/app/**` holds routes; `/try` uses a server action (`src/app/try/actions.ts`) to run a claim check pipeline and store results.
- `/audit` uses a server action (`src/app/audit/actions.ts`) to fetch a URL, run a source-backed validator pipeline, and store results.
- Cortensor Router client lives in `src/lib/cortensor/client.ts` and uses validated env from `src/lib/env/server.ts`.
- Cortensor completions are normalized into JSON-safe payloads in `src/features/cortseal/services/cortensorRuntime.ts` (handles code fences, smart quotes, trailing commas, unquoted keys, and nested `output`/`result` envelopes) before Zod validation.
- Claim extraction + redundant verifier orchestration + rubric scoring lives in `src/features/cortseal/services/claimCheck.ts` and stores a Zod-validated result (`src/features/cortseal/schemas.ts`) under `analyses.result` with `kind: "cortseal:claimcheck:v1"`.
- Rubric and verifier schema parsing in `src/features/cortseal/schemas.ts` normalizes percent, fraction, and 0-1 numeric strings into the expected score ranges.
- Source audits live in `src/features/cortseal/services/sourceAudit.ts` and store `kind: "cortseal:sourceaudit:v1"` under `analyses.result`.
- The public validator endpoint lives in `src/app/api/validate/route.ts`, applies Convex-backed rate limiting (`convex/rateLimit.ts`), returns `kind: "cortseal:validate:v1"`, and mints a shareable Seal in Convex via `convex/seals.ts`.
- URL ingestion utilities live in `src/lib/security/safeUrl.ts` (SSRF guard) and `src/lib/fetchers/readableText.ts` (HTML → readable text).
- Evidence bundle generation lives in `src/features/cortseal/services/evidence.ts` and is exposed via `src/app/api/analyses/[id]/evidence/route.ts`.
- Proof bundle generation lives in `src/features/cortseal/services/proofs.ts` (wraps evidence + deterministic checks) and is exposed via `src/app/api/analyses/[id]/proof/route.ts`, `src/app/api/proofs/[id]/route.ts`, and `src/app/share/[id]/page.tsx`.
- Monitor scheduling runs in Convex via `convex/crons.ts` and `convex/monitors.ts` (RSS ingestion + router health checks + optional Discord alerts) and stores run history in `monitorRuns` plus seal artifacts in `seals`.
- Seal rendering and downloads use `src/app/monitors/**`, `src/app/seal/[publicId]/page.tsx`, `src/app/embed/[publicId]/page.tsx`, `src/app/api/seals/[publicId]/route.ts`, `src/app/api/badge/[publicId].svg/route.ts`, plus data access helpers in `src/features/cortseal/services/monitors.ts` and `src/features/cortseal/services/seals.ts`.
- Wallet identity uses RainbowKit + wagmi providers in `src/app/providers.tsx`, and authenticated UI gating lives in `src/components/auth/RequireWallet.tsx` with wallet capture via hidden inputs.
- The private library in `/library` aggregates analyses, proofs, seals, and monitors for the connected wallet via `convex/directory.ts`.
- Convex data model lives in `convex/schema.ts`; mutations/queries live in `convex/analyses.ts`, `convex/proofs.ts`, `convex/monitors.ts`, `convex/seals.ts`, `convex/directory.ts`, and `convex/rateLimit.ts`, with ownerAddress stored on analysis/proof/monitor/seal records.
- Next.js server code talks to Convex via `src/lib/db/convex/httpClient.ts` (HTTP client using `NEXT_PUBLIC_CONVEX_URL`).
- Shared UI primitives are provided by `shadcn/ui` in `src/components/ui/**`.
