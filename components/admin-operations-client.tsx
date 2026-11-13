"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers3, Plus, Users } from "lucide-react";
import { AdminCertificationsPanel } from "@/components/admin-certifications-panel";
import type { CohortRecord } from "@/lib/learning-workspace-store";
import { enrichedPathways } from "@/lib/learning-graph";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
import type { PublicCourseSummary } from "@/lib/courses/store";

type AdminSection = "overview" | "courses" | "payments" | "emails";

export function AdminOperationsClient({
  isSandbox,
  initialSection = "overview",
  initialCourses = [],
  initialCohorts = [],
  initialUsers = [],
}: {
  isSandbox: boolean;
  initialSection?: AdminSection;
  initialCourses?: PublicCourseSummary[];
  initialCohorts?: CohortRecord[];
  initialUsers?: Array<{ id: string; name: string; email: string; role: string; cohort: string }>;
}) {
  const [section, setSection] = useState<AdminSection>(initialSection);
  const [cohorts, setCohorts] = useState<CohortRecord[]>(initialCohorts);
  const [users, setUsers] = useState<
    Array<{ id: string; name: string; email: string; role: string; cohort: string }>
  >(initialUsers);
  const [courses, setCourses] = useState<PublicCourseSummary[]>(initialCourses);
  const [coursePrices, setCoursePrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of initialCourses) {
      map[c.id] = String(Math.round(c.pricePaise / 100));
    }
    return map;
  });
  const [contentSummary, setContentSummary] = useState({
    pathwayCount: 9,
    nodeCount: 25,
    projectCount: 9,
    internshipCount: 3,
  });

  // Cohort creation state
  const [cohortName, setCohortName] = useState("");
  const [pathwaySlug, setPathwaySlug] = useState("web-development");
  const [mentorName, setMentorName] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");

  // Course creation state (POST /api/courses)
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseSubtitle, setNewCourseSubtitle] = useState("");
  const [newCourseCategory, setNewCourseCategory] = useState<
    "Engineering" | "Data & AI" | "Infrastructure" | "Product & design"
  >("Engineering");
  const [newCourseRupees, setNewCourseRupees] = useState("999");
  const [newCourseHours, setNewCourseHours] = useState("14");
  const [newCourseMentor, setNewCourseMentor] = useState("Kabir Malhotra");
  const [newCourseSkills, setNewCourseSkills] = useState("TypeScript, Next.js, API Design");
  const [newCourseProjectTitle, setNewCourseProjectTitle] = useState("");
  const [newCourseProjectSummary, setNewCourseProjectSummary] = useState("");

  // Per-course module & announcement additions (PATCH /api/courses)
  const [moduleTitles, setModuleTitles] = useState<Record<string, string>>({});
  const [announcementTitles, setAnnouncementTitles] = useState<Record<string, string>>({});
  const [announcementBodies, setAnnouncementBodies] = useState<Record<string, string>>({});

  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadWorkspaceAdmin = useCallback(async () => {
    const [wsRes, coursesRes] = await Promise.all([
      fetch("/api/workspace/admin", { cache: "no-store" }),
      fetch("/api/courses?all=true", { cache: "no-store" }),
    ]);

    if (wsRes.ok) {
      const data = await wsRes.json();
      setCohorts(data.cohorts ?? []);
      setUsers(data.users ?? []);
      if (data.contentSummary) setContentSummary(data.contentSummary);
    }

    if (coursesRes.ok) {
      const courseData = await coursesRes.json();
      const loadedCourses = (courseData.courses ?? []) as PublicCourseSummary[];
      setCourses(loadedCourses);
      const priceMap: Record<string, string> = {};
      for (const c of loadedCourses) {
        priceMap[c.id] = String(Math.round(c.pricePaise / 100));
      }
      setCoursePrices(priceMap);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceAdmin();
  }, [loadWorkspaceAdmin]);

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice("");
    setError("");
    const res = await fetch("/api/workspace/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cohortName,
        pathwaySlug,
        mentorName,
        mentorEmail,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not create cohort.");
      return;
    }
    setCohorts((prev) => [data.cohort, ...prev]);
    setCohortName("");
    setMentorName("");
    setMentorEmail("");
    setNotice(`Cohort "${data.cohort.name}" created.`);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyCourseId("create");
    setNotice("");
    setError("");
    try {
      const pricePaise = Math.round(Number(newCourseRupees) * 100);
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newCourseTitle,
          subtitle: newCourseSubtitle,
          category: newCourseCategory,
          pricePaise,
          estimatedHours: Number(newCourseHours) || 12,
          mentorName: newCourseMentor,
          skills: newCourseSkills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          projectTitle: newCourseProjectTitle,
          projectSummary: newCourseProjectSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create course.");
        return;
      }
      setNewCourseTitle("");
      setNewCourseSubtitle("");
      setNewCourseProjectTitle("");
      setNewCourseProjectSummary("");
      setNotice(`Created paid course "${data.course.title}" (${formatInrFromPaise(pricePaise)}).`);
      await loadWorkspaceAdmin();
    } finally {
      setBusyCourseId(null);
    }
  };

  const handleSaveCourse = async (course: PublicCourseSummary, togglePublish?: boolean) => {
    setBusyCourseId(course.id);
    setNotice("");
    setError("");
    try {
      const rupees = Number(coursePrices[course.id] ?? Math.round(course.pricePaise / 100));
      const pricePaise = Math.round(rupees * 100);
      const newModuleTitle = moduleTitles[course.id]?.trim();
      const newAnnouncementTitle = announcementTitles[course.id]?.trim();
      const newAnnouncementBody = announcementBodies[course.id]?.trim();

      const res = await fetch("/api/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          pricePaise,
          isPublished: togglePublish ? !course.isPublished : course.isPublished,
          ...(newModuleTitle ? { newModuleTitle } : {}),
          ...(newAnnouncementTitle && newAnnouncementBody
            ? { newAnnouncementTitle, newAnnouncementBody }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update course configuration.");
        return;
      }
      if (newModuleTitle) {
        setModuleTitles((prev) => ({ ...prev, [course.id]: "" }));
      }
      if (newAnnouncementTitle && newAnnouncementBody) {
        setAnnouncementTitles((prev) => ({ ...prev, [course.id]: "" }));
        setAnnouncementBodies((prev) => ({ ...prev, [course.id]: "" }));
      }
      setNotice(`Updated "${course.title}" (${formatInrFromPaise(pricePaise)}).`);
      await loadWorkspaceAdmin();
    } finally {
      setBusyCourseId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div
        role="tablist"
        aria-label="Admin operational areas"
        className="flex flex-wrap gap-2 border-b border-white/10 pb-4"
      >
        {[
          { id: "overview" as const, label: "Cohorts, Content & Users" },
          { id: "courses" as const, label: `Courses & Curriculum (${courses.length})` },
          { id: "payments" as const, label: "Internships, Certificates & Payments" },
          { id: "emails" as const, label: "Email Templates & Test" },
        ].map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={section === item.id}
            onClick={() => setSection(item.id)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              section === item.id
                ? "bg-[#f4f3ef] text-[#111111]"
                : "border border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-200">
          {error}
        </p>
      )}

      {section === "overview" && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
              <p className="text-[11px] text-white/45">Courses</p>
              <p className="mt-2 text-2xl font-medium tabular-nums">{courses.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
              <p className="text-[11px] text-white/45">Pathways &amp; nodes</p>
              <p className="mt-2 text-2xl font-medium tabular-nums">
                {contentSummary.pathwayCount} · {contentSummary.nodeCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
              <p className="text-[11px] text-white/45">Projects</p>
              <p className="mt-2 text-2xl font-medium tabular-nums">{contentSummary.projectCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
              <p className="text-[11px] text-white/45">Active cohorts</p>
              <p className="mt-2 text-2xl font-medium tabular-nums">{cohorts.length}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
              <h2 className="flex items-center gap-2 text-base font-medium">
                <Layers3 size={15} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Cohorts ({cohorts.length})</span>
              </h2>
              <div className="mt-4 space-y-2.5 text-xs">
                {cohorts.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-4"
                  >
                    <div>
                      <p className="font-medium text-[#f4f3ef]">{cohort.name}</p>
                      <p className="mt-0.5 text-[11px] text-white/45">
                        Mentor: {cohort.mentorName} ({cohort.mentorEmail})
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono tabular-nums text-white/60">
                        {cohort.learnerCount} learners
                      </span>
                      <Link
                        href={`/pathways/${cohort.pathwaySlug}`}
                        className="text-[#b9a9d6] hover:underline"
                      >
                        Map
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <form
              onSubmit={handleCreateCohort}
              className="self-start rounded-2xl border border-white/10 bg-[#111111] p-6"
            >
              <h2 className="flex items-center gap-2 text-base font-medium">
                <Plus size={15} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Create cohort</span>
              </h2>
              <div className="mt-4 space-y-3 text-xs">
                <label className="block text-white/60">
                  Cohort name
                  <input
                    required
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                    placeholder="e.g. Winter Systems Cohort"
                    className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <label className="block text-white/60">
                  Primary pathway
                  <select
                    value={pathwaySlug}
                    onChange={(e) => setPathwaySlug(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#151515] px-3 text-white"
                  >
                    {enrichedPathways.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-white/60">
                  Assigned mentor name
                  <input
                    required
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    placeholder="Mentor name"
                    className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <label className="block text-white/60">
                  Mentor email
                  <input
                    type="email"
                    required
                    value={mentorEmail}
                    onChange={(e) => setMentorEmail(e.target.value)}
                    placeholder="mentor@touchgrasslater.org"
                    className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#f4f3ef] px-4 py-2.5 text-xs font-medium text-[#111111]"
                >
                  Create cohort
                </button>
              </div>
            </form>
          </div>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <Users size={15} className="text-[#b9a9d6]" aria-hidden="true" />
              <span>Users &amp; roles ({users.length})</span>
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-white/10 bg-black/25 p-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[#f4f3ef]">{u.name}</p>
                    <span className="capitalize text-[#b9a9d6]">{u.role}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">{u.email}</p>
                  <p className="mt-1 text-[11px] text-white/55">{u.cohort}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {section === "courses" && (
        <section className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-medium">
                <BookOpen size={15} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Manage paid courses, fees (₹499–₹1,999), modules &amp; announcements</span>
              </h2>
              <p className="mt-1 text-xs text-white/50">
                Create new courses, configure integer-paise INR pricing, add modules, or post mentor announcements.
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 hover:border-white/35"
            >
              View public catalog <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr]">
            <div className="space-y-4">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-[#b9a9d6]">
                        {course.category} · {course.moduleCount} modules ·{" "}
                        {course.isPublished ? "Published" : "Hidden"}
                      </p>
                      <h3 className="mt-1 text-base font-medium text-[#f4f3ef]">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-white/50">{course.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busyCourseId === course.id}
                      onClick={() => void handleSaveCourse(course, true)}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-white/35"
                    >
                      {course.isPublished ? "Hide" : "Publish"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                    <label className="block text-white/60">
                      Add new module title
                      <input
                        type="text"
                        placeholder="e.g. Module 4: Load Testing & SLAs"
                        value={moduleTitles[course.id] ?? ""}
                        onChange={(e) =>
                          setModuleTitles((prev) => ({
                            ...prev,
                            [course.id]: e.target.value,
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white"
                      />
                    </label>
                    <label className="block text-white/60">
                      Post announcement title
                      <input
                        type="text"
                        placeholder="Announcement headline"
                        value={announcementTitles[course.id] ?? ""}
                        onChange={(e) =>
                          setAnnouncementTitles((prev) => ({
                            ...prev,
                            [course.id]: e.target.value,
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white"
                      />
                    </label>
                  </div>

                  {announcementTitles[course.id]?.trim() && (
                    <label className="mt-2.5 block text-white/60">
                      Announcement message
                      <textarea
                        rows={2}
                        placeholder="Details for enrolled learners..."
                        value={announcementBodies[course.id] ?? ""}
                        onChange={(e) =>
                          setAnnouncementBodies((prev) => ({
                            ...prev,
                            [course.id]: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
                      />
                    </label>
                  )}

                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-white/60">
                        INR Fee (₹499–₹1,999)
                        <input
                          type="number"
                          min={499}
                          max={1999}
                          step={1}
                          value={coursePrices[course.id] ?? ""}
                          onChange={(e) =>
                            setCoursePrices((prev) => ({
                              ...prev,
                              [course.id]: e.target.value,
                            }))
                          }
                          className="mt-1 block h-9 w-32 rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-xs tabular-nums text-white"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busyCourseId === course.id}
                        onClick={() => void handleSaveCourse(course, false)}
                        className="h-9 rounded-full bg-[#f4f3ef] px-4 text-xs font-medium text-[#111111] disabled:opacity-45"
                      >
                        Save updates ({formatInrFromPaise(course.pricePaise)})
                      </button>
                    </div>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="text-[#b9a9d6] hover:text-white"
                    >
                      Open course workspace
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <form
              onSubmit={handleCreateCourse}
              className="self-start rounded-2xl border border-white/10 bg-[#111111] p-6 text-xs"
            >
              <h3 className="flex items-center gap-2 text-base font-medium">
                <Plus size={15} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Create paid course (₹499–₹1,999)</span>
              </h3>
              <div className="mt-4 space-y-3">
                <label className="block text-white/60">
                  Course title
                  <input
                    required
                    minLength={4}
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="e.g. Distributed Event Queues & Workers"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <label className="block text-white/60">
                  Subtitle / summary
                  <textarea
                    required
                    minLength={10}
                    rows={2}
                    value={newCourseSubtitle}
                    onChange={(e) => setNewCourseSubtitle(e.target.value)}
                    placeholder="What learners will master and build..."
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-white/60">
                    Discipline
                    <select
                      value={newCourseCategory}
                      onChange={(e) =>
                        setNewCourseCategory(
                          e.target.value as
                            | "Engineering"
                            | "Data & AI"
                            | "Infrastructure"
                            | "Product & design",
                        )
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#151515] px-2 text-white"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Data & AI">Data &amp; AI</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Product & design">Product &amp; design</option>
                    </select>
                  </label>
                  <label className="block text-white/60">
                    Fee INR (499–1999)
                    <input
                      type="number"
                      min={499}
                      max={1999}
                      required
                      value={newCourseRupees}
                      onChange={(e) => setNewCourseRupees(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-white"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-white/60">
                    Duration (hours)
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={newCourseHours}
                      onChange={(e) => setNewCourseHours(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                    />
                  </label>
                  <label className="block text-white/60">
                    Lead mentor
                    <input
                      required
                      value={newCourseMentor}
                      onChange={(e) => setNewCourseMentor(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                    />
                  </label>
                </div>
                <label className="block text-white/60">
                  Skills taught (comma separated)
                  <input
                    value={newCourseSkills}
                    onChange={(e) => setNewCourseSkills(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <label className="block text-white/60">
                  Linked practical project title
                  <input
                    required
                    minLength={4}
                    value={newCourseProjectTitle}
                    onChange={(e) => setNewCourseProjectTitle(e.target.value)}
                    placeholder="e.g. Idempotent Webhook & Retry Worker"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <label className="block text-white/60">
                  Linked project brief
                  <textarea
                    required
                    minLength={10}
                    rows={2}
                    value={newCourseProjectSummary}
                    onChange={(e) => setNewCourseProjectSummary(e.target.value)}
                    placeholder="Expected deliverables and verification rubric..."
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busyCourseId === "create"}
                  className="w-full rounded-full bg-[#f4f3ef] px-4 py-2.5 text-xs font-medium text-[#111111]"
                >
                  Publish new paid course
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {(section === "payments" || section === "emails") && (
        <AdminCertificationsPanel
          isSandbox={isSandbox}
          initialTab={section === "emails" ? "emails" : "certificates"}
        />
      )}
    </div>
  );
}
