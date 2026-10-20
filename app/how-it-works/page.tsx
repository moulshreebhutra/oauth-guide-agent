const stages = [
  { c: "var(--l1)", t: "Research becomes data", p: "Each guide is a typed JSON record (data/guides). A schema rejects a guide that is missing fields, cites evidence that does not exist, or claims 'sourced' without a quote. Nothing reaches a page without passing it." },
  { c: "var(--l2)", t: "The data is cut into passages and indexed", p: "Every claim, step, blocker and source quote becomes a small passage that remembers its app, section and evidence tag. A keyword index (BM25) ranks passages against a question. This is the retrieval half of RAG." },
  { c: "var(--l3)", t: "Asking a question", p: "Your question retrieves the six best passages. Gemini may answer only from them and must cite passage ids. Code then checks every cited id was really retrieved; if not, the written answer is hidden and the passages are shown instead. No match at all returns 'not covered' without calling the model." },
  { c: "var(--l4)", t: "Researching an app that is not in the library", p: "The agent checks Composio's managed-auth flag and the provider's OAuth discovery document, then loops: the model picks a search or a page, our code runs it (with limits and private-address blocking). Finally it writes the guide, using retrieved library judgements to keep tiers consistent." },
  { c: "var(--l1)", t: "Guardrails run in code, not in the prompt", p: "Quotes must appear in pages it actually read, or they are removed. A claim that loses its quote drops from sourced to inferred. The model cannot mark anything tested. The result must pass the schema. If it cannot, nothing is shown." },
  { c: "var(--l2)", t: "Deployment", p: "Vercel builds the Next.js app from the repo. Pages are pre-rendered; the two API routes run as short serverless functions. Keys (Gemini, Composio) live only in Vercel environment variables." },
];

import { PageHead } from "@/components/PageHead";

