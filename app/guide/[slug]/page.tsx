import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideView } from "@/components/GuideView";
import { Ask } from "@/components/Ask";
import { loadGuide, loadGuides } from "@/lib/guides";

export function generateStaticParams() {
  return loadGuides().map((g) => ({ slug: g.slug }));
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = loadGuide(slug);
  if (!g) notFound();
  return (
    <main>
      <GuideView g={g} back />
      <div className="wrap narrow mid">
      <Ask slug={g.slug} examples={[`How long does ${g.app.split(" ")[0]} approval take?`, `What must I do myself for ${g.app.split(" ")[0]}?`, `What goes wrong most often?`]} />
      </div>
    </main>
  );
}
