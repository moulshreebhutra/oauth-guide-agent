import { PageHead } from "@/components/PageHead";

export default function Method() {
  return (
    <main>
      <PageHead eyebrow="What was checked, and how" title="How this was built and checked" />
      <div className="wrap narrow prose">

      <h2>The gap</h2>
      <p>
        Composio already lists 46 OAuth setup guides (45 apps) at composio.dev/auth. We read ten of them in full (GitHub, Notion, Slack, Salesforce, HubSpot, Outlook, Shopify, Google, LinkedIn, Meta). Each covers the clicking. In the ten we read, none gives a setup time, a difficulty rating or a troubleshooting section, and the LinkedIn, Meta, Shopify and Outlook ones do not mention provider approval, review or verification at all. Composio&apos;s Google guide says only that you &quot;may need to submit the app for Google verification&quot;.
      </p>
      <p>This project adds what is missing and shows how sure we are about each piece.</p>

      <h2>How every claim is labelled</h2>
      <ul>
        <li><b>Tested</b>: a person did it against the real provider and logged it. Nothing is tagged Tested until that log exists.</li>
        <li><b>Sourced</b>: stated on a linked page, with the quote shown. In live generation, code checks the quote appears in the page the agent actually fetched.</li>
        <li><b>Reported</b>: only community or third-party sources say so.</li>
        <li><b>Inferred</b>: our reasoning. All of our &quot;hands-on minutes&quot; are inferred, because no provider publishes them.</li>
        <li><b>Unknown</b>: we looked and could not find out.</li>
      </ul>

      <h2>What is checked by code (live agent)</h2>
      <ul>
        <li>Evidence must come from a page fetched in that run; excerpts must literally appear in the page text or the evidence is dropped.</li>
        <li>A claim marked Sourced that loses its evidence becomes Inferred (Reported if only community pages back it). A Sourced claim must share wording with the page it cites, and any year must appear there, and every figure of 10 or more must be on a cited page (otherwise it becomes Inferred). The model cannot mark anything Tested.</li>
        <li>&quot;No review is mentioned&quot; is an absence, so it is never Sourced. A forum or community page is never counted as official, even on the provider&apos;s own domain. A Tier 3 or 4 needs a Sourced review step or it is lowered to Tier 2. Steps done in the provider&apos;s console are always yours. An unsupported gotcha that is not about setup, auth, review or limits is dropped.</li>
        <li>Output must pass a schema and consistency checks, or nothing is shown.</li>
        <li>Fetched pages are treated as data, never instructions. Outbound fetches refuse private and loopback addresses and are size, time and step capped. Live generation is rate limited.</li>
      </ul>

      <h2>What the library guides rest on</h2>
      <p>
        The ten library guides were researched from provider documentation and Composio&apos;s own guides on 2026-10-20. Quotes were captured through a page-reading tool that summarises pages, so each quote is marked &quot;not yet re-matched against the raw page&quot; until the verify script (<code>npm run verify-quotes</code>) is run from a machine with open internet access.
      </p>

      <h2>How the live agent was audited</h2>
      <p>We generated guides for 23 apps outside the library (for example TikTok, Zoom, Square, Xero, Spotify, Okta) and read each guide next to its step log and sources. That found real faults, which are now fixed in code: a marketplace listing raising the tier, forum numbers marked Sourced, the provider's quota or certification page never being read, console steps given to the agent, and sources that did not support their claim. This was a read-through. It is not a hands-on registration and does not make any claim Tested.</p>

      <h2>Limits you should know about</h2>
      <ul>
        <li>No provider was registered by hand in the first build; the &quot;What was tested&quot; sections are empty until real attempts are logged.</li>
        <li>Difficulty tiers and effort times are judgements, shown with their rationale.</li>
        <li>Approval wait times are almost never published; where unstated we say so rather than guess.</li>
        <li>Official documentation can change; each guide shows when it was last verified.</li>
      </ul>
      </div>
    </main>
  );
}
