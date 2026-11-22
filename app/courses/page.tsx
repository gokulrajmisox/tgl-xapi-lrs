import Link from "next/link";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { CoursesDiscoveryClient } from "@/components/courses-discovery-client";
import { resolveCurrentActor } from "@/lib/certifications/store";
import { listCoursesCatalog } from "@/lib/courses/store";
import { ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Explore Internship Programmes — Touch Grass Later",
  description:
    "Explore bundled Internship Programmes (₹499–₹1,999 INR all-inclusive) combining structured lessons, assignments, a real-world project, internship tasks, and an included completion certificate.",
};

export default async function CoursesCatalogPage() {
  const actor = await resolveCurrentActor();
  const courses = await listCoursesCatalog(actor.user?.id ?? null);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1280px] px-5 pb-20 pt-32 sm:px-6 md:px-12 md:pt-40">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-10">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
              TGL Internship Programmes · Single All-Inclusive INR Fee
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
              Programmes built around{" "}
              <span className="font-serif font-normal italic text-accent">
                real deliverables.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              One single INR enrolment fee covers your complete learning path: structured notes, curated lectures, practical project feedback, internship tasks, and your included Internship Completion Certificate (₹0 extra after approved completion).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/learn"
              className="tgl-glass rounded-full px-4 py-2.5 text-xs font-medium text-foreground hover:border-foreground/30 whitespace-nowrap shrink-0"
            >
              My Learning
            </Link>
            <Link
              href="/certificates"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground whitespace-nowrap shrink-0"
            >
              Certificates <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <CoursesDiscoveryClient courses={courses} />
        </div>
      </main>
      <SiteFooter note="One bundled INR enrolment fee covers all course modules, project evaluation, internship track access, and your official completion certificate." />
    </div>
  );
}
