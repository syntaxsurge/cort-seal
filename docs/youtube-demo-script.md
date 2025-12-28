Project: CortSeal  
One-liner: Turn creator content into shareable, evidence‑backed trust seals using Cortensor decentralized inference with PoI‑style redundancy and PoUW‑style scoring.

## 1. Boot the full local stack (Convex + Cortensor Router + CortSeal)
- **URL:** (Terminal — project root)
- **Shot:** 3 terminal tabs: Convex dev logs, Cortensor Router logs, Next.js dev server logs; you can see `http://localhost:3000` and Router `/api/v1/status` returning 200.
- **Steps:**
  1. **Current page:** Terminal in your repo root — confirm you see your project folder name `cort-seal` in the prompt.
  2. **Action:** Run `pnpm install` — wait for `Done` / dependency install completes.
  3. **Current page:** Terminal in repo root — confirm `.env.local` exists and contains `NEXT_PUBLIC_CONVEX_URL=...` and `CORTENSOR_ROUTER_URL=...`.
  4. **Action:** Open 3 terminal tabs and run:
     - **Tab A (Convex):** `pnpm convex:dev` — wait for “Convex functions ready” / dev server running.
     - **Tab B (IPFS):** `ipfs daemon` — wait for “Daemon is ready”.
     - **Tab C (Router):** `cortensord ~/.cortensor/.env routerv1` — wait until it binds and logs show the Router is listening on `127.0.0.1:5010`.
     - **Tab D (Next.js):** `pnpm dev` — wait for “Ready” and “Local: http://localhost:3000”.
  5. **Current page:** Terminal Tab C (Router) — run `curl -i http://127.0.0.1:5010/api/v1/status -H "Authorization: Bearer $CORTENSOR_API_KEY"` — wait for `HTTP/1.1 200`.
  6. **Verify on-screen:** You see (a) Next.js running at `http://localhost:3000`, (b) Router status returns 200, and (c) Convex dev is running without errors.
- **Voiceover:**
  > “First I’ll boot the full stack: Convex for persistence and background jobs, IPFS for evidence bundles, and the Cortensor Router for decentralized inference. Once the Router status returns HTTP 200 and Next.js is live on localhost, we’re ready to generate analyses, proofs, and public trust seals end-to-end.”

## 2. Create a Cortensor session that matches CortSeal’s PoI/PoUW workflow
- **URL:** https://dashboard-testnet0.cortensor.network
- **Shot:** Cortensor Dashboard on the “User Task” tab; “Create Session” modal open; you can see fields like Session Name, Metadata, Model, Redundant Nodes, Validator Nodes, and the “Create Session” button.
- **Steps:**
  1. **Current page:** Cortensor Dashboard — confirm the top tabs show “Network Task / User Task / Stats / Node”.
  2. **Navigate:** Click “User Task” in the top tab bar → lands on the User Task screen and you see the buttons “List Sessions” and “Create Session”.
  3. **Current page:** User Task screen — click “Create Session” (top right) — confirm the modal title “Create New Session” appears.
  4. **Enter values:**
     - Session Name = `cort-seal-safe`
     - Session Metadata = `{"app":"cort-seal","purpose":"claim extraction + verification + evidence bundle","tier":"safe","poi_redundancy":3,"pouw_style_rubric":true,"hackathon":"cortensor-hackathon-3"}`
     - Mode = `Ephemeral`
     - SLA = `Medium`
     - Models = `LLaVA 1.5 7B Q4`
     - Reserve Period (seconds) = `300 seconds (5 minutes)`
     - Max Task Execution Count = `5 tasks`
     - Payment Method = `Pay Per Use`
     - Min Nodes = `1`
     - Max Nodes = `1`
     - Redundant Nodes = `3`
     - Validator Nodes = `0`
  5. **Current page:** Create New Session modal — click “Create Session” — wait for the modal to close and the new Session details page to load.
  6. **Verify on-screen:** You see a Session details header like “Session #XYZ Details” and a “Mode & State” badge showing “Active”.
- **Voiceover:**
  > “Now I’ll create the Cortensor session that CortSeal will use. I name it `cort-seal-safe`, add metadata so it’s discoverable, and set three redundant nodes to demonstrate PoI-style redundancy. This session becomes the decentralized inference ‘lane’ our app routes through for verifiers and rubric scoring.”

