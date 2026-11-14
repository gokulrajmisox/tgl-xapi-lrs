import Link from "next/link";
import { Header } from "@/components/header";
import { CoursesDiscoveryClient } from "@/components/courses-discovery-client";
import { resolveCurrentActor } from "@/lib/certifications/store";
import { listCoursesCatalog } from "@/lib/courses/store";
import { ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Internship Programmes — Touch Grass Later",
  description:
    "Explore bundled Internship Programmes (₹499–₹1,999 INR all-inclusive) combining structured lessons, assignments, a real-world project, internship tasks, and an included completion certificate.",
};

export default async function CoursesCatalogPage() {
  const actor = await resolveCurrentActor();
  const courses = await listCoursesCatalog(actor.user?.id ?? null);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#090909] text-[#f4f3ef]">
      <Header />
      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-32 sm:px-6 md:px-12 md:pt-40">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-10">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#b9a9d6]">
              TGL Internship Programmes · Single All-Inclusive INR Fee
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-[-0.06em] sm:text-6xl">
              Programmes built around{" "}
              <span className="font-serif font-normal italic text-[#b9a9d6]">
                real deliverables.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
              One single INR enrolment fee covers your complete learning path: structured notes, curated lectures, practical project feedback, internship tasks, and your included Internship Completion Certificate (₹0 extra after approved completion).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/learn"
              className="rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/80 hover:border-white/35 whitespace-nowrap shrink-0"
            >
              Student home
            </Link>
            <Link
              href="/internships"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2.5 text-xs font-medium text-[#111111] hover:bg-white whitespace-nowrap shrink-0"
            >
              Internship workspace <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <CoursesDiscoveryClient courses={courses} />
        </div>
      </main>
    </div>
  );
}
