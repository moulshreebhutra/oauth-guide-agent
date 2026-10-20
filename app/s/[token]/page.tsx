import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PageHead } from "@/components/PageHead";
import { GuideView } from "@/components/GuideView";
import { readShareToken } from "@/lib/share";

export const metadata: Metadata = { title: "Shared guide", robots: { index: false, follow: false } };

async function Shared({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = readShareToken(decodeURIComponent(token));
  if (!r.ok)
    return (
      <main>
        <PageHead title="This shared guide can't be shown" lede={r.reason}><p className="cta-row"><Link href="/live" className="btn">Generate a new guide</Link></p></PageHead>
      </main>
    );
  return (
    <main>
      <GuideView g={r.guide} banner="Shared guide. Written by the live agent, not reviewed by a person. Its source links and quotes are checked by code, but treat everything as a lead to verify." />
    </main>
  );
}

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<main><PageHead title="Loading guide…" /></main>}>
      <Shared params={params} />
    </Suspense>
  );
}