## 3. Finalize `CORTENSOR_SESSION_ID` in your `.env.local` and Convex env
- **URL:** (Terminal — repo root + Convex env)
- **Shot:** Terminal shows editing `.env.local` and setting Convex env vars; then a curl call verifies the Router is reachable.
- **Steps:**
  1. **Current page:** Cortensor Dashboard Session page — confirm you can see a header like “Session #173 Details” (the number is the session ID).
  2. **Action:** Copy the numeric session number from the header (example: `173`) — confirm you have it copied (or note it).
  3. **Current page:** Terminal in repo root — open `.env.local` and set `CORTENSOR_SESSION_ID` to the numeric value:
     - `CORTENSOR_SESSION_ID=173`
  4. **Current page:** Terminal in repo root — mirror the same value into Convex env:
     - `pnpm convex env set CORTENSOR_SESSION_ID "173"`
     - `pnpm convex env set CORTENSOR_ROUTER_URL "$CORTENSOR_ROUTER_URL"`
     - `pnpm convex env set CORTENSOR_API_KEY "$CORTENSOR_API_KEY"`
     - `pnpm convex env set CORTENSOR_TIMEOUT_SECONDS "$CORTENSOR_TIMEOUT_SECONDS"`
     - `pnpm convex env set CORTSEAL_INGEST_TOKEN "$CORTSEAL_INGEST_TOKEN"`
     - `pnpm convex env set APP_URL "$APP_URL"`
  5. **Current page:** Terminal Tab C (Router) — run `curl -i "$CORTENSOR_ROUTER_URL/api/v1/status" -H "Authorization: Bearer $CORTENSOR_API_KEY"` — wait for `HTTP/1.1 200`.
  6. **Verify on-screen:** `.env.local` shows a non‑zero `CORTENSOR_SESSION_ID`, Convex env set commands succeed, and Router `/status` returns 200.
- **Voiceover:**
  > “The session ID we just created is the exact number in the dashboard header — that’s what we paste into `CORTENSOR_SESSION_ID`. I set it locally and also in Convex so server actions and scheduled monitors can call the Router consistently. With Router status returning 200, we’re ready to run real decentralized inference.”

## 4. Landing page: explain the product in 10 seconds
- **URL:** http://localhost:3000/
- **Shot:** CortSeal landing page in the browser; you can see the app name, a short explanation, and links/CTAs for Try, Audit, Validate, Directory, and Monitors (or you open routes directly).
- **Steps:**
  1. **Current page:** Browser — confirm the tab URL is `http://localhost:3000/` and the page shows “CortSeal”.
  2. **Navigate:** Open URL directly: `http://localhost:3000/` → lands on `/`.
  3. **Action:** Scroll the page to the “How it works” section (if visible) — pause for 2 seconds so it’s readable.
  4. Click nothing — keep the landing page visible — wait for the page to finish loading any client UI.
  5. **Verify on-screen:** You can point to (a) what CortSeal does (audits claims), and (b) the main flows: Try, Audit, Validate, Directory, and Monitors.
- **Voiceover:**
  > “CortSeal is a trust layer for the creator economy. It takes drafts and public URLs, extracts claims, runs redundant decentralized inference through Cortensor, and outputs shareable Seals and Proof bundles. In the next steps I’ll generate an analysis, mint a seal, and show how anyone can verify it via public endpoints.”

## 5. Draft check: extract claims + run PoI-style redundant verifier calls
- **URL:** http://localhost:3000/try
- **Shot:** “Try” page with a draft input area and a primary submit button; after submit you see loading, then a redirect to a results page.
- **Steps:**
  1. **Current page:** Browser on `/` — confirm “CortSeal” is visible.
  2. **Navigate:** Open URL directly: `http://localhost:3000/try` → lands on `/try` and you see the Try form.
  3. **Current page:** `/try` — click inside the main draft input and paste the content below.
  4. **Enter values:**
     - Draft Content = `Hackathon #3 kick-off is Mon, Nov 21, 2025. Submission deadline is Sun, Jan 4, 2026. The focus includes agentic applications and PoI/PoUW validation.`
  5. **Current page:** `/try` — click the primary submit button “Run Draft Check” — wait for the loading state and redirect.
  6. **Verify on-screen:** You land on a URL like `/try/results/[ANALYSIS_ID]` and you see a results header plus a claims table.
