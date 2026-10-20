import { PageHead } from "@/components/PageHead";
import { Mermaid } from "@/components/Mermaid";

const CLASSES = `
  classDef code fill:#ffffff,stroke:#0f0f0f,color:#0f0f0f;
  classDef ai fill:#eef0ff,stroke:#0007cd,color:#0f0f0f;
  classDef human fill:#fff4d6,stroke:#9a6400,color:#0f0f0f;
  classDef stop fill:#fde8e1,stroke:#cf4519,color:#0f0f0f;
  classDef good fill:#e6f4ee,stroke:#0a7a58,color:#0f0f0f;
  classDef data fill:#f0f0f0,stroke:#5c5c5c,color:#0f0f0f;`;

const D = {
  architecture: `flowchart TD
  U["Browser<br/>Library, Ask, Live agent, Plan, Compare"]:::code
  U --> PG
  U --> AS
  U --> GE
  subgraph APP["Next.js 16 on Vercel"]
    direction LR
    PG["Pages<br/>pre-rendered"]:::code
    EX["/api/guides, /badge, llms.txt<br/>exports"]:::code
    AS["/api/ask<br/>answers questions"]:::code
    GE["/api/generate<br/>Live agent, streams progress"]:::code
  end
  PG --> LB
  EX --> LB
  AS --> LB
  LB[("Library<br/>10 researched JSON guides + passage index")]:::data
  AS --> OR
  GE --> OR
  OR["Orchestration and guardrails, in code<br/>schema, quote check, tags, rate limits, address blocking"]:::good
  OR --> R["AI router<br/>Claude, Groq, Gemini, OpenRouter"]:::ai
  OR --> W["Web research<br/>Tavily search + page fetch"]:::code
  OR --> C["Composio<br/>API or public toolkit docs"]:::code
${CLASSES}`,

  scenarios: `flowchart TD
  Q["You name an app<br/>(in the home search box, Ask or the Live agent)"]:::code --> L{"Is it one of the 10<br/>researched library apps?"}
  L -- yes --> LG["Researched guide<br/>written from official docs,<br/>quotes checked against pages"]:::good
  L -- no --> LV["Live research<br/>pages read a moment ago,<br/>quotes checked by code"]:::ai
  LG --> M1{"Does Composio<br/>manage the OAuth app?"}
  LV --> M2{"Does Composio<br/>manage the OAuth app?"}
  M1 -- yes --> S1["Scenario 1<br/>Library + managed"]:::good
  M1 -- no --> S2["Scenario 2<br/>Library + you register your own"]:::good
  M2 -- yes --> S3["Scenario 3<br/>Not in library + managed"]:::ai
  M2 -- no or unknown --> S4["Scenario 4<br/>Not in library + you register<br/>or not confirmed"]:::ai
${CLASSES}`,

  composio: `flowchart TD
  A["App name"]:::code --> B{"COMPOSIO_API_KEY<br/>set on the server?"}
  B -- yes --> C["Ask the Composio API for<br/>the toolkit's managed auth schemes"]:::code
  B -- no --> D["Read the public page<br/>docs.composio.dev/toolkits/app"]:::code
  C --> E{"What did it say?"}
  D --> E
  E -- "managed OAuth available" --> Y["Status yes<br/>tagged Sourced"]:::good
  E -- "not available" --> N["Status no<br/>tagged Sourced"]:::good
  E -- "no page, or not stated" --> U["Status unknown<br/>tagged Unknown, nothing assumed"]:::human
  Y --> Y2["Guide says: you can connect users<br/>without registering your own provider app first.<br/>Register your own only for your branding,<br/>scopes or rate limits."]:::code
  N --> N2["Guide says: you must register your own app.<br/>Steps: create the app, redirect URI, scopes,<br/>review, then give the credentials to a Composio auth config."]:::code
  U --> U2["Guide shows Not confirmed<br/>and plans for the worse case:<br/>register your own app"]:::code
  Y2 --> Z["Your own app, if you make one,<br/>still faces the provider's review.<br/>The wait shown is for that review."]:::human
  N2 --> Z
  U2 --> Z
${CLASSES}`,

  library: `flowchart TD
  R["Research<br/>official provider docs +<br/>Composio's guide, by a person"]:::human --> J["One typed JSON guide<br/>data/guides"]:::data
  J --> Z{"Schema and evidence check<br/>npm run validate"}
  Z -- "missing field, unknown source,<br/>Sourced without a quote" --> J
  Z -- passes --> Q{"Do the quotes still match<br/>the live pages?<br/>npm run verify-quotes"}
  Q --> PG["Pre-rendered pages<br/>guide, library, compare, plan"]:::good
  Q --> IX["Passage index (BM25)<br/>+ optional embeddings (off by default)"]:::good
  Q --> EX["Exports: Markdown, agent brief,<br/>JSON API, README badge, llms.txt"]:::good
  PG --> T["A person registers the app by hand<br/>and logs it in docs/TESTING.md"]:::human
  T --> TG["Only then may a claim be tagged Tested"]:::good
${CLASSES}`,

  askLibrary: `flowchart TD
  Q["Question about a library app"]:::code --> RL{"Under 20 questions<br/>this hour?"}
  RL -- no --> E1["Try again later"]:::stop
  RL -- yes --> CA{"Same question answered<br/>in the last 24 hours?"}
  CA -- yes --> H["Return the saved answer"]:::good
  CA -- no --> T{"About connecting,<br/>registering or authorising an app?"}
  T -- no --> OT["Polite out-of-scope message<br/>no model is called"]:::stop
  T -- yes --> K["Phase 1: keyword search<br/>BM25 + synonym groups<br/>(approval = review = verification)"]:::code
  K --> Q1["Show passages at once,<br/>assembled by code, no AI"]:::good
  Q1 --> HY["Phase 2: optional re-rank<br/>Gemini embeddings (not active today),<br/>keyword order stands"]:::ai
  HY --> PR["Prompt = the written skill + top passages<br/>passages are data, not instructions"]:::code
  PR --> M["AI router picks a model"]:::ai
  M --> V{"Is every citation a passage<br/>that was really retrieved?"}
  V -- yes --> A["Answer with clickable citations<br/>saved for 24 hours"]:::good
  V -- "no, or all models failed" --> F["Show the guides' own wording,<br/>composed by code, labelled"]:::human
${CLASSES}`,

  askWeb: `flowchart TD
  Q["Question names an app<br/>that is not in the library"]:::code --> N["Find the app name<br/>known-apps list, domain or capitalised word"]:::code
  N --> S["3 web searches in parallel<br/>setup, review and scopes, authentication"]:::code
  N --> CT["Composio toolkit page"]:::code
  N --> PF{"Registered through a parent?<br/>Instagram to Meta, YouTube to Google"}
  S --> O["Official hosts first<br/>docs, developers, support"]:::code
  O --> FP["Fetch pages, follow auth and review links.<br/>If a site blocks us, use the text<br/>the search engine already read"]:::code
  FP --> FL["Keep only pages about the app.<br/>Drop tool lists and script shells"]:::code
  PF -- yes --> PG["Add our parent guide's passages"]:::good
  FL --> PA["Cut into passages and rank (BM25)"]:::code
  CT --> PA
  PG --> PA
  FL -- "nothing readable" --> GK["Labelled general-knowledge answer<br/>no sources, may be out of date"]:::human
  PA --> PR["Prompt = skill + passages"]:::code
  PR --> M["AI router"]:::ai
  M --> V{"Citations valid?"}
  V -- yes --> A["Answer: researched live,<br/>not human-checked, pages listed"]:::ai
  V -- no --> F["Passages composed by code"]:::human
${CLASSES}`,

  agent: `flowchart TD
  I["App name, website, or a typed question"]:::code --> X["Find the app inside the text<br/>sentences with no app are refused"]:::code
  X --> CK{"A guide for this app<br/>made in the last 24 hours?"}
  CK -- yes --> RE["Replay it instantly<br/>costs nothing"]:::good
  CK -- no --> RL{"Under 5 new guides<br/>this hour?"}
  RL -- no --> E1["Try again later"]:::stop
  RL -- yes --> P1["Fixed probes, no AI, Composio first<br/>1 docs.composio.dev/toolkits/app<br/>2 managed-OAuth flag<br/>3 composio.dev/auth guide<br/>4 OAuth discovery if a website was given"]:::code
  P1 --> P2{"Registered through a parent?"}
  P2 -- yes --> PG["Our parent guide becomes evidence"]:::good
  P2 -- no --> LP
  PG --> LP["Research loop: up to 6 actions in about 45s<br/>the model picks search or fetch;<br/>code refuses repeats, reworded searches<br/>and addresses no search returned"]:::ai
  LP --> VP["Three fixed searches:<br/>review and verification, access tiers and audits,<br/>quotas and limits.<br/>Read the best gate pages, up to 2 each"]:::code
  VP --> OD{"Did we read a provider page<br/>about registering the app?"}
  OD -- no --> OD2["One more search, read the<br/>provider's own docs page"]:::code
  OD -- yes --> OK
  OD2 --> OK{"Any usable page read?"}
  OK -- no --> ER["Stop. No guide is invented."]:::stop
  OK -- yes --> WR["Write the guide as JSON<br/>heavy AI router, up to 110s<br/>whole run capped near 190s"]:::ai
  WR --> RP["Repair near-misses<br/>label case, null minutes, bad enums"]:::code
  RP --> EN["Enforce checks<br/>see the next diagram"]:::good
  EN --> OK2{"Passed?"}
  OK2 -- yes --> SH["Show guide<br/>save 24 hours, signed share link"]:::good
  OK2 -- no --> RT{"First try?"}
  RT -- yes --> WR
  RT -- no --> ER2["Show why nothing was shown,<br/>never an unchecked guide"]:::stop
${CLASSES}`,

  enforce: `flowchart TD
  D["Draft guide from the model"]:::ai --> E1{"Evidence page was<br/>actually fetched, and the<br/>quote is in its text?"}
  E1 -- no --> X1["Drop that evidence"]:::stop
  E1 -- yes --> K["Keep it, mark quote verified<br/>forum, community and Q and A pages<br/>are never counted as official"]:::good
  X1 --> C
  K --> C["For every claim"]:::code
  C --> T1{"Tagged Tested?"}
  T1 -- yes --> DG1["Downgrade to Inferred<br/>Tested is for humans only"]:::human
  T1 -- no --> T2{"Sourced, but no quote left,<br/>or only community pages?"}
  DG1 --> T2
  T2 -- yes --> DG2["Inferred, or Reported<br/>if only community pages say it"]:::human
  T2 -- no --> T3{"Does the cited page really<br/>say it? Shared wording,<br/>years, numbers of 10 or more"}
  DG2 --> T3
  T3 -- "no" --> DG3["Inferred, or Reported if a<br/>number is only on a community page"]:::human
  T3 -- yes --> T4{"An absence such as<br/>'no review is mentioned'?"}
  DG3 --> T4
  T4 -- yes --> DG4["Unknown or Inferred, never Sourced"]:::human
  T4 -- no --> T5{"Tier 3 or 4 without a<br/>Sourced review step?"}
  DG4 --> T5
  T5 -- yes --> DG5["Tier lowered to 2 and said so"]:::human
  T5 -- no --> T6{"A step done in the provider's<br/>console marked agent or either?"}
  DG5 --> T6
  T6 -- yes --> DG6["Changed to You"]:::human
  T6 -- no --> CM
  DG6 --> CM["Sources nobody cites are dropped<br/>Composio managed status<br/>is set by code, never the model"]:::code
  CM --> SC{"Passes the schema?<br/>Zod: types, enums, numbers"}
  SC -- no --> FAIL["Rejected: nothing shown"]:::stop
  SC -- yes --> OUT["Guide + a list of every automatic change"]:::good
${CLASSES}`,

  router: `flowchart TD
  R["Request to an AI model"]:::code --> H{"Writing a whole guide?"}
  H -- no --> A1["Tier 1: Claude or Groq<br/>at random<br/>(only those with a key)"]:::ai
  A1 -- "error, timeout or wrong format" --> A2["Tier 2: Gemini or OpenRouter, 50-50"]:::ai
  A2 -- fails --> A3["Tier 3: Claude once more"]:::ai
  H -- yes --> G1["Claude first, with 80% of the time.<br/>Groq is skipped for long prompts"]:::ai
  G1 -- fails --> G2["Gemini or Groq"]:::ai
  G2 -- fails --> G3["Claude last"]:::ai
  A1 --> OKK["First good reply wins"]:::good
  A2 --> OKK
  A3 --> OKK
  G1 --> OKK
  G2 --> OKK
  G3 --> OKK
  A3 -- fails --> ERR["Error names every provider<br/>and why it failed"]:::stop
  G3 -- fails --> ERR
${CLASSES}`,
};

