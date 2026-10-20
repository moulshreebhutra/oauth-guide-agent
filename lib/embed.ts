import { GoogleGenAI } from "@google/genai";
import { getIndex, search, type Hit } from "./rag";

/**
 * Hybrid retrieval: keyword search (BM25 + synonym groups) decides WHICH passages are eligible,
 * then Gemini embeddings re-order them by meaning (reciprocal-rank fusion).
 * If there is no key, or any embedding call fails or times out, the keyword order is used as-is.
 * Embeddings can only re-order passages the keyword gate already allowed, so they cannot make an
 * off-topic question "match" something.
 */
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
let docVecs: Promise<number[][] | null> | null = null;

const client = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function embed(texts: string[], taskType: string): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const res = await client().models.embedContent({
      model: EMBED_MODEL,
      contents: texts.slice(i, i + 50),
      config: { taskType, abortSignal: AbortSignal.timeout(15_000) },
    });
    for (const e of res.embeddings ?? []) out.push(e.values ?? []);
  }
  return out;
}

function passageVectors() {
  if (!docVecs) {
    const ix = getIndex();
    docVecs = embed(ix.chunks.map((c) => `${c.app} - ${c.section}: ${c.text}`.slice(0, 1500)), "RETRIEVAL_DOCUMENT")
      .then((v) => (v.length === ix.chunks.length && v.every((x) => x.length) ? v : null))
      .catch(() => {
        docVecs = null; // try again on the next request
        return null;
      });
  }
  return docVecs;
}

const cos = (a: number[], b: number[]) => {
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; }
  return d / (Math.sqrt(x * y) || 1);
};

export async function searchHybrid(query: string, opts: { k?: number; slug?: string } = {}): Promise<{ hits: Hit[]; mode: "hybrid" | "keyword" }> {
  const k = opts.k ?? 6;
  const pool = search(query, { k: 24, slug: opts.slug });
  if (pool.length < 2 || !process.env.GEMINI_API_KEY) return { hits: pool.slice(0, k), mode: "keyword" };
  try {
    const vecs = await passageVectors();
    if (!vecs) return { hits: pool.slice(0, k), mode: "keyword" };
    const ix = getIndex();
    const idOf = new Map(ix.chunks.map((c, i) => [c.id, i]));
    const [qv] = await embed([query], "RETRIEVAL_QUERY");
    if (!qv?.length) return { hits: pool.slice(0, k), mode: "keyword" };
    const bySim = [...pool].sort((a, b) => cos(qv, vecs[idOf.get(b.id)!]) - cos(qv, vecs[idOf.get(a.id)!]));
    const score = new Map<string, number>();
    pool.forEach((h, r) => score.set(h.id, (score.get(h.id) ?? 0) + 1 / (60 + r)));
    bySim.forEach((h, r) => score.set(h.id, (score.get(h.id) ?? 0) + 1 / (60 + r)));
    return { hits: [...pool].sort((a, b) => score.get(b.id)! - score.get(a.id)!).slice(0, k), mode: "hybrid" };
  } catch {
    return { hits: pool.slice(0, k), mode: "keyword" };
  }
}
