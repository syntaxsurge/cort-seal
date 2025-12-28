Project: CortSeal  
One-liner: CortSeal turns creator content into shareable trust seals by verifying extracted claims with Cortensor’s redundant decentralized inference and exporting evidence bundles.

## 1. Boot the full local stack (Convex + Cortensor Router + CortSeal)
- **URL:** (Terminal — project root)
- **Shot:** 4 terminal tabs: Convex dev logs, IPFS daemon logs, Cortensor Router logs, Next.js dev server logs; you can see `http://localhost:3000` and Router `/api/v1/status` returning 200.
- **Steps:**
  1. **Current page:** Terminal Tab A (repo root) — confirm your prompt shows you’re in the `cort-seal` folder.
  2. **Action:** Run `pnpm convex:dev` — wait for a “functions ready” / “dev server running” confirmation in the logs.
  3. **Current page:** Terminal Tab B — confirm you’re at a shell prompt.
  4. **Action:** Run `ipfs daemon` — wait for “Daemon is ready”.
  5. **Current page:** Terminal Tab C — confirm you’re at a shell prompt.
  6. **Action:** Run `cortensord ~/.cortensor/.env routerv1` — wait until logs show it’s listening on `127.0.0.1:5010`.
  7. **Current page:** Terminal Tab D (repo root) — confirm your prompt shows `cort-seal`.
  8. **Action:** Run `pnpm dev` — wait for “Local: http://localhost:3000”.
  9. **Current page:** Terminal Tab C (Router) — run `curl -i http://127.0.0.1:5010/api/v1/status -H "Authorization: Bearer $CORTENSOR_API_KEY"` — wait for `HTTP/1.1 200`.
  10. **Verify on-screen:** You can see (a) Convex dev running, (b) IPFS daemon ready, (c) Router status is 200, and (d) Next.js is live on `http://localhost:3000`.
- **Voiceover:**
  > “To demo CortSeal end-to-end, I’m booting the whole local stack: Convex for persistence and background jobs, IPFS for evidence bundles, and the Cortensor Router for decentralized inference. The key check is Next.js running on localhost — that means the app is ready.”

## 2. Show the existing Cortensor session used by CortSeal (Session #173)
- **URL:** https://dashboard-testnet0.cortensor.network
- **Shot:** Cortensor Dashboard in the browser: top tabs `Network Task / User Task / Stats / Node`, with `User Task` selected; the session details page shows “Session #173 Details”.
- **Steps:**
  1. **Current page:** Cortensor Dashboard — confirm you see “CORTENSOR DASHBOARD” in the header and your wallet address badge (e.g., `0x7C…7688`) in the top-right.
  2. **Navigate:** Click “User Task” in the top navigation → confirm you see buttons including “List Sessions” and “Network Status”.
  3. **Current page:** User Task view — confirm the search input shows placeholder text “Enter session ID to lookup”.
  4. **Action:** Click inside the “Enter session ID to lookup” field.
  5. **Enter values:**
     - Enter session ID to lookup = `173`
  6. **Action:** Press Enter — wait for the session detail view to load.
  7. **Verify on-screen:** You see “Session #173 Details” plus your session name (e.g., `cort-seal-safe`), and the “Task Config” line showing redundancy (e.g., `5 tasks • 3 redundant`).
- **Voiceover:**
  > “Before touching the app UI, I’m showing the Cortensor side: the session CortSeal is configured to use. Session 173 is our compute context — it’s where tasks get routed, and where PoI-style redundancy is enforced. This gives judges a concrete, inspectable session ID that matches what the app uses — without exposing any secrets.”

## 3. Draft claim check: /try → /try/results/[id]
- **URL:** /try
- **Shot:** `http://localhost:3000/try` showing a draft input form; then it redirects to `/try/results/[id]` with a claims table showing agreement/dispersion and rubric scoring.
- **Steps:**
  1. **Current page:** Landing page — confirm the address bar shows `http://localhost:3000/`.
  2. **Navigate:** Open URL directly: `http://localhost:3000/try` → confirm the address bar shows `/try`.
  3. **Current page:** `/try` — confirm you see a draft input area (textarea/editor) and a primary submit button.
  4. **Enter values:**
     - Draft Content = `I’m joining Cortensor Hackathon #3.\nThe submission deadline is Sun, Jan 4, 2026.\nProjects must have a working public demo during the hackathon to qualify.\nHackathon #3 emphasizes agentic apps, PoI-style redundant inference, and PoUW-style validator scoring.\nCortSeal will publish evidence-backed seals so creators can share verification artifacts.`
  5. **Action:** Click “Run Claim Check” — wait for a loading state and an automatic redirect.
  6. **Verify on-screen:** The address bar now shows `http://localhost:3000/try/results/` followed by an ID, and you see a claims table with multiple extracted claims plus per-claim redundancy outputs (agreement/dispersion).
