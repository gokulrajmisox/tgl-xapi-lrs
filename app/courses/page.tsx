import Link from "next/link";
import { Header } from "@/components/header";
import { CoursesDiscoveryClient } from "@/components/courses-discovery-client";
import { resolveCurrentActor } from "@/lib/certifications/store";
import { listCoursesCatalog } from "@/lib/courses/store";
import { ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Courses & Guided Tracks — Touch Grass Later",
  description:
    "Explore paid courses (₹499–₹1,999 INR) with structured written notes, curated YouTube lectures, and mentor-reviewed real-world projects.",
};

export default async function CoursesCatalogPage() {
  const actor = await resolveCurrentActor();
  const courses = await listCoursesCatalog(actor.user?.id ?? null);

  return (
    <div className="min-h-screen bg-[#090909] text-[#f4f3ef]">
      <Header />
      <main className="mx-auto max-w-[1280px] px-6 pb-24 pt-32 md:px-12 md:pt-40">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#b9a9d6]">
              TGL Studio Curriculum · INR Pricing
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-[-0.06em] sm:text-6xl">
              Courses built around{" "}
              <span className="font-serif font-normal italic text-[#b9a9d6]">
                real deliverables.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
              Every course pairs structured study notes, curated external YouTube lectures, and a scoped real-world project with mentor feedback. Review syllabus outcomes upfront and unlock full materials with INR Razorpay checkout.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/learn"
              className="rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/80 hover:border-white/35 whitespace-nowrap shrink-0"
            >
              Student workspace
            </Link>
            <Link
              href="/internships"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2.5 text-xs font-medium text-[#111111] hover:bg-white whitespace-nowrap shrink-0"
            >
              Internship tracks <ArrowUpRight size={13} aria-hidden="true" />
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
