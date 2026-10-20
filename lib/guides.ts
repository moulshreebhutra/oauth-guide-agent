import { Guide } from "./schema";
import { RAW_GUIDES } from "@/data/guides";

const ALL = RAW_GUIDES.map((g) => Guide.parse(g)).sort((a, b) => a.difficulty.tier - b.difficulty.tier || a.app.localeCompare(b.app));
export const loadGuides = (): Guide[] => ALL;
export const loadGuide = (slug: string) => ALL.find((g) => g.slug === slug);
