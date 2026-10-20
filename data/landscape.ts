/** Read 2026-10-20 and re-checked 2026-10-21 from each company's own public pages. Marketing claims, not independently verified. "Not stated" means the page we read did not say, not that the company does not do it. */
export const COMPOSIO_FACTS: { k: string; v: string; src: string }[] = [
  { k: "Positioning", v: "An integration layer that lets AI agents and assistants act in 1,500+ apps, with managed auth, tool execution, triggers and sessions.", src: "https://composio.dev" },
  { k: "Managed OAuth", v: "Composio can supply the OAuth app users authorize, so a developer needs no provider registration. A custom auth config is needed to bring your own app, request specific scopes, or use a toolkit without managed auth.", src: "https://docs.composio.dev/docs/authentication.md" },
  { k: "What the auth docs omit", v: "The authentication page describes no developer OAuth-app approval or review process. That is the gap our guides address.", src: "https://docs.composio.dev/docs/authentication.md" },
  { k: "Existing guides", v: "46 guide entries at composio.dev/auth (45 distinct apps; Slack is listed twice). Most are apps outside our library.", src: "https://composio.dev/auth" },
  { k: "Pricing", v: "Hobby $0 (100,000 tool calls and 50,000 trigger events a month, 3 team members); Pro $29 a month (includes a $29 usage credit); Enterprise custom. Connected accounts are unlimited with your own app. With Composio-managed apps the first 1,000 connections are free, managed apps cover only 20K of the 100K free calls, and calls then cost $0.0005 instead of $0.0003.", src: "https://composio.dev/pricing" },
  { k: "Rate limits", v: "2,000 requests a minute on Hobby, 10,000 on Pro, per organization; OAuth and connected-account calls share that budget.", src: "https://docs.composio.dev/reference/rate-limits.md" },
  { k: "Recent auth changes", v: "The newest auth entry is callback identity verification for OAuth connections (Jul 30, 2026), then an endpoint to revoke OAuth 2.0 tokens for a connected account (May 12, 2026). Entries after that, up to Sep 4, 2026, are SDK and CLI updates.", src: "https://docs.composio.dev/docs/changelog.md" },
  { k: "Terminology to use", v: "user ID, session, toolkit, tool, auth config, connected account, Connect Link. Retired terms: entity ID, integration, connection, action.", src: "https://docs.composio.dev/docs/how-composio-works.md" },
];

export const COMPETITORS: { name: string; what: string; scale: string; oauth: string; src: string }[] = [
  { name: "Nango", what: "Open-source integration platform: auth, tools, syncs, webhooks, proxy.", scale: "1,000+ APIs and 10,000+ tools and templates", oauth: "Not stated on the landing page whether you register your own OAuth app.", src: "https://www.nango.dev" },
  { name: "Arcade.dev", what: "Actions runtime for agents: auth, authorization, policy and audit around tool calls.", scale: "8,000+ tools", oauth: "Not stated whether you register your own OAuth app; auth runs against your identity provider.", src: "https://www.arcade.dev" },
  { name: "Pipedream Connect", what: "Managed auth, prebuilt tools and triggers, API proxy for agents and apps.", scale: "3,000+ APIs and 10,000+ prebuilt tools and triggers", oauth: "Its hosted OAuth clients by default; you can bring your own.", src: "https://pipedream.com/connect" },
  { name: "Paragon", what: "Integration platform for AI and SaaS products: ActionKit, Managed Sync, workflows.", scale: "130+ connectors", oauth: "Not described on the page read.", src: "https://www.useparagon.com" },
  { name: "Merge Agent Handler", what: "Connects agents to tools with auth, DLP guardrails, scoped tool packs and audit.", scale: "\"Thousands\" of pre-built tools (no exact count)", oauth: "Guided authorization flow; registration of your own app not stated.", src: "https://www.merge.dev/products/agent-handler" },
  { name: "Auth0 Token Vault", what: "Stores users' third-party access and refresh tokens so agents can call APIs for them.", scale: "A handful of named providers plus custom", oauth: "Not stated on the page read.", src: "https://auth0.com/ai/docs/intro/token-vault" },
  { name: "Zapier MCP", what: "MCP access to Zapier's apps for AI clients; each tool call uses two Zapier tasks.", scale: "9,000+ apps", oauth: "Zapier's managed connection layer; not applicable to registering your own app.", src: "https://zapier.com/mcp" },
];

export const LANDSCAPE_TAKEAWAY =
  "Across the competitor pages we read, none mentioned guidance on registering and getting a provider OAuth app approved. Their pages say they handle auth and token refresh. That is a landing-page observation, not proof that their docs lack it, but it suggests the decision a developer faces before launch is under-served everywhere.";