const SCENARIOS = [
  { n: "1", t: "In the library, Composio manages the OAuth app", e: "Researched by a person, quotes checked against pages", how: "Instant keyword answer, then an AI answer written only from the guide's passages. Cards show Composio managed auth as Available.", ex: "GitHub, Notion, Slack, HubSpot, Shopify" },
  { n: "2", t: "In the library, you register your own app", e: "Researched by a person, quotes checked against pages", how: "Same pipeline. The full setup, review and wait are the whole job, and the guide says which steps only you can do.", ex: "Salesforce, LinkedIn, Meta (advanced access)" },
  { n: "3", t: "Not in the library, Composio manages the OAuth app", e: "Pages read a moment ago, not human-checked", how: "Ask researches the web and answers from those pages. The Live agent writes a guide; the managed flag comes from Composio and is set by code.", ex: "Zoom, Discord, Dropbox" },
  { n: "4", t: "Not in the library, you register your own, or Composio is silent", e: "Pages read a moment ago, not human-checked", how: "Same research. If Composio's status cannot be found the guide says Not confirmed and plans for the worse case. Anything no page states is Unknown.", ex: "Smaller or newer apps" },
];

const TECH: [string, string][] = [
  ["Next.js 16 (App Router), React 19, TypeScript", "Pages are pre-rendered; the API routes run as serverless functions on Vercel. The Live agent streams its progress to the browser as server-sent events."],
  ["Zod schema", "Every guide, written by a person or an AI, must fit one typed shape. A guide that does not fit is rejected, not repaired into something else."],
  ["BM25 + synonym groups", "Keyword retrieval over passages cut from the guides. Synonym groups (approval, review, verification, listing) let a question and a guide use different words."],
  ["Gemini embeddings (optional, off by default)", "Could re-order keyword hits by meaning. Needs a working Gemini key and prebuilt vectors (npm run build:embeddings), neither of which is in place today, so Ask uses keyword order. Capped at 4 seconds if enabled."],
  ["AI router", "Claude, Groq, Gemini and OpenRouter, used only when their key is set. Claude, Groq and OpenRouter have answered live; Gemini is wired in but over quota until billing is enabled. Tiers and random choice spread load and survive any one provider failing."],
  ["Tavily search, then fetch", "Search finds the provider's pages. Fetch reads them (private addresses blocked, size and time capped). When a site shows a bot check, the text the search engine read is used and labelled as such. Results that are news, jobs, app-store pages or about another product are filtered out, repeats of one page are merged, and when picking review and quota pages it skips customer-account checks, product reviews, release notes and audit-log marketing pages."],
  ["Composio API and public toolkit docs", "Tell us whether Composio manages the OAuth app and which auth methods the toolkit supports."],
  ["Signed share links", "A guide is packed into the URL and signed with HMAC-SHA256 using a server secret. Nothing is stored; only this server can mint a valid link."],
  ["Caches and limits", "Answers and guides are remembered for 24 hours in your browser and on the server (in Vercel Blob when connected, so every visitor shares them). Ask allows 20 questions an hour and the Live agent 5 new guides an hour per visitor; repeats cost nothing."],
  ["Tests", "81 automated tests cover the schema, quote checks, the claim-versus-page checks, retrieval, the AI router, link signing and the text cleaning. Run with npm test."],
];

