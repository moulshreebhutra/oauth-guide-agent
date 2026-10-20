import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/geist";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { About } from "@/components/About";
import { ABOUT } from "@/lib/about";

export const metadata: Metadata = {
  title: "OAuth Route Map",
  description: "What it takes to register an OAuth app and get it approved, for ten providers, with every claim labelled by how we know it. Plus an agent that researches any app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <div className="notice">
          Every claim is tagged: tested, sourced, reported, inferred or unknown. <Link href="/method">See how</Link>
        </div>
        <nav className="topnav" aria-label="Main">
          <div className="wrap">
            <Link href="/" className="brand"><span className="mark" aria-hidden />OAuth Route Map</Link>
            <span className="links">
              <Link href="/">Library</Link>
              <Link href="/plan">Plan</Link>
              <Link href="/compare">Compare</Link>
              <Link href="/playbook">Playbook</Link>
              <Link href="/findings">Findings</Link>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/method">Method</Link>
              <Link href="/#about">About</Link>
              <Link href="/live" className="cta">Live agent</Link>
            </span>
          </div>
        </nav>
        <div id="main">{children}</div>
        <About />
        <footer>
          <div className="wrap">
            <span>Built by <Link href="/#about">{ABOUT.name}</Link> as a take-home prototype for Composio. This site never asks for credentials or secrets.</span>
            <span>Guides last verified 2026-10-20. <Link href="/method">What was and was not tested</Link></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