- **Voiceover:**
  > “Here’s the simplest flow: I paste a creator draft and run a Draft Check. CortSeal extracts concrete claims and calls the Cortensor Router multiple times per claim, so we can measure agreement and dispersion — that’s PoI-style redundancy. Once it finishes, we’re redirected to an analysis results page with all claims and metrics.”

## 6. Draft results: show dispersion + PoUW-style rubric score + proof generation entrypoint
- **URL:** http://localhost:3000/try/results/[ANALYSIS_ID]
- **Shot:** Results page shows Analysis ID, claim table, agreement/dispersion indicators, rubric score panel, and a proof generator button/link.
- **Steps:**
  1. **Current page:** `/try/results/[ANALYSIS_ID]` — confirm you can see an “Analysis” heading and a visible ID in the page or URL.
  2. **Action:** Point to the claim table rows — pause on at least one claim row.
  3. **Current page:** Results page — click any “Details” / row expander (if present) for one claim — confirm an evidence/outputs panel expands.
  4. **Current page:** Results page — click “Generate Proof Link” — wait for a toast or a proof link to appear.
  5. **Action:** Copy the displayed Proof link or the Proof ID shown on screen — confirm by showing it in the address bar or copied link UI.
  6. **Verify on-screen:** You can show (a) dispersion/agreement output across runs and (b) a rubric score panel indicating PoUW-style scoring for quality/grounding.
- **Voiceover:**
  > “This is the core trust UX. For each extracted claim, we show how consistent the redundant verifier runs are — high agreement means stable inference, and disagreement is flagged as higher risk. On top of that we compute a PoUW-style rubric score for quality and verifiability, and we generate a Proof bundle so the results can be shared and re-checked.”

## 7. Evidence bundle download: `/api/analyses/[id]/evidence`
- **URL:** http://localhost:3000/api/analyses/[ANALYSIS_ID]/evidence
- **Shot:** Browser downloads a JSON file; you briefly open it to show it contains structured evidence data and the analysis snapshot.
- **Steps:**
  1. **Current page:** `/try/results/[ANALYSIS_ID]` — confirm the analysis ID is visible in the URL bar.
  2. **Navigate:** Open URL directly: `http://localhost:3000/api/analyses/[ANALYSIS_ID]/evidence` → triggers a JSON download.
  3. **Current page:** Browser downloads panel — click the downloaded file to open it — confirm you see JSON.
  4. Click nothing else — scroll the JSON a little — pause on the `kind` field.
  5. **Verify on-screen:** The JSON includes a `kind` (analysis format version) and the claims + run outputs needed to reproduce the evaluation.
- **Voiceover:**
  > “CortSeal doesn’t hide the receipts. Every analysis has a downloadable evidence bundle — a structured JSON snapshot of claims, verifier runs, and scoring inputs. This is what makes the system auditable and easy to integrate into other tools, and it’s exactly the kind of artifact validators and public-good verifiers need.”

## 8. Proof generation endpoint: `/api/analyses/[id]/proof`
- **URL:** http://localhost:3000/api/analyses/[ANALYSIS_ID]/proof
- **Shot:** Terminal runs a curl request and prints a JSON response containing a Proof ID and a public share URL.
- **Steps:**
  1. **Current page:** Terminal in repo root — confirm you have `[ANALYSIS_ID]` from the results page URL.
  2. **Action:** Run: `curl -sS "http://localhost:3000/api/analyses/[ANALYSIS_ID]/proof" | jq` — wait for JSON output.
  3. **Current page:** Terminal — copy the returned `proofId` (or `id`) field and the `shareUrl` (if present).
  4. Click nothing else — keep the JSON visible for 2 seconds.
  5. **Verify on-screen:** The response includes a stable Proof identifier you can open publicly at `/share/[PROOF_ID]`.
- **Voiceover:**
  > “Under the hood, the results page can mint a Proof, but you can also do it programmatically. This endpoint wraps the evidence bundle plus deterministic checks into an immutable proof object with a share ID — perfect for API-first integrations like marketplaces, plugins, or automated agents.”

## 9. Public Proof share page: `/share/[id]`
- **URL:** http://localhost:3000/share/[PROOF_ID]
- **Shot:** Proof share page shows proof summary, claims, rubric score, deterministic checks, and a download link for the full proof bundle.
- **Steps:**
  1. **Current page:** Terminal — confirm you copied `[PROOF_ID]` from the proof generation response.
  2. **Navigate:** Open URL directly: `http://localhost:3000/share/[PROOF_ID]` → lands on the public Proof page.
  3. **Current page:** `/share/[PROOF_ID]` — scroll to the “Deterministic Checks” section (or equivalent) — pause so it’s readable.
  4. **Current page:** Proof page — click “Download Proof JSON” — wait for a JSON download.
  5. **Verify on-screen:** You see a public, shareable proof view and a downloadable artifact that matches the analysis you created.
