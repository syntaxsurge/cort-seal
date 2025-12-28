Project: CortSeal
One-liner: CortSeal turns creator content into shareable trust seals by verifying extracted claims with Cortensor's redundant decentralized inference and exporting evidence bundles.

## 1. Boot the full local stack (Convex + IPFS + Cortensor Router + CortSeal)
- **URL:** (Terminal - project root)
- **Shot:** 4 terminal tabs visible: Convex dev logs, IPFS daemon logs, Cortensor Router logs, Next.js dev server logs; you can see `Local: http://localhost:3000` and Router `/api/v1/status` returning `HTTP/1.1 200`.
- **Steps:**
  1. **Current page:** Terminal Tab A (repo root) - confirm your prompt shows you are in the `cort-seal` folder.
  2. **Action:** Confirm `.env.local` has `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` set.
  3. **Action:** Run `pnpm convex:dev` - wait for a "functions ready" / "Convex is running" confirmation.
  4. **Current page:** Terminal Tab B - confirm you are at a shell prompt.
  5. **Action:** Run `ipfs daemon` - wait for "Daemon is ready".
  6. **Current page:** Terminal Tab C - confirm you are at a shell prompt.
  7. **Action:** Run `cortensord ~/.cortensor/.env routerv1` - wait until logs show it is listening on `127.0.0.1:5010`.
  8. **Current page:** Terminal Tab D (repo root) - confirm your prompt shows `cort-seal`.
  9. **Action:** Run `pnpm dev` - wait for `Local: http://localhost:3000`.
  10. **Current page:** Terminal Tab C (Router) - run `curl -i http://127.0.0.1:5010/api/v1/status -H "Authorization: Bearer $CORTENSOR_API_KEY"` - wait for `HTTP/1.1 200`.
  11. **Verify on-screen:** You can see (a) Convex dev running, (b) IPFS daemon ready, (c) Router status is 200, and (d) Next.js is live on `http://localhost:3000`.
- **Voiceover:**
  > "To demo CortSeal end-to-end, I am booting the full local stack: Convex for persistence and background jobs, IPFS for evidence bundles, and the Cortensor Router for decentralized inference. Once Router status returns 200 and Next.js is live on localhost, we are ready to generate artifacts."

## 2. Connect wallet identity (RainbowKit) and unlock creator flows
- **URL:** /try
- **Shot:** `http://localhost:3000/try` first shows a wallet gate card with "Connect your wallet to continue"; after connecting, the "Claim check studio" page loads and the header shows your address.
- **Steps:**
  1. **Current page:** `http://localhost:3000/` - confirm the header nav includes "Try", "Audit", "Validate", "Directory", "Library", and "Monitors", plus a wallet connect control.
  2. **Navigate:** Click "Try" in the header navigation - confirm you land on `/try`.
  3. **Current page:** `/try` - confirm you see the gate card with the heading "Connect your wallet to continue".
  4. **Action:** Click "Connect Wallet" in the card or the header - confirm the wallet modal opens and approve the connection.
  5. **Verify on-screen:** The gate card disappears, the "Claim check studio" page renders, and the header shows your connected address.
- **Voiceover:**
  > "CortSeal uses wallet identity to scope artifacts to a creator. Once I connect with RainbowKit, analyses, proofs, monitors, and seals are tied to my address, which powers the private library without blocking the public proof pages."

## 3. Show the Cortensor session CortSeal uses (Session #173)
- **URL:** https://dashboard-testnet0.cortensor.network
- **Shot:** Cortensor Dashboard with `User Task` selected; the session lookup loads "Session #173 Details".
- **Steps:**
  1. **Current page:** Cortensor Dashboard - confirm you see "CORTENSOR DASHBOARD" and your wallet badge in the top-right.
  2. **Navigate:** Click "User Task" in the top navigation - confirm you see "List Sessions" and "Network Status".
  3. **Current page:** User Task view - confirm you see the search input with placeholder "Enter session ID to lookup".
  4. **Action:** Enter session ID `173` and press Enter.
  5. **Verify on-screen:** You see "Session #173 Details" and the "Task Config" line shows redundancy (for example, `5 tasks - 3 redundant`).
- **Voiceover:**
  > "Before running workflows, I show the Cortensor side. Session 173 is the compute context where tasks are routed and redundancy is enforced. It is an inspectable proof that CortSeal is using decentralized inference."

