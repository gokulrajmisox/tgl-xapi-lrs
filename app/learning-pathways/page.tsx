import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { PathwaysBrowser } from "@/components/pathways-browser";
import { TglScroll } from "@/components/sections/tgl-scroll";

export const metadata: Metadata = {
  title: "Learning Pathways — Touch Grass Later",
  description:
    "Explore 9 interactive learning directions, build real applied projects, and move seamlessly into TGL internship programmes.",
};

export default function LearningPathwaysPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <TglScroll />
      <Header />
      <main className="flex-1 px-6 pb-24 pt-36 md:px-12 md:pb-32 md:pt-48 lg:px-20">
        <div className="mx-auto max-w-[1280px]">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} aria-hidden="true" /> Back to home
          </Link>
          <div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1.2fr_.8fr] md:items-end md:pb-14">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Learning pathways / 09 directions
              </p>
              <h1 className="mt-6 text-[clamp(3.5rem,9vw,8rem)] font-medium leading-[0.83] tracking-[-0.09em]">
                Follow the
                <br />
                <span className="font-serif font-normal italic text-[var(--accent)]">
                  interesting.
                </span>
              </h1>
            </div>
            <p className="max-w-[390px] text-sm leading-7 text-muted-foreground">
              A place to begin, not a box to stay in. Explore core ideas, find a skill that pulls you in, and make your way toward a project of your own.
            </p>
          </div>
          <div className="pt-9">
            <PathwaysBrowser />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
