import Link from "next/link";
import { ABOUT } from "@/lib/about";

export function About() {
  return (
    <section id="about" className="sect white about" aria-labelledby="about-h">
      <div className="wrap">
        <div className="sechead">
        <p className="eyebrow">About the builder</p>
        <h2 id="about-h" className="about-h">Built by <mark className="hl">{ABOUT.name}</mark></h2>
        <p className="lede">
          {ABOUT.role}, applying for {ABOUT.applyingFor}. This prototype is my answer to the take-home: a way for a developer to see the cost of an OAuth app before starting, and to trust what they read.
        </p>
        </div>

        <div className="about-grid">
          <div>
            <h3>How I approached the problem</h3>
            <ul>
              <li><b>Started from what already exists.</b> Composio publishes 46 setup guides. I read ten in full: they cover the clicking, but not setup time, difficulty or the approval wait, which is where teams lose weeks.</li>
              <li><b>Designed for one decision.</b> A developer asks &quot;should I start this today?&quot; So effort, wait, and what only you can do come first, and the steps come after.</li>
              <li><b>Made trust visible.</b> Every claim is tagged tested, sourced, reported, inferred or unknown, and quotes link to the page they came from. Where no provider states a number, the guide says so instead of guessing.</li>
              <li><b>Kept the agent honest in code.</b> The live agent cannot mark anything tested, and a quote it cannot find in a page it actually read is removed. <Link href="/method">The method page</Link> lists what was and was not checked.</li>
            </ul>
          </div>
          <div>
            <h3>Why I am a good fit</h3>
            <ul>
              <li><b>I have owned a product through integrations and AI.</b> At Vudio.ai I worked across three roles as it grew from a video-commerce tool into an AI marketing platform with 10+ modules, including Shopify-connected widgets and the product side of its Campaign agent.</li>
              <li><b>Results I can point to.</b> Revenue grew about 7x ($30K to $0.2M) over two years. I redesigned the shoppable widgets module, lifting adoption by 15 points, and rebuilt onboarding so setup turnaround dropped from 7 days to 3.</li>
              <li><b>I build to understand.</b> I have a computer science degree and I prototype my own ideas, so I can talk to engineers about trade-offs. Top 3 of 200+ in NextLeap&apos;s Product Management Fellowship.</li>
              <li><b>I write down what I do not know.</b> This project lists its own gaps, including that the hands-on registrations are still being run.</li>
            </ul>
          </div>
          <div>
            <h3>Find me</h3>
            <ul className="about-links">
              <li><a href={ABOUT.portfolio} target="_blank" rel="noreferrer">Portfolio</a></li>
              <li><a href={ABOUT.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
              {ABOUT.resumeUrl && <li><a href={ABOUT.resumeUrl} target="_blank" rel="noreferrer">Resume (PDF)</a></li>}
              <li><a href={ABOUT.repo} target="_blank" rel="noreferrer">Source code</a></li>
            </ul>
            <p className="muted small">Prototype built for the Composio APM, Toolkits take-home. It never asks for credentials or secrets.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