export default function How() {
  return (
    <main>
      <PageHead eyebrow="End to end" title="How this works, end to end" />
      <div className="wrap narrow prose">

      <h2>The problem</h2>
      <p>
        To let your users connect their Google, LinkedIn or Shopify account, you register an app with that provider. For some providers this takes ten minutes. For others it means a review that can run for weeks, and the setup guides you find say how to click through the forms but not how hard it is, how long approval takes, or which parts only you can do. Teams discover this late. This site puts those answers first and says how sure it is about each.
      </p>

      <h2>The pieces</h2>
      <svg className="diagram" viewBox="0 0 760 330" role="img" aria-label="Architecture: browser calls Next.js on Vercel, which reads guide data and a retrieval index, calls Gemini, and reads provider documentation on the web.">
        <defs>
          <marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor" /></marker>
        </defs>
        <g fill="none" stroke="currentColor" strokeWidth="1.6" color="var(--muted)">
          <rect x="10" y="125" width="130" height="70" rx="10" fill="var(--card)" />
          <rect x="190" y="20" width="300" height="290" rx="14" fill="var(--card)" />
          <rect x="210" y="50" width="120" height="50" rx="8" />
          <rect x="350" y="50" width="120" height="50" rx="8" />
          <rect x="210" y="125" width="260" height="50" rx="8" />
          <rect x="210" y="200" width="260" height="50" rx="8" />
          <rect x="210" y="262" width="260" height="36" rx="8" />
          <rect x="560" y="30" width="190" height="60" rx="10" fill="var(--card)" />
          <rect x="560" y="135" width="190" height="60" rx="10" fill="var(--card)" />
          <rect x="560" y="240" width="190" height="60" rx="10" fill="var(--card)" />
          <path d="M140 160 H190" markerEnd="url(#a)" />
          <path d="M470 75 H560" markerEnd="url(#a)" />
          <path d="M470 135 L560 85" markerEnd="url(#a)" />
          <path d="M470 150 H560" markerEnd="url(#a)" />
          <path d="M470 165 L560 255" markerEnd="url(#a)" />
        </g>
        <g fill="currentColor" fontSize="14" textAnchor="middle">
          <text x="75" y="155" fontWeight="700">Browser</text><text x="75" y="175" fontSize="12">pages, Ask, Live</text>
          <text x="340" y="42" fontWeight="700">Next.js on Vercel</text>
          <text x="270" y="80">Pages</text><text x="270" y="94" fontSize="11">library, guides</text>
          <text x="410" y="80">/api/ask</text><text x="410" y="94" fontSize="11">retrieve, answer</text>
          <text x="340" y="148">/api/generate</text><text x="340" y="164" fontSize="11">live agent loop</text>
          <text x="340" y="222">Guardrails</text><text x="340" y="238" fontSize="11">quote check, tags, schema, limits</text>
          <text x="340" y="285" fontSize="12">Guide data + passage index</text>
          <text x="655" y="56" fontWeight="700">Gemini</text><text x="655" y="74" fontSize="12">writes answers and guides</text>
          <text x="655" y="161" fontWeight="700">Provider docs</text><text x="655" y="179" fontSize="12">fetched live, treated as data</text>
          <text x="655" y="266" fontWeight="700">Composio API</text><text x="655" y="284" fontSize="12">managed-auth lookup</text>
        </g>
      </svg>

      <h2>What happens, in order</h2>
      <div className="flow">
        {stages.map((s, i) => (
          <div key={s.t} className="stage" style={{ ["--c" as string]: s.c }}>
            <span className="n">{i + 1}</span>
            <div>
              <h3>{s.t}</h3>
              <p>{s.p}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>Plain-language glossary</h2>
      <ul>
        <li><b>OAuth app</b>: the registration your product holds with a provider so users can grant access without sharing passwords.</li>
        <li><b>Provider review</b>: the provider checking your app before strangers can use it. This is the slow part.</li>
        <li><b>RAG</b>: look up relevant passages first, then let the model answer from them. It keeps answers tied to written sources.</li>
        <li><b>Agent</b>: a model that decides which tool to use next (search, fetch a page) in a loop, within limits we set.</li>
        <li><b>Hallucination</b>: a model stating something that sounds right but is not supported. Our checks look for exactly this.</li>
        <li><b>Evidence tag</b>: Tested, Sourced, Reported, Inferred or Unknown, shown beside each claim.</li>
      </ul>

      <h2>From 10 guides to 100</h2>
      <p>The library is a slice; the same agent that answers live requests builds the rest. <code>scripts/batch-generate.ts</code> takes a list of app names or websites, runs each through the live agent with the same guardrails, and saves the result to <code>data/guides/_generated</code> for a person to review. Nothing generated reaches the site until it is checked and moved into the library. The plan for 100:</p>
      <ol>
        <li><b>Seed the list</b> from Composio&apos;s managed-auth directory (OAuth toolkits), starting with the apps developers ask for most.</li>
        <li><b>Run the batch</b>: about five model calls and a few page fetches per app, paced for free-tier limits.</li>
        <li><b>Review a sample</b>: open each guide&apos;s quotes, run <code>npm run verify-quotes</code>, and spot-check the tier against the provider&apos;s own docs.</li>
        <li><b>Promote</b> reviewed guides into the library; guides nobody has checked stay labelled as generated by the agent.</li>
        <li><b>Re-check on a schedule</b>, because provider docs change: each guide shows its last-verified date.</li>
      </ol>

      <h2>Which AI answers, and what happens when it cannot</h2>
      <p>Ask and the live agent call several free models at the same time and use the first good answer: four Gemini models, plus Groq and OpenRouter when their keys are set. Transient errors (busy or rate-limited) are retried with growing delays. If no model answers, Ask still returns a summary written by code from the guides&apos; own sentences, labelled as not written by AI, with the reason. Good answers are remembered for six hours.</p>

      <h2>What is not built yet</h2>
      <ul>
        <li>Retrieval is hybrid: keywords (with synonym groups such as approval, review and verification) decide what is eligible, then Gemini embeddings re-order it by meaning. The embedding step has not been run against the live model yet; if it fails the keyword order is used.</li>
        <li>Share links carry the whole guide inside the URL (signed, nothing stored). Very long guides may not fit; those get no link and can still be copied as JSON.</li>
        <li>Hands-on registrations are still to be logged, so no claim is tagged Tested.</li>
      </ul>
      </div>
    </main>
  );
}
