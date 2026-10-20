/** Patterns across the ten researched guides, used (a) on /playbook and (b) as calibration context when we research an app that is not in the library.
 *  Every line restates something already sourced in a library guide; it is a pattern, never evidence about a specific unseen app. */
export const PATTERNS: { title: string; body: string }[] = [
  { title: "Registering is rarely the hard part", body: "In the ten guides, creating the OAuth app is quick (GitHub, Notion). The wait attaches to something later: a Marketplace listing (Notion, HubSpot, Slack), a security review of a distributed package (Salesforce), publisher verification (Microsoft), or a scope or permission review (Google, LinkedIn, Meta)." },
  { title: "What usually triggers a review", body: "Letting other companies or merchants use your app (Shopify, Slack), asking for sensitive or restricted data scopes (Google), posting or community access (LinkedIn), going live beyond your own testers (Meta), or getting listed in a marketplace." },
  { title: "What reviewers tend to ask for", body: "A public home page and privacy policy on a domain you can prove you own (Google brand verification), a verified business or partner account (Meta Business Verification, Microsoft publisher verification), and a clear reason for each permission." },
  { title: "Testing without approval", body: "Several providers let you try the integration with your own account or named test users before any review: Google 'Testing' mode (up to 100 test users), Meta development mode, a Slack single-workspace app, GitHub OAuth apps." },
  { title: "Durations are often unpublished", body: "Where a provider states a number it is often a maximum (Slack) or one stage (HubSpot's initial review). Shopify, LinkedIn and Meta publish none in the pages we read. Treat blog timelines as unverified." },
  { title: "Secrets and expiry", body: "Client secrets never belong in code or chat. Tokens expire (LinkedIn access tokens last 60 days) and secrets can have lifetimes (Microsoft), so plan for refresh and rotation." },
  { title: "Where an agent helps and where you take over", body: "An agent can read the docs, draft listing text and privacy-policy checklists, check redirect URIs and scopes, and probe public OAuth discovery documents. You must sign in, accept terms, prove domain or business ownership, pay any fees, hold the secrets and press submit." },
];

export const CHECKLIST: string[] = [
  "Does the provider let me create an OAuth app on my own account without anyone approving it?",
  "Can I test with my own account or named test users, and what are the limits (user count, scopes)?",
  "What exactly makes me need a review: other companies installing it, sensitive scopes, a marketplace listing, posting access?",
  "Is there a published review duration, and is it a typical time or a maximum?",
  "What will the reviewer ask for: privacy policy, verified domain, business verification, screencast, justification per permission?",
  "Does Composio manage the OAuth app for this provider (its toolkit page says so), so I can start without registering one?",
  "How long do tokens and secrets last, and how are they refreshed or rotated?",
  "Which steps can an agent do, and which need my sign-in, a legal acceptance or a payment?",
];

export const playbookText = () => PATTERNS.map((p) => `- ${p.title}: ${p.body}`).join("\n");