function Fig({ title, intro, bullets, code, label }: { title: string; intro?: string; bullets: string[]; code: string; label: string }) {
  return (
    <section className="hw">
      <h2>{title}</h2>
      {intro && <p>{intro}</p>}
      <Mermaid code={code} label={label} />
      <ul className="hw-bul">{bullets.map((b) => <li key={b} dangerouslySetInnerHTML={{ __html: b }} />)}</ul>
    </section>
  );
}

export default function How() {
  return (
    <main>
      <PageHead eyebrow="End to end" title="How this works, end to end" lede="Every route a question or an app can take, what is checked by code and what is left to a model, and where a person is still needed." />
      <div className="wrap hwpage">
        <aside className="hw-legend" aria-label="Diagram key">
          <b>Diagram key</b>
          <span><i style={{ background: "#fff", borderColor: "#0f0f0f" }} />Code, no AI</span>
          <span><i style={{ background: "#eef0ff", borderColor: "#0007cd" }} />An AI model</span>
          <span><i style={{ background: "#e6f4ee", borderColor: "#0a7a58" }} />Checked, safe result</span>
          <span><i style={{ background: "#fff4d6", borderColor: "#9a6400" }} />A person, or a labelled fallback</span>
          <span><i style={{ background: "#fde8e1", borderColor: "#cf4519" }} />Stop or refuse</span>
          <span><i style={{ background: "#f0f0f0", borderColor: "#5c5c5c" }} />Stored data</span>
        </aside>

        <section className="hw">
          <h2>The problem</h2>
          <ul className="hw-bul">
            <li>To let users connect their Google, LinkedIn or Shopify account, you register an app with that provider.</li>
            <li>For some providers that takes ten minutes. For others it means a review that can run for weeks.</li>
            <li>Setup guides explain the clicking, but not how hard it is, how long approval takes, or which steps only you can do.</li>
            <li>This site puts those answers first and says how sure it is about each: <b>Tested, Sourced, Reported, Inferred or Unknown</b>.</li>
          </ul>
        </section>

        <Fig
          title="The pieces"
          intro="Everything runs in one Next.js app on Vercel. The browser never talks to an AI model, a search engine or Composio directly."
          code={D.architecture}
          label="Architecture: browser, Next.js routes, guardrails, library data, AI router, web research and Composio."
          bullets={[
            "<b>Pages</b> are pre-rendered from the library data, so the 10 researched guides load instantly and never depend on an AI.",
            "<b>/api/ask</b> answers a question from the library, or researches the web when the app is not in it.",
            "<b>/api/generate</b> is the Live agent: it researches one app and streams its progress while it writes a guide.",
            "<b>Guardrails</b> sit in code, not in the prompt: schema, quote matching, tag downgrades, rate limits and private-address blocking.",
            "<b>Keys</b> (Claude, Groq, Gemini, Tavily and the rest) live only in Vercel environment variables, never in the repository or the browser.",
          ]}
        />

        <section className="hw">
          <h2>Four scenarios</h2>
          <p>Two questions decide the route: is the app in the library, and does Composio manage its OAuth app?</p>
          <Mermaid code={D.scenarios} label="The four scenarios: library or not, Composio managed or not." />
          <div className="hw-table" role="region" aria-label="The four scenarios" tabIndex={0}>
            <table>
              <thead><tr><th>Scenario</th><th>How sure we are</th><th>What happens</th><th>Examples</th></tr></thead>
              <tbody>
                {SCENARIOS.map((s) => (
                  <tr key={s.n}><td><b>{s.n}.</b> {s.t}</td><td>{s.e}</td><td>{s.how}</td><td>{s.ex}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="hw-bul">
            <li>Library answers are <b>researched by a person</b> and every quote is checked against its page.</li>
            <li>Everything else is <b>researched live</b>, labelled as not human-checked, and shows the pages it read.</li>
            <li>Whether an app is in the library is separate from whether Composio manages its OAuth app. The next diagram covers the second question.</li>
          </ul>
        </section>

        <Fig
          title="Composio managed or not"
          intro="The managed status is looked up by code, never guessed by a model."
          code={D.composio}
          label="How the Composio managed-auth status is found and what the guide says for yes, no and unknown."
          bullets={[
            "<b>Managed (yes):</b> Composio's own OAuth app can connect your users, so you can skip registering with the provider first.",
            "<b>Not managed (no):</b> you register your own OAuth app. This is the case the guides are built for, with effort, wait and what only you can do.",
            "<b>Unknown:</b> no Composio page was found or it does not say. The card shows Not confirmed and the guide plans for the worse case.",
            "Even when Composio manages it, your <b>own</b> app, for your branding, scopes or rate limits, still faces the provider's review.",
            "The status and its tag come from code (Composio API if a key is set, otherwise the public toolkit page) and the model cannot overwrite them.",
          ]}
        />

        <Fig
          title="Flow 1: how a library guide is made"
          code={D.library}
          label="From research to a published library guide: schema check, quote check, pages, index, exports and hands-on testing."
          bullets={[
            "A person researches the provider's official docs and Composio's own guide, then records the result as <b>one typed JSON guide</b>.",
            "The <b>schema check</b> rejects a guide with missing fields, a cited source that does not exist, or a Sourced claim without a quote.",
            "<b>verify-quotes</b> re-fetches the pages and confirms each quote is still there. Until it has run against open network, quotes show as not re-matched.",
            "One guide feeds <b>everything</b>: its pages, the compare and plan tools, the search index, Markdown and agent-brief export, the JSON API, README badge and llms.txt.",
            "<b>Tested</b> means a person registered the app by hand and logged it in docs/TESTING.md. Until then no claim carries that tag.",
          ]}
        />

        <Fig
          title="Flow 2: Ask, app in the library"
          code={D.askLibrary}
          label="Ask for a library app: limits, cache, topic check, instant keyword answer, re-rank, AI answer, citation check and fallback."
          bullets={[
            "<b>Phase 1 is instant and uses no AI.</b> Keyword search finds passages and code assembles an answer, so there is always something useful on screen.",
            "<b>Phase 2</b> would re-order passages by meaning with Gemini embeddings; that is optional and not active today, so keyword order is used. Then a model writes an answer using only those passages and the written skill (method, format, link rules).",
            "Passages are passed as <b>data, not instructions</b>, so a sentence inside a guide cannot redirect the model.",
            "<b>Citation check:</b> every [id] in the answer must be a passage that was retrieved. If one is not, the AI text is hidden.",
            "If every model fails, the answer is the guides' own wording, assembled by code, with the reason shown.",
            "Questions that are not about connecting an app are turned away politely, with no model call.",
          ]}
        />

        <Fig
          title="Flow 3: Ask, app not in the library"
          code={D.askWeb}
          label="Ask for an app outside the library: search, official pages first, parent platform, passages, AI answer or labelled fallback."
          bullets={[
            "The app name comes from a known-apps list, a domain, or a capitalised word in the question.",
            "<b>Three searches</b> run at once (setup, review and scopes, authentication). Official hosts such as docs, developers and support are read first.",
            "Pages that do not mention the app, tool-name lists and script-built shells are dropped, so they cannot be cited as evidence.",
            "A product registered through a parent (Instagram, WhatsApp and Threads through Meta; YouTube and Gmail through Google) also brings in <b>our parent guide's passages</b>.",
            "If a site blocks our fetch behind a bot check, the text the search engine already read is used and the source says so.",
            "The answer is labelled <b>researched live, not human-checked</b>. If nothing readable was found, a general-knowledge answer is shown with no sources and a clear label.",
          ]}
        />

        <Fig
          title="Flow 4: the Live agent writes a guide"
          intro="This route takes about one and a half to three minutes. The page shows a loader and a list of every step, with Expand all and Collapse all buttons."
          code={D.agent}
          label="The Live agent: cache, limits, fixed probes, research loop, writing, repair, checks and the retry."
          bullets={[
            "A typed question is reduced to the app it names; a sentence with no app is refused with a hint to use the Ask box.",
            "<b>Fixed probes run first and use no AI, Composio first:</b> the page docs.composio.dev/toolkits/<i>app</i>, its managed-OAuth flag, Composio's setup guide, and OAuth discovery if a website was given.",
            "In the <b>research loop</b> the model chooses a search, a page or done; code runs each action with time, size and address limits. It refuses a repeated or reworded search, a page no search or link returned, and a third search in a row. It stops after 6 actions or about 45 seconds.",
            "The agent <b>always looks for the gate pages</b> with three fixed searches (review and verification, access tiers and audits, quotas and limits) and reads the best provider pages from each, because models often skip the one page that answers how long approval takes. If it never read a provider page about registering the app, it makes one more search for it.",
            "If no usable page was read, it stops. <b>It never invents a guide.</b>",
            "The write step uses the heavy router (Claude first most of the time), a JSON template taken from a researched guide, and a size limit so the reply is not cut off.",
            "A near-miss such as a wrong label case or a missing number is repaired. Missing setup minutes become a tier-based estimate tagged Inferred.",
            "The prompt tells the writer to rate a tier by what stops <b>your own app</b> from working for other people. A marketplace listing is a separate, optional step and does not raise the tier.",
            "A finished guide is saved for 24 hours, and a signed share link is made.",
          ]}
        />

        <Fig
          title="Flow 5: what the checks do"
          intro="These run in code after the model has written. They are the reason a quote on a guide is trustworthy."
          code={D.enforce}
          label="Enforcement of evidence, tags, Composio status and schema on a generated guide."
          bullets={[
            "A source the agent never fetched is dropped. So is a quote that is not in the page text, character for character. Pages on forums, community boards and Q and A sites never count as official, even on the provider's own domain.",
            "A claim that loses its quote drops from <b>Sourced</b> to <b>Inferred</b>. One backed only by community pages becomes <b>Reported</b>. The model cannot mark anything <b>Tested</b>.",
            "A <b>Sourced</b> claim must match its cited page: shared wording, and any year it names must appear there. Every figure of 10 or more must be on a cited page, or the claim becomes <b>Inferred</b>; one only a community page contains makes it <b>Reported</b>.",
            "An absence (\"no review is mentioned\") is never <b>Sourced</b>. A Tier 3 or 4 without a Sourced review step is lowered to Tier 2, with a note. Steps done in the provider's console are always <b>You</b>. Sources nobody cites are dropped, and an unsupported gotcha that is not about setup, auth, review or limits is removed.",
            "The Composio status is set by code. The model's own value is overwritten.",
            "The schema check fixes the shape: if it fails twice, nothing is shown, and the screen says why.",
            "Every automatic change is listed under <b>Automatic checks applied</b> on the guide, so nothing happens silently.",
          ]}
        />

        <Fig
          title="Which AI answers, and what happens when one fails"
          code={D.router}
          label="AI router: tiers for short answers and for whole guides, with fallbacks and an error listing every provider."
          bullets={[
            "Short answers pick <b>Claude or Groq</b> at random (only those with a key), then <b>Gemini or OpenRouter</b>, then Claude once more.",
            "Whole guides go to Claude first, then Gemini or Groq, then Claude last. Groq is skipped for long prompts because of its size limit.",
            "A reply in the wrong format (for example prose where JSON was needed) counts as a failure and moves to the next provider.",
            "If everyone fails, the error lists <b>every provider and its reason</b>, so a quota problem on one is not hidden behind another.",
            "<b>/api/health</b> tests each provider and shows which ones respond right now.",
          ]}
        />

        <section className="hw">
          <h2>Technology used</h2>
          <dl className="hw-tech">
            {TECH.map(([t, d]) => (<div key={t}><dt>{t}</dt><dd>{d}</dd></div>))}
          </dl>
        </section>

        <section className="hw">
          <h2>What is checked by code and what is not</h2>
          <ul className="hw-bul">
            <li><b>By code, every time:</b> quotes against page text, tags, Composio status, schema, link signing, rate limits, private-address blocking, citations against retrieved passages.</li>
            <li><b>By a model:</b> choosing the next page to read, writing the answer or guide, and reading the question.</li>
            <li><b>By a person, still pending:</b> registering apps by hand, so no claim is Tested yet, and a review of live-generated guides before they join the library.</li>
            <li><b>Known limits:</b> a guide takes about one and a half to three minutes; retrieval re-ranking by meaning has not been prebuilt; Gemini needs billing enabled before it adds capacity; the server cache is per instance, while the browser copy is reliable.</li>
          </ul>
        </section>

        <section className="hw">
          <h2>From 10 guides to 100</h2>
          <ul className="hw-bul">
            <li><b>Seed the list</b> from Composio's managed-auth directory, starting with the apps developers ask for most.</li>
            <li><b>Run the batch</b> (scripts/batch-generate.ts): each app goes through the Live agent with the same checks and is saved for review.</li>
            <li><b>Review a sample:</b> open the quotes, run npm run verify-quotes and compare the tier with the provider's own docs.</li>
            <li><b>Promote</b> reviewed guides into the library. Unreviewed ones stay labelled as written by the agent.</li>
            <li><b>Re-check on a schedule,</b> because provider docs change. Each guide shows its last-verified date.</li>
          </ul>
        </section>

        <section className="hw">
          <h2>Plain-language glossary</h2>
          <dl className="hw-tech">
            <div><dt>OAuth app</dt><dd>The registration your product holds with a provider so users can grant access without sharing passwords.</dd></div>
            <div><dt>Provider review</dt><dd>The provider checking your app before strangers can use it. This is the slow part.</dd></div>
            <div><dt>RAG</dt><dd>Look up relevant passages first, then let a model answer from them, so answers stay tied to written sources.</dd></div>
            <div><dt>Agent</dt><dd>A model that decides which tool to use next, such as search or fetch a page, in a loop within limits we set.</dd></div>
            <div><dt>Hallucination</dt><dd>A model stating something that sounds right but is not supported. The quote and citation checks look for exactly this.</dd></div>
            <div><dt>Evidence tag</dt><dd>Tested, Sourced, Reported, Inferred or Unknown, shown beside each claim.</dd></div>
          </dl>
        </section>
      </div>
    </main>
  );
}