- **Voiceover:**
  > “This is the creator workflow: I paste a draft, click Run Claim Check, and CortSeal automatically extracts claims. Under the hood it runs multiple redundant verifier calls — PoI-style — so we don’t just get one model’s opinion. The results page shows what was extracted and how consistent the redundant runs were, which is exactly the trust signal judges want to see.”

## 4. Evidence + Proof artifacts: /api/analyses/[id]/evidence → /api/analyses/[id]/proof → /share/[id] → /api/proofs/[id]
- **URL:** /try/results/[id]
- **Shot:** The results page in one tab; then new tabs showing evidence JSON, proof generation JSON, the public share page, and the immutable proof JSON download.
- **Steps:**
  1. **Current page:** `/try/results/[ANALYSIS_ID]` — confirm the address bar includes `/try/results/`.
  2. **Action:** Copy the analysis ID from the address bar (the last path segment) — treat it as `[ANALYSIS_ID]`.
  3. **Navigate:** Open URL directly in a new tab: `http://localhost:3000/api/analyses/[ANALYSIS_ID]/evidence` → confirm the browser shows a JSON response.
  4. **Current page:** Evidence JSON — confirm you see a top-level `analysisId` and a structured `result` payload.
  5. **Navigate:** Open URL directly in a new tab: `http://localhost:3000/api/analyses/[ANALYSIS_ID]/proof` → confirm the response includes a public proof share ID (copy it as `[PROOF_SHARE_ID]`).
  6. **Navigate:** Open URL directly: `http://localhost:3000/share/[PROOF_SHARE_ID]` → confirm the address bar shows `/share/` and the proof bundle renders in a readable UI.
  7. **Navigate:** Open URL directly: `http://localhost:3000/api/proofs/[PROOF_SHARE_ID]` → confirm a full immutable proof bundle JSON renders/downloads.
  8. **Verify on-screen:** You have (a) evidence JSON, (b) a generated proof share ID, (c) a public share page, and (d) an immutable proof JSON payload that can be archived and re-verified.
- **Voiceover:**
  > “This is where CortSeal becomes more than a UI — it becomes a trust primitive. For every analysis, we can export a raw evidence snapshot, then generate a public proof bundle with deterministic checks. The share page is what creators link publicly, and the JSON endpoints are what developers integrate — a complete validation artifact pipeline aligned with PoI and PoUW.”

## 5. Audit a real public source: /audit → /audit/results/[id]
- **URL:** /audit
- **Shot:** `http://localhost:3000/audit` showing a URL audit form; then it redirects to `/audit/results/[id]` with extracted claims and evidence quotes from the page.
- **Steps:**
  1. **Current page:** Browser tab with localhost — confirm the address bar includes `http://localhost:3000/`.
  2. **Navigate:** Open URL directly: `http://localhost:3000/audit` → confirm the address bar shows `/audit`.
  3. **Current page:** `/audit` — confirm you see a URL input field and a primary submit button.
  4. **Enter values:**
     - URL = `https://docs.cortensor.network/community-and-ecosystem/hackathon/hackathon-3`
  5. **Action:** Click “Audit URL” — wait for a loading state and redirect to a results page.
  6. **Verify on-screen:** The address bar shows `http://localhost:3000/audit/results/` followed by an ID, and you see extracted claims alongside evidence quotes/snippets sourced from the page plus agreement/dispersion and rubric scoring.
- **Voiceover:**
  > “Now I’m auditing a real, public source: the official Hackathon #3 page. CortSeal fetches readable text safely, extracts claims, and validates them against the source with redundant runs. The results aren’t just text — they include evidence quotes and the stability of agreement across runs, which is exactly how you build a public-good verifier.”