- **Voiceover:**
  > “This is what you share externally: a Proof page with the full claim list, scoring, and deterministic checks packaged together. It’s readable for humans and also downloadable for machines. This turns ‘trust me’ creator content into a verifiable object you can embed, archive, and re-check later.”

## 10. URL audit: fetch readable source text + source-backed verification
- **URL:** http://localhost:3000/audit
- **Shot:** Audit page shows a URL input and a submit button; after submit you see loading and then a redirect to `/audit/results/[id]`.
- **Steps:**
  1. **Current page:** Browser — confirm you can see any CortSeal page loaded successfully.
  2. **Navigate:** Open URL directly: `http://localhost:3000/audit` → lands on `/audit`.
  3. **Current page:** `/audit` — click the URL field and paste the source.
  4. **Enter values:**
     - URL = `https://docs.cortensor.network/community-and-ecosystem/hackathon/hackathon-3`
  5. **Current page:** `/audit` — click the primary submit button “Audit URL” — wait for loading and redirect.
  6. **Verify on-screen:** You land on `/audit/results/[AUDIT_ANALYSIS_ID]` and you see extracted claims plus evidence quotes from the source.
- **Voiceover:**
  > “Next is a source-backed audit. I paste a public URL — in this case the official Hackathon #3 page — and CortSeal fetches readable text, extracts claims, and checks them against the source with redundant Router runs. This is the audit flow creators and communities can use for ‘proof-backed’ announcements and pages.”

## 11. URL audit results: show evidence quotes + disagreement signals
- **URL:** http://localhost:3000/audit/results/[AUDIT_ANALYSIS_ID]
- **Shot:** Audit results page with a claim list; each claim shows supporting quotes or references; dispersion indicators are visible.
- **Steps:**
  1. **Current page:** `/audit/results/[AUDIT_ANALYSIS_ID]` — confirm the page shows an audit results heading and the audited URL.
  2. **Action:** Scroll to the claims table and pause on one claim that includes a visible evidence quote.
  3. **Current page:** Audit results — click a claim row to expand details (if present) — confirm you see multiple verifier outputs or evidence snippets.
  4. **Current page:** Audit results — click “Generate Proof Link” — wait for a toast or link output.
  5. **Action:** Copy the generated proof link or ID — confirm it appears in the UI.
  6. **Verify on-screen:** You can point to (a) evidence quotes grounding the claim and (b) any disagreement/dispersion marker across redundant runs.
- **Voiceover:**
  > “This page is where trust becomes visible. For every claim, we show the source grounding — the exact quotes or extracted references — and we highlight disagreement when redundant inference doesn’t converge. That’s the practical value of PoI-style redundancy: it turns uncertainty into a measurable signal instead of a hidden failure.”

## 12. Validate a single claim + mint a shareable Seal
- **URL:** http://localhost:3000/validate
- **Shot:** Validate page with URL + claim inputs; after submit you see a minted Seal preview and a link to `/seal/[publicId]`.
- **Steps:**
  1. **Current page:** Browser — confirm the app is running locally.
  2. **Navigate:** Open URL directly: `http://localhost:3000/validate` → lands on `/validate`.
  3. **Current page:** `/validate` — click the URL input and the Claim input.
  4. **Enter values:**
     - URL = `https://docs.cortensor.network/community-and-ecosystem/hackathon/hackathon-3`
     - Claim = `Submission deadline is Sun, Jan 4, 2026.`
     - Runs = `[RUNS=3]`
  5. **Current page:** `/validate` — click “Validate & Mint Seal” — wait for a success toast and the Seal preview to load.
  6. **Verify on-screen:** You see a minted Seal with a `publicId` and a link you can open at `/seal/[SEAL_PUBLIC_ID]`.
- **Voiceover:**
  > “This is the core public-good endpoint turned into a product UI: validate one claim against one public URL, with redundant runs, and mint a Seal you can share. This is ideal for creators, influencers, and communities who need a single, clean trust object — not a giant audit report.”

