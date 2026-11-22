import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { LearningCatalog } from "@/components/learning-catalog";
import { resolveCurrentActor } from "@/lib/certifications/store";
import {
  getLearningHubUserState,
  LEARNING_HUB_PATHS,
  LEARNING_HUB_RESOURCES,
} from "@/lib/learning-hub-data";

export const metadata = {
  title: "TGL Learning Hub — Free resources",
  description:
    "Explore curated free learning resources and practical pathways with Touch Grass Later.",
};

export default async function LearningHubPage() {
  const { user } = await resolveCurrentActor();
  const state = await getLearningHubUserState(user?.id ?? null);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="flex-1 px-6 pb-24 pt-36 md:px-12 md:pb-32 md:pt-48 lg:px-20">
        <div className="mx-auto max-w-[1280px]">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={13} aria-hidden="true" /> Back to TGL
          </Link>
          <div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1.2fr_.8fr] md:items-end md:pb-14">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                TGL / Learning hub
              </p>
              <h1 className="mt-6 text-[clamp(3.5rem,9vw,8rem)] font-medium leading-[0.83] tracking-[-0.09em]">
                Free to
                <br />
                <span className="font-serif font-normal italic text-[var(--accent)]">
                  begin.
                </span>
              </h1>
            </div>
            <p className="max-w-[420px] text-sm leading-7 text-muted-foreground">
              A curated library of genuinely free learning resources from established providers. Open a resource, learn on the provider’s site, then track your own progress here.
            </p>
          </div>
          <div className="pt-9">
            <LearningCatalog
              paths={LEARNING_HUB_PATHS}
              resources={LEARNING_HUB_RESOURCES}
              savedIds={state.savedIds}
              resourceStatuses={state.resourceStatuses}
            />
          </div>
        </div>
      </main>
      <SiteFooter note="External free resources open on their official documentation sites. Your saved bookmarks and self-tracked progress stay synced to your TGL account." />
    </div>
  );
}