## 4. Draft claim check: /try -> /try/results
- **URL:** /try
- **Shot:** "Claim check studio" page with the "Draft content" card and "Run CortSeal Check" button; then the results page shows claim verdicts and rubric scoring.
- **Steps:**
  1. **Current page:** `/try` - confirm you see "Claim check studio" and the "Draft content" card.
  2. **Action:** In the "Prompt" field, enter:
     - `I am joining Cortensor Hackathon #3.\nThe submission deadline is Sun, Jan 4, 2026.\nProjects must have a working public demo during the hackathon to qualify.\nHackathon #3 emphasizes agentic apps, PoI-style redundant inference, and PoUW-style validator scoring.\nCortSeal will publish evidence-backed seals so creators can share verification artifacts.`
  3. **Action:** Click "Run CortSeal Check" - wait for the loading state and redirect.
  4. **Verify on-screen:** The address bar shows `/try/results/` followed by an ID, and the "Output" card shows "Claims extracted" plus a "Claim verdicts" table.
- **Voiceover:**
  > "This is the creator workflow: paste a draft and run a claim check. CortSeal extracts verifiable claims and runs redundant verifiers to measure agreement and dispersion, then adds rubric scoring for PoUW. The results page shows exactly what was extracted and how consistent the runs were."

## 5. Evidence + proof artifacts: evidence JSON -> share page -> immutable proof JSON
- **URL:** /try/results
- **Shot:** Results page with "Output" card, "Download evidence", and "Generate proof link"; a new tab shows the share page with "Shareable proof" and "Deterministic checks".
- **Steps:**
  1. **Current page:** `/try/results/...` - confirm you see the "Output" card.
  2. **Action:** Click "Download evidence" - confirm the evidence JSON opens in a new tab from the analyses evidence endpoint.
  3. **Navigate:** Return to the results tab and click "Generate proof link".
  4. **Verify on-screen:** The buttons "Open share page" and "Copy link" appear.
  5. **Action:** Click "Open share page" - confirm you see the "Shareable proof" page and the "Deterministic checks" list.
  6. **Action:** On the share page, click "Download evidence" in the Output card - confirm an immutable proof bundle JSON opens from the proofs download endpoint.
- **Voiceover:**
  > "From one run we export an evidence snapshot, then generate a shareable proof page with deterministic checks, and finally open the immutable proof bundle JSON. That is what makes CortSeal a trust primitive, not just a UI."

## 6. Audit a real public source: /audit -> /audit/results
- **URL:** /audit
- **Shot:** "Source audit" page with a "Source URL" input and "Run URL Audit"; results page shows evidence quotes tied to the source.
- **Steps:**
  1. **Navigate:** Click "Audit" in the header navigation - confirm you land on `/audit`.
  2. **Current page:** `/audit` - confirm the "Source URL" field is pre-filled.
  3. **Action:** Click "Run URL Audit" - wait for loading and redirect.
  4. **Verify on-screen:** The address bar shows `/audit/results/...` and you see the "Source" summary plus "Claim validations" with quotes.
- **Voiceover:**
  > "Now I audit a real public source. CortSeal fetches readable text safely, extracts claims, runs redundant validators, and includes source-grounded evidence quotes. This is the public-good verifier experience."

## 7. Mint a shareable seal from a single claim: /validate -> /seal
- **URL:** /validate
- **Shot:** "Public validator" page with URL + Claim + Redundant runs; results card shows a seal link and links for JSON, badge, and embed.
- **Steps:**
  1. **Navigate:** Click "Validate" in the header navigation - confirm you land on `/validate`.
  2. **Current page:** `/validate` - confirm you see inputs labeled "Source URL", "Claim", and "Redundant runs".
  3. **Enter values:**
     - Source URL = `https://docs.cortensor.network/community-and-ecosystem/hackathon/hackathon-3`
     - Claim = `Submission deadline: Sun, Jan 4, 2026`
  4. **Action:** Click "Validate" - wait for the result card to appear.
  5. **Verify on-screen:** The card shows a "Seal" link plus "Download JSON", "SVG badge", and "Embed".
  6. **Action:** Click the seal link - confirm you land on `/seal/...` with verdict and evidence.
- **Voiceover:**
  > "This is the trust seal flow. One URL and one claim goes through redundant validation, gets PoUW scoring, and mints a public seal with stable artifacts."

## 8. Private artifacts library (wallet-scoped): /library
- **URL:** /library
- **Shot:** "My artifacts" page with filters for All, Analyses, Proofs, Seals, and Monitors; rows include "Open" and "Copy link".
- **Steps:**
  1. **Navigate:** Click "Library" in the header navigation - confirm you land on `/library`.
  2. **Current page:** `/library` - confirm the header says "My artifacts".
  3. **Action:** Click the filter buttons (All, Analyses, Proofs, Seals, Monitors) to show each section.
  4. **Action:** Use the search bar labeled "Search by ID, URL, title, or verdict".
  5. **Verify on-screen:** Click "Open" on the latest analysis and confirm you return to a results page; use "Copy link" to show shareable links.
- **Voiceover:**
  > "This is the private library, scoped to the connected wallet. It keeps a durable history of everything I generated so I never lose links to results, proofs, seals, or monitors."

