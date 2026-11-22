import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { LearningPathwayWorkspace } from "@/components/learning-pathway-workspace";
import { SaveResourceButton } from "@/components/learning-catalog";
import { ResourceProgressControl } from "@/components/resource-progress-control";
import { resolveCurrentActor } from "@/lib/certifications/store";
import {
  getLearningHubUserState,
  LEARNING_HUB_MODULES,
  LEARNING_HUB_PATHS,
  LEARNING_HUB_RESOURCES,
} from "@/lib/learning-hub-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = LEARNING_HUB_PATHS.find((item) => item.slug === slug);
  if (!path) {
    return {
      title: "Learning Path Not Found — Touch Grass Later",
      description: "The requested Learning Hub pathway could not be found.",
    };
  }
  return {
    title: `${path.title} — TGL Learning Hub`,
    description: path.description,
  };
}

export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = LEARNING_HUB_PATHS.find((item) => item.slug === slug);
  if (!path) notFound();

  const { user, configured } = await resolveCurrentActor();
  const state = await getLearningHubUserState(user?.id ?? null);

  const modules = LEARNING_HUB_MODULES.filter(
    (m) => m.learning_path_id === path.id,
  ).sort((a, b) => a.sort_order - b.sort_order);

  const resources = LEARNING_HUB_RESOURCES.filter(
    (r) => r.learning_path_id === path.id,
  );

  const pathProgress = modules
    .map((m) => state.moduleProgress[m.id])
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const enrolled = state.enrolledPathIds.includes(path.id);
  const signedIn = Boolean(user) || !configured;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="flex-1 px-6 pb-24 pt-36 md:px-12 md:pb-32 md:pt-48 lg:px-20">
        <div className="mx-auto max-w-[1100px]">
          <Link
            href="/learning-hub"
            className="mb-12 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={13} aria-hidden="true" /> Learning hub
          </Link>
          <div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1.2fr_.8fr] md:items-end md:pb-14">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {path.category} / {path.difficulty}
              </p>
              <h1 className="mt-6 text-[clamp(3rem,7vw,6.4rem)] font-medium leading-[0.88] tracking-[-0.08em]">
                {path.title}
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
                {path.description}
              </p>
            </div>
            <div className="tgl-glass rounded-2xl p-5">
              <p className="text-[9px] uppercase tracking-[0.17em] text-muted-foreground">
                A self-guided learning path
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {path.estimated_hours
                  ? `Approximately ${path.estimated_hours} hours of suggested practice.`
                  : "Learn at your own pace."}{" "}
                No progress is recorded until you choose to join.
              </p>
            </div>
          </div>
          <div className="py-12">
            <LearningPathwayWorkspace
              pathId={path.id}
              modules={modules}
              initialProgress={pathProgress}
              enrolled={enrolled}
              signedIn={signedIn}
            />
          </div>
          {resources.length > 0 && (
            <section className="border-t border-border pt-10">
              <p className="text-[10px] uppercase tracking-[0.19em] text-muted-foreground">
                Free resources for this path
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {resources.map((resource) => (
                  <article
                    key={resource.id}
                    className="tgl-glass flex flex-col justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <h2 className="text-sm font-medium text-foreground">
                        {resource.title}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {resource.provider} · {resource.difficulty}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SaveResourceButton
                        resourceId={resource.id}
                        initiallySaved={state.savedIds.includes(resource.id)}
                      />
                      <ResourceProgressControl
                        resourceId={resource.id}
                        initialStatus={state.resourceStatuses[resource.id] ?? "not_started"}
                      />
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${resource.title} in a new tab`}
                        className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      >
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