## 13. Public Seal page: human-readable verdict + evidence
- **URL:** http://localhost:3000/seal/[SEAL_PUBLIC_ID]
- **Shot:** Public Seal page shows verdict badge, claim text, source URL, evidence snippet(s), and share options.
- **Steps:**
  1. **Current page:** `/validate` — confirm you can see the Seal preview and `publicId`.
  2. **Navigate:** Open URL directly: `http://localhost:3000/seal/[SEAL_PUBLIC_ID]` → lands on the public Seal page.
  3. **Current page:** `/seal/[SEAL_PUBLIC_ID]` — scroll to the Evidence section — pause on a visible quote or grounding snippet.
  4. **Current page:** Seal page — click “Copy Share Link” (or equivalent) — wait for a “Copied” toast.
  5. **Action:** Highlight the verdict badge and the source URL side-by-side.
  6. **Verify on-screen:** The Seal page clearly shows the claim, the source, a verdict, and the evidence that supports it.
- **Voiceover:**
  > “A Seal is the creator-friendly artifact: it’s public, linkable, and readable in seconds. You get the claim, the source, a verdict, and the evidence — plus share controls. This is the bridge between decentralized inference and real-world creator workflows like newsletters, tweets, or sponsored content disclosures.”

## 14. Embed card: `/embed/[publicId]` for websites and creator platforms
- **URL:** http://localhost:3000/embed/[SEAL_PUBLIC_ID]
- **Shot:** An iframe-friendly embed card: compact verdict, claim, and a link back to the full Seal page.
- **Steps:**
  1. **Current page:** `/seal/[SEAL_PUBLIC_ID]` — confirm the Seal verdict is visible.
  2. **Navigate:** Open URL directly: `http://localhost:3000/embed/[SEAL_PUBLIC_ID]` → lands on the embed view.
  3. **Action:** Resize the browser window slightly to show it’s responsive.
  4. Click nothing else — keep the embed card visible for 2 seconds.
  5. **Verify on-screen:** You see a compact card that can be embedded in a creator’s site or post.
- **Voiceover:**
  > “For creators, distribution matters. The embed route turns any Seal into a clean card you can drop into a blog, creator landing page, or marketplace listing. It’s lightweight, readable, and always points back to the full evidence-backed Seal.”

## 15. Badge endpoint: `/api/badge/[publicId].svg`
- **URL:** http://localhost:3000/api/badge/[SEAL_PUBLIC_ID].svg
- **Shot:** Browser renders an SVG badge showing the Seal status/verdict; the URL is visible in the address bar.
- **Steps:**
  1. **Current page:** Browser — confirm you have `[SEAL_PUBLIC_ID]`.
  2. **Navigate:** Open URL directly: `http://localhost:3000/api/badge/[SEAL_PUBLIC_ID].svg` → the badge renders.
  3. **Action:** Zoom in slightly so the badge is readable.
  4. Click nothing else — keep the badge visible for 2 seconds.
  5. **Verify on-screen:** You see a working SVG badge that can be embedded in READMEs, profiles, and creator pages.
- **Voiceover:**
  > “This is a developer-friendly trust primitive: an SVG badge. It’s perfect for GitHub READMEs, creator pages, or any site that wants a simple visual proof marker. The badge is generated from the same underlying Seal object, so it stays consistent and auditable.”

## 16. Seal bundle JSON: `/api/seals/[publicId]`
- **URL:** http://localhost:3000/api/seals/[SEAL_PUBLIC_ID]
- **Shot:** Browser shows JSON for the seal bundle with fields like claim, source, verdict, timestamps, and metadata.
- **Steps:**
  1. **Current page:** Browser — confirm you already minted a Seal and have `[SEAL_PUBLIC_ID]`.
  2. **Navigate:** Open URL directly: `http://localhost:3000/api/seals/[SEAL_PUBLIC_ID]` → lands on a JSON response.
  3. **Action:** Scroll until you see `kind` and `publicId` fields.
  4. Click nothing else — pause on the evidence section.
  5. **Verify on-screen:** The seal bundle is machine-readable and contains enough data for third-party verification or indexing.
- **Voiceover:**
  > “Beyond the UI, CortSeal is API-first. This endpoint returns the full Seal bundle as JSON — perfect for app stores, catalog indexing, or automated agents that want to fetch and display trust artifacts programmatically.”

