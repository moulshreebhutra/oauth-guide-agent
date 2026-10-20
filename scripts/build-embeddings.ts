// Embeds every guide passage once and saves data/embeddings.json, so the live site only embeds the user's question.
// Run with your key in the environment:  GEMINI_API_KEY=... npm run build:embeddings   (vectors are not secret; commit the file)
import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "node:fs";
import { getIndex } from "../lib/rag";

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Set GEMINI_API_KEY to build embeddings");
  const model = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const ix = getIndex();
  const texts = ix.chunks.map((c) => `${c.app} - ${c.section}: ${c.text}`.slice(0, 1500));
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const r = await ai.models.embedContent({ model, contents: texts.slice(i, i + 50), config: { taskType: "RETRIEVAL_DOCUMENT" } });
    for (const e of r.embeddings ?? []) vectors.push((e.values ?? []).map((v) => Math.round(v * 1e5) / 1e5));
    console.log(`embedded ${Math.min(i + 50, texts.length)}/${texts.length}`);
  }
  if (vectors.length !== texts.length) throw new Error("embedding count mismatch");
  writeFileSync("data/embeddings.json", JSON.stringify({ model, ids: ix.chunks.map((c) => c.id), vectors }));
  console.log("wrote data/embeddings.json", vectors.length, "vectors");
}
main().catch((e) => { console.error(e.message); process.exit(1); });
