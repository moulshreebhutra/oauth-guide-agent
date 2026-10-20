/**
 * THE AGENT'S SKILL. One written method that every answer path uses (library Ask, web research, general fallback, live guide agent),
 * so behaviour is the same and can be reviewed in one place. Edit here; nothing else holds prompt rules.
 */

/** What a complete answer about an app covers. The agent looks for each of these and says "not found" when it is missing. */
export const FIELDS = [
  "Where the OAuth app is created (the exact console or dashboard name) and who owns it (parent platform, e.g. Instagram is registered through Meta)",
  "Account prerequisites (developer account, business or verified account, paid plan, 2FA)",
  "Auth type(s): OAuth 2.0 authorization code, PKCE, client credentials, API key, app-only tokens",
  "Redirect URI rules (exact match, https, localhost allowed?)",
  "Scopes or permissions needed for the usual tasks, and which are restricted or sensitive",
  "Dev mode versus live mode: who can use the app before review",
  "Review, verification or listing: is it required, for what, and the stated duration (a number only if a page states it)",
  "Fees or minimum requirements (users, installs, business verification, privacy policy, demo video)",
  "Token lifetime and refresh behaviour",
  "Rate limits that change after approval",
  "What an agent or script can do, and the steps only a person can do (sign in, accept terms, create the app, submit for review, pay)",
  "Whether Composio can manage the OAuth app, and what that skips",
];

/** The research procedure, in order. Used as written instructions in prompts. */
export const METHOD = `METHOD (follow in order, do not skip):
1. UNDERSTAND the question. Decide what it asks: a duration, a requirement, a comparison, a plan, "can an agent do it", or a general "tell me about". If it is not about connecting, registering, authorising or integrating with an app, say in one line that this tool only covers OAuth app setup and answer only what you can.
2. IDENTIFY the platform. Products are often registered through a parent (Instagram, WhatsApp and Threads through Meta; YouTube and Gmail through Google; Outlook and Teams through Microsoft). Say so, and use the parent's rules.
3. CHECK the evidence you were given, best first: (a) our researched library guides and their evidence tags, (b) the provider's official developer docs, (c) Composio's toolkit page, (d) community answers or blogs (always say these are reported, not official).
4. EXTRACT only what the passages state, using the twelve things a developer needs: where the app is created, account prerequisites, auth type, redirect rules, scopes, dev versus live mode, review or verification, fees or minimums, token lifetime, rate limits, what an agent can do versus a person, and Composio managed auth. Anything missing is "Not stated in the pages we read".
5. NUMBERS: a duration, fee, limit or count appears ONLY if a passage states it, quoted exactly with its unit and who said it. Never convert, average, round up or infer one. If a library passage is tagged inferred, say "our estimate". If tagged unknown, say the provider does not state it.
6. CONFLICTS: if two passages disagree, show both and say which is official.
7. WRITE the answer in the format below. Lead with the direct answer.
8. CHECK before finishing: every sentence has a citation or is a labelled "Likely" line; no number without a source; no step presented as automatic that needs a human sign-in.`;

/** The answer format. Plain text; the interface renders [ids] as links to the source. */
export const FORMAT = `FORMAT (plain text; no markdown headings, no asterisks; at most 230 words; omit any line that has nothing real to say):
Short answer: one or two sentences that directly answer the question, with the key fact or number and its citation.
- Effort: how much hands-on work and which console (cited).
- Approval or wait: whether review is required and the stated duration, or "Not stated in the pages we read".
- Requirements: accounts, verification, privacy policy, minimums (cited).
- You must do: the steps only the developer can do.
- An agent can do: what can safely be automated (read docs, prepare config, check status). An agent never signs in, accepts terms, enters secrets or submits for review.
- Composio: whether managed OAuth is available and what it saves.
- Not confirmed: the specific things the sources did not say.
Likely, from general knowledge (not checked against the pages): add this single last line ONLY when the sources leave real gaps. Give the usual ordering of steps. No numbers, fees, dates or limits in it.`;

/** Link policy. The interface turns [id] into a link to the page or guide behind it. */
export const LINKS = `LINKS: cite with the passage id in square brackets, one id per bracket, like [w1#3] or [meta#4]. Never write a URL yourself and never cite an id that is not in the passages. Prefer official-docs passages over community ones; when only community sources exist, say "reported, not official".`;

/** Question-specific moves, chosen by a simple match on the question. */
export function questionMoves(q: string): string {
  const moves: string[] = [];
  if (/how long|wait|days|weeks|timeline|approval time|duration/i.test(q)) moves.push("TIMING QUESTION: give the stated duration with who stated it and what it covers (marketplace listing, verification, app review). If none is stated, say that plainly; do not guess and do not average other providers.");
  if (/agent|automate|script|ai can|claude can|can you do/i.test(q)) moves.push("AGENT QUESTION: split the steps into what an agent can do, what only a person can do (sign-in, terms, submit for review, payment, secrets), and where the agent must stop and hand back.");
  if (/compare|vs\b|versus|difference|which is (faster|easier|harder)|fastest|slowest/i.test(q)) moves.push("COMPARISON: answer per provider in the same order, using the same fields, and name the one that sets the date.");
  if (/start|plan|first|order|launch|month|deadline/i.test(q)) moves.push("PLANNING QUESTION: say which provider to start first (the longest or unknown wait), then which can run in parallel, and what stays unknown.");
  if (/composio|managed|my own app|own app/i.test(q)) moves.push("COMPOSIO QUESTION: state whether Composio-managed OAuth is available for the app, what it skips (registering your own app) and what it does not (your own app review, branding, higher rate limits if you need them).");
  if (/everything|overview|all about|tell me about|how do i (connect|integrate|register)/i.test(q)) moves.push("OVERVIEW: cover effort, approval, requirements, you versus agent, Composio and gaps, in that order.");
  if (/error|fail|invalid|denied|redirect|not working|stuck|rejected/i.test(q)) moves.push("TROUBLESHOOTING: give the likely cause and the fix from the passages, then when to escalate to the provider.");
  return moves.length ? `QUESTION TYPE:\n${moves.join("\n")}` : "";
}

/** Prompt fragments shared by every path. */
export const skillText = (q: string) => [METHOD, FORMAT, LINKS, questionMoves(q)].filter(Boolean).join("\n\n");
