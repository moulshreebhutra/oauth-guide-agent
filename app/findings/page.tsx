import Link from "next/link";
import { loadGuides } from "@/lib/guides";
import { PageHead } from "@/components/PageHead";
import { Logo } from "@/components/Logo";

export const metadata = { title: "What we found · OAuth Route Map", description: "What researching ten providers taught us, what we corrected, and what we could not verify." };

export default function Findings() {
  const gs = loadGuides();
  const n = gs.length;
  const tier = (t: number) => gs.filter((g) => g.difficulty.tier === t).length;
  const unpublished = gs.filter((g) => (g.wait.kind ?? "") === "unpublished" || g.wait.tag === "unknown").map((g) => g.app.replace(/\s*\(.*\)/, ""));
  const managedYes = gs.filter((g) => g.composio_managed.status === "yes").length;
  const managedNo = gs.filter((g) => g.composio_managed.status === "no").map((g) => g.app.replace(/\s*\(.*\)/, ""));
  const gaps = gs.map((g) => ({ g, items: g.uncertainties.filter((u) => !/^No hands-on|^No hands-on/i.test(u)) }));
  return (
    <main>
      <PageHead
        eyebrow="Findings"
        title={<>What we learned, <mark className="hl">corrected</mark> and could not verify</>}
        lede={`We researched ${n} providers chosen for different kinds of difficulty. This page is the honest summary of what that taught us, and where the evidence is thin.`}
      />
      <div className="wrap narrow prose">
        <h2>What we learned</h2>
        <div className="finding"><h3>Registering is often instant. Approval attaches to what comes after.</h3>
          <p>{tier(1)} of {n} providers are register-and-go (tier 1). Where there is a wait, it usually belongs to a later step: a Marketplace listing (Notion, HubSpot, Slack), a security review of a distributed package (Salesforce), or a scope review (Google, LinkedIn, Meta). A developer who only needs to connect their own account can often skip all of it, so the useful question is &quot;which step needs the provider to say yes?&quot;, not &quot;how long does approval take?&quot;.</p></div>
        <div className="finding"><h3>Providers rarely publish how long approval takes.</h3>
          <p>No official page we read gives a duration for {unpublished.length} of {n} ({unpublished.join(", ")}). Where a number exists it is often a maximum (Slack&apos;s &quot;up to&quot; figures) or a range for one stage. Third-party blogs claim timelines; we did not use them. The guides say &quot;not published&quot; instead of guessing.</p></div>
        <div className="finding"><h3>For most providers a developer may not need their own OAuth app to start.</h3>
          <p>Composio&apos;s own toolkit pages say &quot;Composio-managed OAuth available&quot; for {managedYes} of {n} providers. {managedNo.join(", ")} says &quot;not available&quot;, so there the developer registers first and the provider&apos;s rules apply in full. We found this by reading each toolkit&apos;s docs page, because the managed-auth directory page only fills in its toolkit list with script.</p></div>
        <div className="finding"><h3>Existing setup guides cover the clicking, not the decision.</h3>
          <p>Composio lists 46 setup guides (45 apps). The ten we read give steps but no setup time, difficulty rating or troubleshooting, and several never mention approval. That is the gap these guides fill, and we cite theirs as sources rather than copying them.</p></div>

        <h2>What we corrected or held back</h2>
        <div className="finding"><h3>Managed-auth status was &quot;not checked&quot;. Now sourced for all ten.</h3><p>The first version said &quot;not checked against the Composio API&quot; for nine guides. Reading each toolkit page replaced that with a quoted statement, and turned Shopify into the one exception.</p></div>
        <div className="finding"><h3>Slack times are shown as maximums.</h3><p>Slack states &quot;up to&quot; review times. The table shows &quot;Up to ~12 weeks&quot; and says they are not typical times, rather than presenting a maximum as the expected wait.</p></div>
        <div className="finding"><h3>HubSpot wait converted to calendar days.</h3><p>HubSpot says its team finishes an initial Marketplace review within 10 business days, and the feedback process should take no more than 60 days after feedback is shared. We converted 10 business days to 14 calendar days for the numeric range and kept HubSpot&apos;s own wording visible on the guide.</p></div>
        <div className="finding"><h3>Shopify&apos;s fee is not presented as fact.</h3><p>The only figure we found for Shopify&apos;s registration fee came from a community reply, so it is excluded from the claims and listed as unverified.</p></div>
        <div className="finding"><h3>GitHub&apos;s client-secret step is credited to its source.</h3><p>GitHub&apos;s page ends at &quot;Register application&quot;. The client-secret step comes from Composio&apos;s guide, and the guide says so.</p></div>

        <h2>What testing the live agent taught us</h2>
        <p>We generated guides for 23 apps outside the library and read each one against its step log and sources. This is a read-through, not a hands-on test. Faults we found, and what changed:</p>
        <div className="finding"><h3>A marketplace listing is not a gate on your own app.</h3><p>Square came out as &quot;partner approval required&quot; because the agent read pages about the optional App Marketplace. A high tier now needs an official page that states the gate; otherwise it is capped at Tier 2 and says so.</p></div>
        <div className="finding"><h3>Forum numbers looked official.</h3><p>Dropbox&apos;s 50 and 500 user limits appeared only in community posts but were tagged Sourced. A number that only a community page contains is now Reported, and forum pages are never treated as official, even on the provider&apos;s own domain.</p></div>
        <div className="finding"><h3>The agent skipped the pages that answer &quot;how long&quot;.</h3><p>Spotify&apos;s quota page and Xero&apos;s certification page were in the search results but were not read. The agent now runs three fixed searches for review, access-tier and quota pages and reads the best provider matches.</p></div>
        <div className="finding"><h3>&quot;Nothing mentioned&quot; is not a finding.</h3><p>Several guides called a path self-serve with a Sourced tag because a page did not mention a review. An absence is now Unknown or Inferred, never Sourced.</p></div>
        <div className="finding"><h3>Sources that did not support the claim.</h3><p>Okta cited a pricing page for a free-plan claim. A Sourced claim must now share wording with its cited page, and any year it names must appear there.</p></div>
        <div className="finding"><h3>Console steps given to the agent.</h3><p>Steps like adding a redirect URI in the provider&apos;s console were marked &quot;you or agent&quot;. They need your signed-in session, so they are now always yours.</p></div>

        <h2>What we could not verify</h2>
        <p>Every quote in the library is marked <code>unchecked</code> until <code>npm run verify-quotes</code> is run from an open-internet machine, because we read pages through a summarising tool. <b>No hands-on registration has been logged, so nothing is tagged &quot;tested&quot;.</b> That log is next. The gaps below are per guide, in the guides&apos; own words.</p>
        <div className="cols2">
          {gaps.map(({ g, items }) => (
            <div className="finding" key={g.slug}>
              <h3 className="titlerow-s"><Logo slug={g.slug} app={g.app} size={26} /> <Link href={`/guide/${g.slug}`}>{g.app.replace(/\s*\(.*\)/, "")}</Link></h3>
              <ul>{items.map((u, i) => <li key={i}>{u}</li>)}</ul>
            </div>
          ))}
        </div>

        <h2>Where this fits</h2>
        <p>How Composio and seven alternatives describe their own auth: <Link href="/landscape">Composio and the alternatives</Link>. The reusable patterns are on the <Link href="/playbook">Playbook</Link>.</p>

        <h2>Predicted versus actual for unseen apps</h2>
        <p>The plan is to predict the difficulty tier of three apps outside the library before running the live agent, then compare with the agent and the provider&apos;s own docs. That check has not been run yet. The template is in <code>docs/TESTING.md</code>.</p>
      </div>
    </main>
  );
}
