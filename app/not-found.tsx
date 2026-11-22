import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Compass } from "lucide-react";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Page Not Found — Touch Grass Later",
  description:
    "The page you requested could not be found. Return to Touch Grass Later programmes or My Learning.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 pb-20 pt-32 md:px-12">
        <section className="tgl-glass-strong w-full max-w-xl rounded-[28px] p-8 text-center sm:p-12">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/12 text-accent">
            <Compass size={22} aria-hidden="true" />
          </div>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Error 404
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            We couldn&apos;t find that page.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            The route may have moved or the link may be mistyped. Head back to our bundled internship programmes or resume your learning roadmap.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/programmes"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Explore Programmes <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30"
            >
              <ArrowLeft size={14} aria-hidden="true" /> Back Home
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