## 17. Proof bundle JSON: `/api/proofs/[id]`
- **URL:** http://localhost:3000/api/proofs/[PROOF_ID]
- **Shot:** Browser shows JSON for the immutable Proof bundle, including claims, rubric scores, and deterministic checks.
- **Steps:**
  1. **Current page:** Proof share page `/share/[PROOF_ID]` — confirm the proof ID is visible in the URL.
  2. **Navigate:** Open URL directly: `http://localhost:3000/api/proofs/[PROOF_ID]` → lands on a JSON response.
  3. **Action:** Scroll to the deterministic checks section and pause.
  4. Click nothing else — keep the JSON visible for 2 seconds.
  5. **Verify on-screen:** The proof JSON includes the complete evidence + checks bundle that can be archived and revalidated later.
- **Voiceover:**
  > “A Proof is the immutable, downloadable artifact for auditors and integrators. This JSON includes the complete analysis snapshot plus deterministic checks — enabling reproducibility, long-term storage, and third-party revalidation. This is how you build trust that outlives a single UI session.”

## 18. Public directory: discover recent Seals
- **URL:** http://localhost:3000/directory
- **Shot:** Directory page shows a list/table/grid of recent public Seals with links, verdict badges, and timestamps.
- **Steps:**
  1. **Current page:** Browser — confirm you minted a Seal earlier.
  2. **Navigate:** Open URL directly: `http://localhost:3000/directory` → lands on the directory.
  3. **Current page:** `/directory` — locate the newest Seal row/card (your recently minted one).
  4. **Action:** Click the Seal row/card link (the one containing your `publicId`) → lands on `/seal/[SEAL_PUBLIC_ID]`.
  5. **Current page:** Seal page — confirm the same verdict badge and claim appear.
  6. **Verify on-screen:** The directory provides a “catalog surface” for discovery and one-click validation artifacts.
- **Voiceover:**
  > “Hackathon #3 calls out app stores and catalogs — this directory is our discovery surface. It lists the latest public Seals so anyone can browse, click through, and verify evidence. This makes CortSeal a public good: it’s not just generating artifacts, it’s making them discoverable.”

## 19. Monitors hub: see automated audits and scheduled runs
- **URL:** http://localhost:3000/monitors
- **Shot:** Monitors page shows existing monitors, statuses, last run times, and a CTA to create a new monitor.
- **Steps:**
  1. **Current page:** Browser — confirm the app is still running locally.
  2. **Navigate:** Open URL directly: `http://localhost:3000/monitors` → lands on the monitors hub.
  3. **Current page:** `/monitors` — pause on the monitor list/table area.
  4. **Action:** Click “Create Monitor” → lands on `/monitors/new`.
  5. **Verify on-screen:** You see the New Monitor page ready to create an automated RSS watcher.
- **Voiceover:**
  > “This is the agentic side of CortSeal. Monitors let the system watch feeds over time, run audits automatically, and mint new Seal artifacts as content changes. That aligns directly with the hackathon’s agentic applications and observability themes.”

## 20. Create a new RSS monitor: `/monitors/new`
- **URL:** http://localhost:3000/monitors/new
- **Shot:** New Monitor form with name + RSS URL fields and a primary “Create” button; success redirects to the monitor detail page.
- **Steps:**
  1. **Current page:** `/monitors/new` — confirm the heading shows “New Monitor” (or “Create Monitor”).
  2. **Action:** Click into the Name and RSS URL fields.
  3. **Enter values:**
     - Monitor Name = `Demo Monitor — Creator Feed Watch`
     - RSS Feed URL = `https://hnrss.org/newest`
  4. **Current page:** `/monitors/new` — click “Create Monitor” — wait for a success toast and redirect.
  5. **Verify on-screen:** You land on `/monitors/[MONITOR_ID]` and see the monitor name displayed on the page.
- **Voiceover:**
  > “To show automation, I’ll create an RSS monitor. In production you’d plug in a creator’s newsletter or blog feed, but for demo we use a public RSS endpoint. Once created, the monitor gets its own detail page with run history, generated seals, and scheduling behavior — all backed by Convex jobs.”