## 6. Mint a shareable seal from a single claim: /validate → /seal/[publicId]
- **URL:** /validate
- **Shot:** `http://localhost:3000/validate` with URL + claim fields; then the public seal page `/seal/[publicId]` shows verdict + evidence.
- **Steps:**
  1. **Current page:** Browser on localhost — confirm the address bar starts with `http://localhost:3000`.
  2. **Navigate:** Open URL directly: `http://localhost:3000/validate` → confirm the address bar shows `/validate`.
  3. **Current page:** `/validate` — confirm you see fields for a source URL and a claim text.
  4. **Enter values:**
     - URL = `https://docs.cortensor.network/community-and-ecosystem/hackathon/hackathon-3`
     - Claim = `Submission deadline: Sun, Jan 4, 2026`
  5. **Action:** Click “Validate & Mint Seal” — wait for a success state that reveals a public seal ID (copy it as `[SEAL_PUBLIC_ID]`) or redirects you automatically.
  6. **Navigate:** Open URL directly: `http://localhost:3000/seal/[SEAL_PUBLIC_ID]` → confirm the address bar shows `/seal/`.
  7. **Verify on-screen:** You see a public seal page with a clear verdict indicator plus an evidence section tying the claim back to the source.
- **Voiceover:**
  > “This is the simplest ‘trust-as-a-service’ flow. I provide one claim and one source URL, CortSeal runs redundant validation, applies a rubric score, and then mints a public seal with a stable ID. The seal page is what creators share — it’s easy to read, but it’s backed by machine-verifiable artifacts.”

## 7. Discovery + distribution surfaces: /directory + /embed + badge + seal bundle JSON
- **URL:** /directory
- **Shot:** `http://localhost:3000/directory` listing public seals; then tabs showing the embed card, the SVG badge, and the seal JSON bundle for the same public ID.
- **Steps:**
  1. **Current page:** Public seal page — confirm the address bar shows `/seal/[SEAL_PUBLIC_ID]`.
  2. **Navigate:** Open URL directly: `http://localhost:3000/directory` → confirm the address bar shows `/directory`.
  3. **Current page:** `/directory` — confirm you see a list of recent public seals.
  4. **Navigate:** Open URL directly in a new tab: `http://localhost:3000/embed/[SEAL_PUBLIC_ID]` → confirm you see an iframe-friendly embed card.
  5. **Navigate:** Open URL directly in a new tab: `http://localhost:3000/api/badge/[SEAL_PUBLIC_ID].svg` → confirm an SVG badge renders in the browser.
  6. **Navigate:** Open URL directly in a new tab: `http://localhost:3000/api/seals/[SEAL_PUBLIC_ID]` → confirm a JSON seal bundle downloads/renders.
  7. **Verify on-screen:** You’ve demonstrated (a) a catalog/directory, (b) an embed surface, (c) a badge surface, and (d) a developer-consumable JSON bundle for the same seal.
- **Voiceover:**
  > “This is the growth loop: directory for discoverability, embeds and badges for creators to distribute trust everywhere, and a clean JSON bundle for developers. It’s aligned with the hackathon’s app catalog and developer tooling tracks — and it turns verification into something that can actually spread.”

## 8. Agentic monitors: /monitors → /monitors/new → /monitors/[id]
- **URL:** /monitors
- **Shot:** Monitors list page, then the create monitor page, then a monitor detail page showing run history and any generated artifacts.
- **Steps:**
  1. **Current page:** Browser tab on localhost — confirm you can see `http://localhost:3000` in the address bar.
  2. **Navigate:** Open URL directly: `http://localhost:3000/monitors` → confirm the address bar shows `/monitors`.
  3. **Current page:** `/monitors` — confirm you see a monitors list (even if empty) and a way to create a monitor.
  4. **Navigate:** Open URL directly: `http://localhost:3000/monitors/new` → confirm the address bar shows `/monitors/new` and you see a create monitor form.
  5. **Enter values:**
     - Monitor Name = `community-projects-commits`
     - RSS/Atom Feed URL = `https://github.com/cortensor/community-projects/commits/main.atom`
  6. **Action:** Click “Create Monitor” — wait for a redirect to `/monitors/[MONITOR_ID]` or a success confirmation.
  7. **Verify on-screen:** The address bar shows `/monitors/` followed by an ID, and you can see a monitor detail view with a run history area and/or recent artifacts section.
