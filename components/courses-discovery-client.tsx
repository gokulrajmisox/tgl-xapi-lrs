"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
import type { PublicCourseSummary } from "@/lib/courses/store";
import OptionWheel, { type OptionWheelItem } from "@/components/react-bits/OptionWheel";

const CATEGORIES = [
  "All",
  "Engineering",
  "Data & AI",
  "Infrastructure",
  "Product & design",
] as const;

export function CoursesDiscoveryClient({
  courses,
}: {
  courses: PublicCourseSummary[];
}) {
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof CATEGORIES)[number]>("All");
  const [wheelIndex, setWheelIndex] = useState(0);

  const filtered = useMemo(() => {
    if (selectedCategory === "All") return courses;
    return courses.filter((c) => c.category === selectedCategory);
  }, [courses, selectedCategory]);

  const safeIndex = filtered.length > 0 ? Math.min(wheelIndex, filtered.length - 1) : 0;
  const spotlight = filtered[safeIndex] ?? courses[0];

  const wheelItems: OptionWheelItem[] = useMemo(
    () =>
      filtered.map((course) => ({
        id: course.id,
        label: course.title,
        shortLabel: course.title.split(" ").slice(0, 2).join(" "),
        priceLabel: formatInrFromPaise(course.pricePaise),
        meta: `${course.estimatedHours} hrs · ${course.moduleCount} modules`,
      })),
    [filtered],
  );

  const handleCategoryChange = (cat: (typeof CATEGORIES)[number]) => {
    setSelectedCategory(cat);
    setWheelIndex(0);
  };

  return (
    <div className="space-y-14 overflow-x-clip">
      {/* Category Filters */}
      <div
        role="tablist"
        aria-label="Filter programmes by discipline"
        className="flex flex-wrap items-center gap-2 border-b border-border pb-5"
      >
        {CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          return (
            <button
              key={category}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => handleCategoryChange(category)}
              className={`min-h-11 rounded-full px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Interactive OptionWheel + Synchronized Spotlight */}
      {spotlight && (
        <section
          aria-label="Interactive programme selector"
          className="tgl-glass grid min-w-0 items-center gap-8 overflow-x-clip rounded-3xl p-4 sm:p-10 lg:grid-cols-[.9fr_1.1fr]"
        >
          <div className="flex min-w-0 max-w-full flex-col items-center overflow-hidden">
            <OptionWheel
              items={wheelItems}
              selectedIndex={safeIndex}
              onSelectIndex={setWheelIndex}
              size={370}
            />
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Drag the wheel, click a programme spoke, or use arrow keys to compare.
            </p>
          </div>

          <div className="min-w-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium text-accent">
                {spotlight.category} · {spotlight.estimatedHours}h course + {spotlight.internshipDurationWeeks}-wk internship
              </p>
              <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                {formatInrFromPaise(spotlight.pricePaise)}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">all-inclusive</span>
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                {spotlight.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {spotlight.subtitle}
              </p>
            </div>

            <div className="tgl-subsurface space-y-3 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  What This Single Fee Includes
                </p>
                <span className="text-[11px] font-medium text-accent">
                  {spotlight.moduleCount} modules · {spotlight.assignmentCount} assignments · Certificate ₹0 extra
                </span>
              </div>
              {spotlight.skills.length > 0 && (
                <p className="text-xs leading-5 text-foreground">
                  <span className="text-muted-foreground">Skills: </span>
                  {spotlight.skills.join(" · ")}
                </p>
              )}
              <ul className="mt-2 space-y-2 border-t border-border pt-3 text-xs leading-5 text-foreground/85">
                {spotlight.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-2.5">
                    <Sparkles size={13} className="mt-1 shrink-0 text-accent" aria-hidden="true" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <p>
                Mentor: <strong className="font-medium text-foreground">{spotlight.mentorName}</strong> ·{" "}
                {spotlight.mentorRole}
              </p>
              <p>
                Practical project:{" "}
                <strong className="font-medium text-foreground">{spotlight.projectTitle}</strong>
              </p>
              <p>
                Included internship:{" "}
                <strong className="font-medium text-accent">
                  {spotlight.linkedInternshipTitle} ({spotlight.internshipDurationWeeks} weeks)
                </strong>
              </p>
              <p className="text-[11px] leading-5 text-emerald-700 dark:text-emerald-300">
                {spotlight.certificateInfo}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={`/programmes/${spotlight.slug}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-3 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
              >
                {spotlight.enrolled ? (
                  <>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Open Unified Workspace ({spotlight.progressPercent}%)
                  </>
                ) : (
                  <>
                    Enrol Now · {formatInrFromPaise(spotlight.pricePaise)}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </>
                )}
              </Link>
              <Link
                href="/learn"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-3 text-xs font-medium text-foreground hover:border-foreground/30 whitespace-nowrap shrink-0"
              >
                My Learning
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Full Structured Programme Catalog Grid */}
      <section aria-labelledby="catalog-grid-heading" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              All-Inclusive Programmes · Single INR Fee (₹499–₹1,999)
            </p>
            <h2
              id="catalog-grid-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
            >
              All programmes ({filtered.length})
            </h2>
          </div>
          <p className="max-w-md text-xs leading-5 text-muted-foreground">
            One transparent payment unlocks the course modules, assignments, practical project, internship participation, and your Internship Completion Certificate (₹0 extra after mentor approval).
          </p>
        </div>

        <div className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <article
              key={course.id}
              className="tgl-glass flex min-w-0 flex-col justify-between rounded-3xl p-5 transition-colors hover:border-foreground/25 sm:p-6"
            >
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-muted-foreground">
                    {course.category} · {course.estimatedHours}h + {course.internshipDurationWeeks}w
                  </span>
                  <span className="shrink-0 font-mono font-semibold tabular-nums text-foreground">
                    {formatInrFromPaise(course.pricePaise)}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {course.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {course.subtitle}
                </p>

                {course.skills.length > 0 && (
                  <p className="mt-3 text-[11px] font-medium leading-5 text-accent">
                    {course.skills.slice(0, 4).join(" · ")}
                  </p>
                )}

                <div className="mt-3 space-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <p>
                    {course.moduleCount} modules · {course.lessonCount} lessons · {course.assignmentCount} assignments
                  </p>
                  <p className="truncate">
                    Project: <span className="text-foreground">{course.projectTitle}</span>
                  </p>
                  <p className="truncate">
                    Internship: <span className="text-foreground">{course.linkedInternshipTitle}</span>
                  </p>
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    Certificate: Included (₹0 extra)
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                {course.enrolled ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    Enrolled · {course.progressPercent}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock size={13} aria-hidden="true" />
                    All-inclusive · ₹{Math.round(course.pricePaise / 100)}
                  </span>
                )}

                <Link
                  href={`/programmes/${course.slug}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  <BookOpen size={12} aria-hidden="true" />
                  {course.enrolled ? "Open Programme" : "Enrol Now"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