## 21. Monitor detail page: run history + generated seals
- **URL:** http://localhost:3000/monitors/[MONITOR_ID]
- **Shot:** Monitor detail shows monitor metadata, recent runs table, and any generated seals list (even if empty at first).
- **Steps:**
  1. **Current page:** `/monitors/[MONITOR_ID]` — confirm the page shows the monitor name “Demo Monitor — Creator Feed Watch”.
  2. **Action:** Scroll to the “Run History” section — pause for 2 seconds.
  3. **Current page:** Monitor detail — click “Refresh” (or the page’s refresh control, if present) — wait for the table to re-render.
  4. **Action:** If a “Run Now” button exists, click “Run Now” — wait for a new row to appear in Run History.
  5. **Verify on-screen:** You see either (a) a new run row with a status, or (b) the monitor configured and ready with scheduling behavior visible.
  6. **Verify on-screen:** The monitor page links to any generated seals, proving the agentic pipeline can mint artifacts over time.
- **Voiceover:**
  > “This page is the operational view: you can see the monitor configuration, its run history, and the seals it mints as content updates. This is where decentralized inference becomes an agentic system — it watches, evaluates, records evidence, and creates shareable outputs automatically.”

## 22. Public validator endpoint (API demo): `/api/validate`
- **URL:** http://localhost:3000/api/validate
- **Shot:** Terminal runs a POST request; JSON response includes `kind: cortseal:validate:v1` and returns minted seal metadata including a `publicId`.
- **Steps:**
  1. **Current page:** Terminal in repo root — confirm the app is running at `http://localhost:3000`.
  2. **Action:** Run:
     - `curl -sS -X POST "http://localhost:3000/api/validate" -H "Content-Type: application/json" -d '{"url":"https://docs.cortensor.network/community-and-ecosystem/hackathon/hackathon-3","claim":"Submission deadline is Sun, Jan 4, 2026.","runs":3}' | jq`
  3. **Current page:** Terminal — point to the returned `kind` field and the returned `seal.publicId`.
  4. **Action:** Copy `seal.publicId` from the response.
  5. **Current page:** Browser — open `http://localhost:3000/seal/[SEAL_PUBLIC_ID_FROM_API]` directly — wait for the Seal page to load.
  6. **Verify on-screen:** The Seal page loads successfully, proving the public endpoint can mint artifacts headlessly for integrations.
- **Voiceover:**
  > “For developer tooling and integrations, CortSeal exposes a public validator endpoint. This makes it easy for bots, plugins, or marketplaces to validate claims and mint Seals without using the UI. The response is versioned, includes the seal public ID, and links directly into the public artifact pages.”

## 23. OpenAPI schema: `/api/openapi.json` for app stores and SDK generation
- **URL:** http://localhost:3000/api/openapi.json
- **Shot:** Browser shows OpenAPI JSON; you scroll to see `/api/validate` and other endpoints listed.
- **Steps:**
  1. **Current page:** Browser — confirm the app is running.
  2. **Navigate:** Open URL directly: `http://localhost:3000/api/openapi.json` → OpenAPI JSON renders.
  3. **Action:** Use browser find (Cmd+F) for `/api/validate` — confirm it highlights an endpoint entry.
  4. Click nothing else — pause on the schema section that shows request/response shape.
  5. **Verify on-screen:** The OpenAPI document clearly exposes public endpoints for third-party use and auto-generated clients.
- **Voiceover:**
  > “Finally, to make CortSeal easy to adopt, we publish an OpenAPI schema. That means teams can generate SDKs, integrate quickly, and build catalogs or app-store listings around validator endpoints and artifact downloads. This closes the loop: agentic inference, trust artifacts, and developer tooling — all aligned with the hackathon tracks.”

## Final Wrap-Up
- **URL:** http://localhost:3000/directory
- **Shot:** Directory page listing your Seal; you click into the public Seal page and show the embed + badge URLs as final proof points.
- **Steps:**
  1. **Current page:** `/directory` — confirm your newest Seal is visible with a verdict badge and a clickable link.
  2. **Verify final state:** You can show (a) a public Seal page with evidence, (b) an embeddable card at `/embed/[publicId]`, (c) a badge at `/api/badge/[publicId].svg`, and (d) machine-readable bundles via `/api/seals/[publicId]` and `/api/proofs/[id]`.
- **Voiceover:**
  > “In this demo we proved the full journey: create a Cortensor session, run redundant decentralized inference for PoI-style agreement signals, compute PoUW-style rubric scoring, and publish shareable Seals and immutable Proof bundles. Everything is human-friendly and API-first. Try it at [DEMO_URL], and start shipping verifiable creator trust on Cortensor.”