- **Voiceover:**
  > “This is the agentic part of CortSeal: monitors run automatically in the background. Instead of a one-off audit, you can watch a feed and continuously produce trust artifacts over time — with optional Discord alerts. That directly maps to the hackathon’s agentic applications and infra observability themes.”

## 9. Developer surface: OpenAPI + public validator endpoint
- **URL:** /api/openapi.json
- **Shot:** Browser showing OpenAPI JSON; then Terminal showing a `curl` POST to `/api/validate` returning `cortseal:validate:v1` with seal metadata.
- **Steps:**
  1. **Current page:** Browser tab on localhost — confirm the address bar shows `http://localhost:3000`.
  2. **Navigate:** Open URL directly: `http://localhost:3000/api/openapi.json` → confirm a JSON document renders.
  3. **Current page:** OpenAPI JSON — confirm you see an `openapi` version field and path definitions including `/api/validate`.
  4. **Navigate:** Switch to Terminal (repo root) — confirm your prompt shows you’re in `cort-seal`.
  5. **Action:** Run `curl -sS -X POST "http://localhost:3000/api/validate" -H "Content-Type: application/json" -d '{"url":"https://docs.cortensor.network/community-and-ecosystem/hackathon/hackathon-3","claim":"Submission deadline: Sun, Jan 4, 2026","runs":3}'` — wait for JSON output.
  6. **Verify on-screen:** Terminal returns JSON where `kind` equals `cortseal:validate:v1`, plus a seal public ID you can open at `http://localhost:3000/seal/[SEAL_PUBLIC_ID]`.
- **Voiceover:**
  > “Finally, here’s the developer tooling angle: CortSeal exposes a public validator endpoint and a clean OpenAPI schema. That means anyone can integrate CortSeal into their workflow coordinator, bot, or app store listing. And because it’s backed by Cortensor’s decentralized inference with redundancy and scoring, the response is a verifiable artifact — not just a chat completion.”

## Final Wrap-Up
- **URL:** /directory
- **Shot:** `http://localhost:3000/directory` showing your latest seals; you briefly open one seal page and show the badge/embed/proof endpoints exist.
- **Steps:**
  1. **Current page:** Browser on `http://localhost:3000/directory` — confirm the directory lists at least one public seal entry (including `[SEAL_PUBLIC_ID]`).
  2. **Verify final state:** Open `http://localhost:3000/seal/[SEAL_PUBLIC_ID]` in a new tab and confirm you can also reach `http://localhost:3000/api/badge/[SEAL_PUBLIC_ID].svg`, `http://localhost:3000/embed/[SEAL_PUBLIC_ID]`, and `http://localhost:3000/api/seals/[SEAL_PUBLIC_ID]` without errors.
- **Voiceover:**
  > “In one flow, we proved CortSeal’s full user journey: draft checks, source audits, single-claim validation, shareable public seals, and downloadable proof artifacts — plus agentic monitors and a developer-ready OpenAPI surface. This is exactly aligned with Cortensor Hackathon #3: agentic apps, PoI redundancy, PoUW scoring, attestations, and public-good endpoints. Try it at [DEMO_URL].”

## 10. Landing page: what CortSeal does (problem → solution)
- **URL:** /
- **Shot:** `http://localhost:3000/` in the browser; a clean landing experience describing audits, trust seals, proofs, and public endpoints.
- **Steps:**
  1. **Current page:** Browser — confirm you’re not currently on the Cortensor Dashboard tab.
  2. **Navigate:** Open URL directly: `http://localhost:3000/` → confirm the address bar shows `http://localhost:3000/`.
  3. **Current page:** Landing page — confirm you can see the CortSeal branding and a clear “what this does” section.
  4. **Action:** Scroll the page slowly — pause when you see sections describing (a) Draft audits, (b) URL audits, (c) Claim validation + seals, (d) Monitors, and (e) Public API.
  5. **Action:** Scroll back to the top — pause on the primary call-to-action area.
  6. **Verify on-screen:** The landing page clearly communicates the workflow: input content → extract claims → verify with redundancy → produce shareable seal + downloadable proof artifacts.
- **Voiceover:**
  > “CortSeal solves a simple creator problem: you want to publish confidently, but you also want proof. The app extracts verifiable claims from your draft or a public page, runs redundant decentralized inference to measure agreement and disagreement, adds a rubric score for trust, and then publishes a shareable seal with an evidence bundle that anyone can inspect.”