## 9. Public seal directory: /directory
- **URL:** /directory
- **Shot:** "Seal directory" page with verdict filters and a list of public seals.
- **Steps:**
  1. **Navigate:** Click "Directory" in the header navigation - confirm you land on `/directory`.
  2. **Current page:** `/directory` - confirm you see filter buttons "All", "PASS", "WARN", "FAIL", "UNKNOWN".
  3. **Action:** Open a seal card and use the "View", "JSON", "Badge", and "Embed" links.
- **Voiceover:**
  > "The directory is public and indexable. It only lists seals, so anyone can browse verification artifacts without needing a wallet."

## 10. Distribution surfaces: embed card + badge SVG + seal JSON bundle
- **URL:** /seal
- **Shot:** Seal page with the buttons "Download JSON", "SVG badge", and "Embed" in the header card.
- **Steps:**
  1. **Current page:** `/seal/...` - confirm you see the verdict badge and evidence section.
  2. **Action:** Click "Download JSON" - confirm the seal bundle JSON opens from the seals download endpoint.
  3. **Action:** Click "SVG badge" - confirm the SVG renders in the browser.
  4. **Action:** Click "Embed" - confirm the iframe-friendly card loads from the embed endpoint for that seal.
- **Voiceover:**
  > "These are the distribution surfaces. A single seal has a public page, a badge asset, an embed card, and a developer-friendly JSON bundle."

## 11. Agentic monitors: /monitors -> /monitors/new -> monitor detail page
- **URL:** /monitors
- **Shot:** Monitors list, new monitor form, then a monitor detail page showing recent seals and run history.
- **Steps:**
  1. **Navigate:** Click "Monitors" in the header navigation - confirm you land on `/monitors`.
  2. **Action:** Click "New monitor" (or "Create your first monitor").
  3. **Current page:** `/monitors/new` - confirm you see "New monitor" and fields for Name, Kind, and Interval (minutes).
  4. **Enter values:**
     - Name = `community-projects-commits`
     - Kind = `RSS feed`
     - Interval (minutes) = `30`
     - Feed URL = `https://github.com/cortensor/community-projects/commits/main.atom`
  5. **Action:** Click "Create monitor" - wait for redirect to `/monitors/...`.
  6. **Verify on-screen:** The detail page shows "Recent seals" and "Run history", plus "Run now" and Enable/Disable controls.
- **Voiceover:**
  > "Monitors are the agentic layer. Instead of one-off checks, CortSeal can watch a feed and continuously generate verification artifacts over time."

## 12. Developer surface: OpenAPI + public validator endpoint
- **URL:** /api/openapi.json
- **Shot:** Browser shows OpenAPI JSON; Terminal shows a `curl` POST to `/api/validate` returning `cortseal:validate:v1`.
- **Steps:**
  1. **Navigate:** Open `http://localhost:3000/api/openapi.json` - confirm you see the OpenAPI schema.
  2. **Navigate:** In Terminal (repo root), run:
     - `curl -sS -X POST "http://localhost:3000/api/validate" -H "Content-Type: application/json" -d '{"url":"https://docs.cortensor.network/community-and-ecosystem/hackathon/hackathon-3","claim":"Submission deadline: Sun, Jan 4, 2026","runs":3}'`
  3. **Verify on-screen:** The response JSON has `kind: "cortseal:validate:v1"` plus a `publicId` you can open at `/seal/...`.
- **Voiceover:**
  > "CortSeal is also a developer platform. It ships a public validator endpoint and a clean OpenAPI spec, so other tools can consume verifiable artifacts directly."

## 13. Landing page: what CortSeal does (problem -> solution)
- **URL:** /
- **Shot:** Landing page showing the core workflow and the primary call-to-action.
- **Steps:**
  1. **Navigate:** Click the CortSeal logo in the header - confirm the address bar shows `http://localhost:3000/`.
  2. **Action:** Scroll through the landing sections describing draft checks, audits, seals, monitors, and the public API.
- **Voiceover:**
  > "CortSeal solves a simple creator problem: publish confidently with proof. It extracts claims, runs redundant decentralized inference, applies rubric scoring, and produces shareable, verifiable artifacts."

## Final Wrap-Up
- **URL:** /library and /directory
- **Shot:** Show "My artifacts" with recent analyses and proofs, then show the public seal directory.
- **Steps:**
  1. **Navigate:** Open `/library` and show at least one analysis, proof, and seal tied to your wallet.
  2. **Navigate:** Open `/directory` and show the public seal list with View/JSON/Badge/Embed actions.
- **Voiceover:**
  > "We proved the full journey: wallet-scoped creator identity, draft checks, source audits, shareable proofs, public seals, and ongoing monitors, all backed by Cortensor's redundant inference and evidence bundles."
