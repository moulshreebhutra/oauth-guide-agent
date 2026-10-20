# OAuth Route Map: APM Integrations take-home

**Live:** https://oauth-guide-agent.vercel.app · **Repo:** https://github.com/moulshreebhutra/oauth-guide-agent · Built by Moulshree Bhutra for Composio's APM, Toolkits take-home.

## The problem, and the choice I made
A developer who wants their users to connect an app may first have to register an OAuth app with the provider and get it approved. They cannot tell whether that is an hour or weeks, what blocks approval, or what an agent can do for them. Existing setup guides cover the clicking and skip the decision.

Scope: a focused slice that answers the developer's questions **before** they start: how hard is it, how much of my time, how long is the wait, what are the catches, what can an agent do and where do I take over, and how sure are you. Ten researched providers chosen for different kinds of difficulty, plus a live agent for any other app.

## What is in it
| Page | What it does |
|---|---|
| **Home** | Look up any app by name or website (library guide, or straight to the live agent). Explains the three pieces people mix up (provider OAuth app, your integration, your users' connections). Compares all ten providers side by side: difficulty, your time, the provider's approval wait, and whether Composio can manage the OAuth app. |
| **Guides** (`/guide/<app>`) | Per provider: difficulty tier with a written reason, hands-on time, approval wait, Composio managed-auth status, requirements, scopes, steps (marked *you* / *agent* / *either*, with why-not-agent), blockers with fixes and when to escalate, next actions, what was tested, what is uncertain, sources with quoted excerpts. Includes an Ask box scoped to the guide. |
| **Live agent** (`/live`) | Type an app name or website. The agent probes Composio and the provider's OAuth discovery, searches, reads the provider's pages and writes a guide, streaming its progress. Code checks the result (below). The guide comes with a **share link** (signed, stateless) and a JSON copy. |
| **Ask** | Question answering over all the guides: BM25 retrieval with synonym groups (approval = review = verification), optionally re-ordered by Gemini embeddings when that key works (no vectors are prebuilt, so by default plain keyword order); a model writes the answer from the retrieved passages and code verifies every citation. App names and "tell me everything about X" return that guide in reading order. Questions about apps outside the guides are answered from live web research (Tavily search plus the provider's own pages) with sources, or from general model knowledge, and labelled as such. |
| **Findings** (`/findings`) | What the research taught us, what was corrected or held back, what could not be verified. |
| **How it works / Method** | Architecture, the evidence labels, what code checks, the plan for scaling to 100 apps. |

## Key findings (details on `/findings`)
- Registering is often instant; the wait attaches to a later step (Marketplace listing, package security review, scope review).
- No official page gave an approval duration for 3 of 10 providers; where a number exists it is often a maximum (Slack) or one stage (HubSpot).
- Composio's own toolkit pages say "Composio-managed OAuth available" for 9 of the 10 providers; **Shopify** says not available, so a developer there registers first.
- Existing guides give steps but no setup time, difficulty or troubleshooting.

## Evidence and honesty
Every claim carries one tag: **tested** (we did it), **sourced** (a quoted excerpt supports it), **reported** (community or third party only), **inferred** (our reasoning), **unknown**.
- Hands-on time is *inferred* because no provider publishes it.
- For live guides code, not the model, enforces honesty (`lib/postprocess.ts`): evidence must come from a page fetched in that run; each quote must literally appear in that page or it is removed; a *sourced* claim that loses its evidence is downgraded to *inferred*; the model can never mark anything *tested*; the guide must pass a schema and consistency checks or nothing is shown.
- **Not yet done, and said plainly:** no hands-on registration is logged, so nothing is tagged *tested*; library quotes are `unchecked` until `npm run verify-quotes` is run from an open network; the prediction-vs-actual check for unseen apps (`docs/TESTING.md`) has not been run.

## Agents, and how they are kept reliable
- The live agent picks searches and pages (JSON actions), code executes them under an action and time budget, blocks private/loopback addresses on every redirect, and treats page text as data.
- Models: each call goes through a small router (`lib/llm.ts`) that tries **Claude** or **Groq** first, then **Gemini** or **OpenRouter**, then Claude again as the last resort; writing a whole guide goes to Claude first with most of the time. A provider without a key is skipped and every failure is reported by name. Verified live: Claude, Groq, OpenRouter. Gemini is wired in but currently answers 429/503 until billing is enabled on the Google project, so it is optional.
- Web search is Tavily (`TAVILY_API_KEY`); DuckDuckGo is the keyless fallback but blocks most cloud hosts. When a page blocks the fetch, the search engine's own copy of its text is used and labelled.
- Finished guides are cached for six hours (server memory and the browser); a repeat request returns at once and does not count against the rate limit. If every model fails, Ask returns a summary composed by code from the guides' own sentences, labelled as not written by AI.
- `/api/health` shows which models your key can see and which answer right now (never the key). `npm run check:live -- <url>` runs an end-to-end check of the deployed site.

## Run it
```bash
npm install
cp .env.example .env.local     # fill in the keys you have; every key is optional
npm run dev                    # http://localhost:3000
npm test                       # offline tests (guardrails, share links, retrieval, citations)
npm run validate               # schema + consistency checks on every library guide
npm run verify-quotes          # re-matches every library quote against the live page (needs internet)
npm run check:live -- https://oauth-guide-agent.vercel.app
ANTHROPIC_API_KEY=... npx tsx scripts/batch-generate.ts "Linear" "Zoom"   # research more apps for review
```
Environment variables (host secrets only, **never commit keys**; `.env*` is git-ignored and the app never asks users for credentials):
`ANTHROPIC_API_KEY` (primary model) · `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY` (optional extra providers) · `TAVILY_API_KEY` (web search for the live agent) · `SHARE_SECRET` (16+ chars, enables share links) · `COMPOSIO_API_KEY` (optional, managed-auth lookup for live guides) · `ANTHROPIC_MODEL`, `GEMINI_MODEL`, `GEMINI_EMBED_MODEL`, `GROQ_MODEL`, `OPENROUTER_MODEL` (optional overrides).
Deploy: import the repo in Vercel (Next.js, no build settings), add the variables, redeploy after any change. Pushes to `main` deploy automatically.

## From 10 guides to 100
`scripts/batch-generate.ts` runs a list of apps through the same agent and saves each guide to `data/guides/_generated` for review. Plan: seed from Composio's managed-auth directory, batch, review a sample against provider docs and `verify-quotes`, promote reviewed guides, re-check on a schedule. Unreviewed guides stay labelled as agent-generated.

## Limitations
- Provider docs change; each guide shows its last-verified date.
- Approval durations are rarely published; where unstated the guide says so.
- Live guides are not reviewed by a person and are labelled that way. Share links carry the whole guide in the URL; very long guides get no link (copy the JSON instead).
- Free-tier model limits are per project; heavy use will hit them, which is why Ask falls back to other providers and then to code.
- The agent sends model providers only the app name and public page text. Free tiers of some providers may use inputs to improve their products.
- Composio's managed-auth status for Google and Meta was read from the Gmail and Facebook toolkit pages; other toolkits under those providers were not each checked.


## Extras beyond the brief
- `/plan`: launch planner. Pick providers; get start order, earliest and latest launch date, and what stays unknown. Shareable URL.
- `/compare`: up to three providers side by side.
- Guide page buttons: copy as Markdown, copy an agent brief (stops where a person must act), print or save PDF, copy a README badge.
- `/api/guides` and `/api/guides/<slug>`: JSON for agents and tools. `/llms.txt` describes them. `/badge/<slug>` returns an SVG badge.
- Model fallbacks: Claude, Groq, Gemini and OpenRouter as described under Agents. Groq and OpenRouter answered live in testing; Gemini did not (quota).
