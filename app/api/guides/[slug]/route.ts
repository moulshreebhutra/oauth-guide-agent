import { loadGuide } from "@/lib/guides";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = loadGuide(slug);
  if (!g) return Response.json({ error: "No such guide" }, { status: 404 });
  return Response.json(g, { headers: { "access-control-allow-origin": "*" } });
}
