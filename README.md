# OAuth Setup Guides

A working experience that tells a developer what it really takes to register an OAuth app with a provider and get it approved: how hard it is, how much of your time it needs, how long approval can take, what an agent can do versus what only you can, and where we are unsure.

- **Library**: 10 researched guides covering different kinds of difficulty (self-serve, light checks, review required, gated).
- **Live agent** (`/live`): type any app name or website; an agent searches, reads the provider's pages and writes a guide, streaming its progress. Code checks the result before showing it.
- **Ask** (home and every guide): retrieval-augmented Q&A over the guides. Passages are retrieved with a BM25 index (`lib/rag.ts`); Gemini answers only from them and must cite passage ids, which code verifies. Without a key it returns the passages themselves.
- **Route map** (home): all ten providers side by side, with bars for hands-on time (our estimate) and the wait providers state.
- **How it works** (`/how-it-works`): end-to-end explanation with an architecture diagram.
- **Method** (`/method`): what each label means and what is and is not verified.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY (and optionally COMPOSIO_API_KEY)
npm run dev                  # http://localhost:3000
npm test                     # guardrail tests (offline)
npm run validate             # schema + consistency checks on every library guide
npm run verify-quotes        # re-matches every library quote against the live page (needs internet)
```

Deploy: push the repo to GitHub, import it in Vercel (framework Next.js, no build settings needed). `next.config.ts` already ships `data/guides` with the API functions. Add the variables below under Project Settings → Environment Variables. **Never commit keys**; `.env*` is git-ignored and the app never asks users for credentials.

Without `GEMINI_API_KEY` the library works and `/live` says it is not configured (it does not make anything up).

## Key decisions

1. **Evidence-first, not fluent-first.** Every claim carries one tag: *tested*, *sourced*, *reported*, *inferred*, *unknown*. Time estimates are tagged *inferred* because no provider publishes hands-on time.
2. **Code, not the model, polices honesty.** For live guides: evidence must come from a page fetched in that run; each quote must literally appear in that page's text or it is removed; a *sourced* claim that loses its evidence is downgraded to *inferred*; the model cannot mark anything *tested*; output must pass a schema and consistency checks or nothing is shown (`lib/postprocess.ts`, `tests/guardrails.test.ts`).
3. **Fetched pages are data.** Prompts fence page text; the agent has a fixed action budget and time budget; fetches block private/loopback addresses on every redirect hop; input is cleaned; `/api/generate` is rate limited (best-effort in-memory, per instance).
4. **Agent loop kept simple.** The model chooses the next search or page (JSON action), code executes it. Chosen over SDK function-calling to keep behaviour predictable and the model swappable (`GEMINI_MODEL`).
5. **Where Composio's existing guides stop, we start.** Composio publishes 46 setup guides at composio.dev/auth. We read ten in full: none gives setup time, difficulty or troubleshooting, and several never mention approval. We cite them as sources and add what they omit; we did not copy their text.
6. **Tiers**: 1 self-serve · 2 light checks · 3 review required · 4 gated / partner approval, each with a written rationale.

## What was verified, and what was not (be skeptical of anything not in this list)

- Library guides were researched on 2026-10-20 from provider docs and Composio's guides. Quotes were collected through a page-reading tool that summarises pages, so each is marked `quote_check: "unchecked"` until `npm run verify-quotes` is run from an open network.
- Guardrail and retrieval logic is unit-tested offline (9 tests): quote matching, SSRF blocks, input cleaning, rate limiting, downgrade-on-fabricated-quote, retrieval ranking, off-topic rejection, citation checking.
- The production build, page rendering (desktop and 390px width) and the API's refusal paths were checked locally.
- **Not yet verified here**: the live agent end-to-end with a real Gemini key and open internet; Composio's toolkit endpoint response shape; DuckDuckGo HTML search reliability. See `docs/TESTING.md` for the hands-on registration log template and the prediction-vs-outcome check for unseen apps.
- **Hands-on registrations**: none logged in the first build, so "What was tested" is empty on every guide rather than claimed.

## Limitations

- Provider docs change; each guide shows its last-verified date.
- Approval wait times are rarely published; where unstated, we say so.
- Live guides are unreviewed by a person and are labelled that way.
- Gemini free-tier content may be used by Google to improve its products (per Google's pricing page, 2026-10-20). The agent sends only the app name and public page text.
- Free-tier rate limits are per project and shown in Google AI Studio; heavy use will hit them. Vercel Hobby function duration was not confirmed, so the route is set to 60 s and the agent stops researching at 30 s.
- Share links for generated guides are not implemented; use "Copy guide JSON".


## Update 2026-10-20

- All 10 guides rewritten with facts from official pages (Slack review maxima and 10-workspace rule, Google test-mode limits, Microsoft secret lifetime, Notion listing review, Salesforce security-review stages, LinkedIn 60-day tokens and tiers, Meta app modes, Shopify distribution rules). Each fact cites a quoted excerpt; all quotes are still `unchecked` until `npm run verify-quotes` runs from an open-internet machine.
- Share links: set `SHARE_SECRET` (16+ chars) in host env vars. The live agent then returns `/s/<token>`, a signed, compressed copy of the guide. Nothing is stored. No secret means no links.
- UI restyled to follow composio.dev (Geist + JetBrains Mono, dark bands, square corners).
- Still not done: hands-on registrations (nothing is tagged Tested), live-agent run against real Gemini, deployment.
