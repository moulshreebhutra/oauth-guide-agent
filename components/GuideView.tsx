import Link from "next/link";
import type { Guide, Claim } from "@/lib/schema";
import { PageHead } from "./PageHead";
import { Logo } from "./Logo";

const idOf = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const TAG: Record<string, { label: string; hint: string }> = {
  tested: { label: "Tested", hint: "A person did this against the real provider (see test log)" },
  sourced: { label: "Sourced", hint: "Quoted from a linked page" },
  reported: { label: "Reported", hint: "Only third parties / community say so" },
  inferred: { label: "Inferred", hint: "Our reasoning, not stated anywhere" },
  unknown: { label: "Unknown", hint: "We looked and could not find out" },
};

export function Tag({ t }: { t: string }) {
  return (
    <span className={`tag tag-${t}`} title={TAG[t]?.hint}>
      {TAG[t]?.label ?? t}
    </span>
  );
}

function Cites({ ids }: { ids: string[] }) {
  if (!ids?.length) return null;
  return (
    <span className="cites">
      {ids.map((id) => (
        <a key={id} href={`#ev-${id}`}>
          [{id}]
        </a>
      ))}
    </span>
  );
}

function ClaimList({ title, items, emptyText }: { title: string; items: Claim[]; emptyText?: string }) {
  if (!items.length && !emptyText) return null;
  return (
    <section id={idOf(title)}>
      <h2>{title}</h2>
      {items.length ? (
        <ul className="claims">
          {items.map((c, i) => (
            <li key={i}>
              <Tag t={c.tag} /> {c.text} <Cites ids={c.evidence} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </section>
  );
}

export function GuideView({ g, notes = [], back = false, banner }: { g: Guide; notes?: string[]; back?: boolean; banner?: string }) {
  const mins = g.effort.hands_on_minutes;
  const toc = [
    "Who does what", "Steps", "Requirements",
    ...(g.scopes_and_access.length ? ["Scopes and access"] : []),
    "Review process",
    ...(g.gotchas.length ? ["Gotchas"] : []),
    ...(g.blockers.length ? ["If you get stuck"] : []),
    "Next actions", "What was tested", "What we are unsure about", "Sources",
  ];
  return (
    <article className="guide">
      <PageHead
        eyebrow={<>{back && <><Link href="/" className="back">← All guides</Link><br /></>}{g.generated_by === "agent" ? "Generated live by the agent, not human-checked" : "Researched guide"}</>}
        title={<span className="titlerow"><Logo slug={g.slug} app={g.app} size={52} />{g.app}</span>}
        lede={g.summary}
      >
        <div className="meta">
          <span>Tier {g.difficulty.tier} · {g.difficulty.label}</span>
          <span>{mins.min}-{mins.max} min hands-on</span>
          <span>Last verified {g.last_verified}</span>
        </div>
      </PageHead>
      <div className="wrap guide-grid">
        <nav className="toc" aria-label="Contents">
          <b>Contents</b>
          {toc.map((t) => <a key={t} href={`#${idOf(t)}`}>{t}</a>)}
        </nav>
        <div className="guide-body">
      {banner && <p className="banner">{banner}</p>}
      <div className="facts">
        <div className={`fact tier-${g.difficulty.tier}`}>
          <span className="k">Difficulty</span>
          <strong>
            Tier {g.difficulty.tier} · {g.difficulty.label}
          </strong>
          <p>
            <Tag t={g.difficulty.tag} /> {g.difficulty.rationale} <Cites ids={g.difficulty.evidence} />
          </p>
        </div>
        <div className="fact">
          <span className="k">Your time (hands-on)</span>
          <strong>
            {mins.min}-{mins.max} min
          </strong>
          <p>
            <Tag t={g.effort.tag} /> {g.effort.basis}
          </p>
        </div>
        <div className="fact">
          <span className="k">Approval wait</span>
          <strong>{g.wait.headline ?? g.wait.display ?? (g.wait.range ? `${g.wait.range.min_days}-${g.wait.range.max_days} days` : "No stated wait")}</strong>
          <p>
            <Tag t={g.wait.tag} /> {g.wait.statement} <Cites ids={g.wait.evidence} />
          </p>
        </div>
        <div className="fact">
          <span className="k">Composio managed auth</span>
          <strong>{g.composio_managed.status === "yes" ? "Available" : g.composio_managed.status === "no" ? "Not available" : "Not confirmed"}</strong>
          <p>
            <Tag t={g.composio_managed.tag} /> {g.composio_managed.note}
          </p>
        </div>
      </div>

      <section id="who-does-what">
        <h2>Who does what</h2>
        <div className="split">
          <div>
            <h3>An agent can</h3>
            <ul>{g.agent_vs_you.agent_can.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div>
            <h3>You must</h3>
            <ul>{g.agent_vs_you.you_must.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        </div>
      </section>

      <section id="steps">
        <h2>Steps</h2>
        <ol className="steps">
          {g.steps.map((s) => (
            <li key={s.n}>
              <div className="steptop">
                <strong>{s.title}</strong>
                <span className="who-pill" style={{ background: s.who === "you" ? "var(--l3)" : s.who === "agent" ? "var(--l1)" : "var(--rule)", color: s.who === "either" ? "var(--ink)" : "#fff" }}>{s.who === "you" ? "You" : s.who === "agent" ? "Agent" : "You or agent"}</span>
                <Tag t={s.tag} />
              </div>
              <p>
                {s.detail} <Cites ids={s.evidence} />
              </p>
              {s.why_not_agent && <p className="muted small">Why you: {s.why_not_agent}</p>}
            </li>
          ))}
        </ol>
      </section>

      <ClaimList title="Requirements" items={g.requirements} />
      <ClaimList title="Scopes and access" items={g.scopes_and_access} />
      <ClaimList title="Review process" items={g.review_process} emptyText="No review or approval step was found in the sources read. That is not proof that none exists." />
      <ClaimList title="Gotchas" items={g.gotchas} />

      {g.blockers.length > 0 && (
        <section id="if-you-get-stuck">
          <h2>If you get stuck</h2>
          {g.blockers.map((b, i) => (
            <details key={i}>
              <summary>
                <Tag t={b.tag} /> {b.symptom}
              </summary>
              <p>
                <b>Likely cause:</b> {b.likely_cause}
              </p>
              <p>
                <b>Fix:</b> {b.fix}
              </p>
              <p>
                <b>Escalate when:</b> {b.escalate_when} <Cites ids={b.evidence} />
              </p>
            </details>
          ))}
        </section>
      )}

      <section id="next-actions">
        <h2>Next actions</h2>
        <ul>{g.next_actions.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </section>

      <section id="what-was-tested">
        <h2>What was tested</h2>
        {g.tested_log.length ? (
          <ul>
            {g.tested_log.map((t, i) => (
              <li key={i}>
                {t.date} · {t.by}: {t.what} - {t.outcome}
                {t.minutes ? ` (${t.minutes} min)` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nothing here has been tested by hand yet.</p>
        )}
      </section>

      <section id="what-we-are-unsure-about">
        <h2>What we are unsure about</h2>
        <ul>{g.uncertainties.map((x, i) => <li key={i}>{x}</li>)}</ul>
        {notes.length > 0 && (
          <details>
            <summary>Automatic checks applied ({notes.length})</summary>
            <ul>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </details>
        )}
      </section>

      <section id="sources">
        <h2>Sources</h2>
        <ol className="evidence">
          {g.evidence.map((e) => (
            <li key={e.id} id={`ev-${e.id}`}>
              <b>[{e.id}]</b> <a href={e.url} target="_blank" rel="noreferrer">{e.title}</a> {e.official ? "" : <em>(not provider-owned)</em>}
              <blockquote>{e.excerpt}</blockquote>
              <span className="muted small">
                retrieved {e.retrieved_at} · quote check: {e.quote_check === "verified" ? "matched the page text by code" : e.quote_check === "failed" ? "NOT found in page" : "not yet re-matched against the raw page"}
              </span>
            </li>
          ))}
        </ol>
      </section>
        </div>
      </div>
    </article>
  );
}
