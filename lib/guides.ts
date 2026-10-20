import fs from "node:fs";
import path from "node:path";
import { Guide } from "./schema";

export function loadGuides(): Guide[] {
  const dir = path.join(process.cwd(), "data/guides");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => Guide.parse(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))))
    .sort((a, b) => a.difficulty.tier - b.difficulty.tier || a.app.localeCompare(b.app));
}
export const loadGuide = (slug: string) => loadGuides().find((g) => g.slug === slug);
