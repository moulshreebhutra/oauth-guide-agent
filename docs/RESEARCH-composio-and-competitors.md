# Research notes: Composio and competitors (read 2026-10-20)

Method: public pages only (composio.dev, docs.composio.dev incl. llms.txt, authentication, core concepts, rate limits, changelog, pricing, /auth index; competitor landing pages). Pages were read through a summarising fetch tool, so treat figures as "as stated on the page", and re-check before quoting. "Not stated" = absent from the page read.

## Composio
- Homepage: "Give your AI secure access to 1,500+ apps in minutes." Claims 100M+ AI actions a week, 100,000 free tool calls a month, SOC 2 Type II and ISO 27001:2022. Products: For You (consumer assistants), Developer Platform, CLI, Enterprise, MCP Gateway, Instant (per-call tool access).
- Docs map (llms.txt): quickstart, core concepts, authentication, configuring sessions, providers/frameworks, sessions via MCP, single-toolkit MCP, troubleshooting (KB), rate limits, API reference v3.1, changelog, full docs at /llms-full.txt, index at /llms-index.txt, agent skill on GitHub (ComposioHQ/composio, skills/composio/SKILL.md).
- Concepts: session (per user), toolkit, tool (`TOOLKIT_ACTION`), auth config (`auth_config_id`, old term "integration"), connected account (old "connection"), Connect Link, triggers. Auth is always per user ID (use a stable ID, never `default` in production).
- Managed OAuth is the default; a custom auth config is for your own OAuth app, specific scopes, or toolkits without managed auth. White-labeling = own OAuth app. **The authentication page describes no developer OAuth-app approval or review process.**
- Per-toolkit docs pages (docs.composio.dev/toolkits/<name>) state auth methods and "Composio-managed OAuth available / not available". Read for our ten: available for GitHub, Notion, HubSpot, Salesforce, Outlook, Slack, Gmail, LinkedIn, Facebook; **not available for Shopify**.
- /auth index: 46 OAuth2 guides. Not in our library (36): Slack custom app, Trello, Gong, Ramp, PagerDuty, Docusign, Apollo, RocketLane, Telegram, Linear, Calendly, Supabase, TickTick, Workday, Twitter/X, Dropbox, Zendesk, Confluence, Instantly, PostHog, Stripe, Strava, Snowflake, Zoho CRM, Monday, Pipedrive, Xero, Jira, GitLab, Canva, Asana, Zoom, Airtable, Gorgias, Daytona, Fathom.ai (saved as data/seed-apps.txt).
- Pricing: Hobby $0 (100K tool calls, 50K trigger events, unlimited connected accounts, 3 members); Pro $29/mo (10,000 req/min, overage $0.0003 per tool call); Enterprise custom. Composio-managed apps: up to 20K of the 100K free calls, then $0.0005/call; first 1K connected accounts free then $0.10 each.
- Rate limits: 2,000 req/min Hobby, 10,000 Pro, per organization; OAuth and connected-account calls share the budget; 429 with `Retry-After`.
- Changelog highlights: callback identity verification for OAuth connections (Jul 30, 2026); revoke OAuth 2.0 tokens endpoint (May 12); credential redaction for managed auth (Apr 22); bearer-token connections (Apr 7).

## Competitors (their own landing pages)
| Tool | What | Scale | Own OAuth app? |
|---|---|---|---|
| Nango | Open-source integrations: auth, tools, syncs, proxy | 1,000+ APIs | not stated |
| Arcade.dev | Actions runtime: auth, policy, audit | 8,000+ tools | not stated |
| Pipedream Connect | Managed auth, tools, triggers, proxy | 3,000+ APIs | hosted clients by default, bring your own allowed |
| Paragon | ActionKit, Managed Sync, workflows | 130+ connectors | not described |
| Merge Agent Handler | Tools with DLP, scoped packs, audit | thousands (unclear) | not stated |
| Auth0 Token Vault | Stores user tokens for agents | few named providers | not stated |
| Zapier MCP | MCP over Zapier apps | 9,000+ apps | n/a (Zapier connections) |

## What this means for the project
1. Whitespace: none of the pages read mention helping a developer register and get a provider OAuth app approved. (Landing pages only; their docs may.)
2. Composio's managed OAuth changes the question: the guide should say whether you even need your own app (9 of our 10: no, to start).
3. Use Composio's vocabulary (auth config, connected account, Connect Link) so guides read as native to their docs.
4. The 36 uncovered apps in /auth are a ready seed list for batch generation and for demonstrating the live agent.
5. Next crawl, if wanted: docs.composio.dev/llms-full.txt (complete docs), the KB topic "Authentication and connected accounts", each competitor's docs (not just landing pages), and Composio's blog and changelog for review-process stories.
