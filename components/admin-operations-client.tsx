"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers3, PencilLine, Plus, Users } from "lucide-react";
import { AdminCertificationsPanel } from "@/components/admin-certifications-panel";
import { CourseContentStudio } from "@/components/admin/CourseContentStudio";
import type { CohortRecord } from "@/lib/learning-workspace-store";
import { enrichedPathways } from "@/lib/learning-graph";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
import type { PublicCourseSummary } from "@/lib/courses/store";
import { syncCourseToFirestore } from "@/lib/firebase/firestore-sync";

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
  const [courseProjectTitles, setCourseProjectTitles] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of initialCourses) {
      map[c.id] = c.projectTitle ?? "";
    }
    return map;
  });
  const [courseInternshipWeeks, setCourseInternshipWeeks] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of initialCourses) {
      map[c.id] = String(c.internshipDurationWeeks ?? 6);
    }
    return map;
  });
  const [courseRequirements, setCourseRequirements] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of initialCourses) {
      map[c.id] = (c.completionRequirements ?? []).join("\n");
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

  // Programme creation state (POST /api/courses)
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

  // Per-programme module & announcement additions (PATCH /api/courses)
  const [moduleTitles, setModuleTitles] = useState<Record<string, string>>({});
  const [announcementTitles, setAnnouncementTitles] = useState<Record<string, string>>({});
  const [announcementBodies, setAnnouncementBodies] = useState<Record<string, string>>({});

  const [activeStudioCourseId, setActiveStudioCourseId] = useState<string | null>(null);
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [reportSummary, setReportSummary] = useState<{
    paidOrdersCount: number;
    grossRevenueInr: number;
    approvedSubmissions: number;
    totalSubmissions: number;
    issuedCertificates: number;
    completedInternships: number;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadWorkspaceAdmin = useCallback(async () => {
    const [wsRes, coursesRes, reportsRes] = await Promise.all([
      fetch("/api/workspace/admin", { cache: "no-store" }),
      fetch("/api/courses?all=true", { cache: "no-store" }),
      fetch("/api/admin/reports", { cache: "no-store" }),
    ]);

    if (wsRes.ok) {
      const data = await wsRes.json();
      setCohorts(data.cohorts ?? []);
      setUsers(data.users ?? []);
      if (data.contentSummary) setContentSummary(data.contentSummary);
    }

    if (reportsRes.ok) {
      const rData = await reportsRes.json();
      if (rData.summary) setReportSummary(rData.summary);
    }

    if (coursesRes.ok) {
      const courseData = await coursesRes.json();
      const loadedCourses = (courseData.courses ?? []) as PublicCourseSummary[];
      setCourses(loadedCourses);
      const priceMap: Record<string, string> = {};
      const projectMap: Record<string, string> = {};
      const weeksMap: Record<string, string> = {};
      const reqMap: Record<string, string> = {};
      for (const c of loadedCourses) {
        priceMap[c.id] = String(Math.round(c.pricePaise / 100));
        projectMap[c.id] = c.projectTitle ?? "";
        weeksMap[c.id] = String(c.internshipDurationWeeks ?? 6);
        reqMap[c.id] = (c.completionRequirements ?? []).join("\n");
      }
      setCoursePrices(priceMap);
      setCourseProjectTitles(projectMap);
      setCourseInternshipWeeks(weeksMap);
      setCourseRequirements(reqMap);
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
      if (data.course) {
        void syncCourseToFirestore({
          id: data.course.id,
          slug: data.course.slug,
          title: data.course.title,
          subtitle: data.course.subtitle,
          category: data.course.category,
          level: data.course.level,
          pricePaise: data.course.pricePaise,
          currency: "INR",
          estimatedHours: data.course.estimatedHours,
          linkedInternshipSlug: data.course.linkedInternshipSlug,
          isPublished: Boolean(data.course.isPublished),
        });
      }
      setNotice(`Created bundled programme "${data.course.title}" (${formatInrFromPaise(pricePaise)}).`);
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
      const editedProjectTitle = courseProjectTitles[course.id]?.trim();
      const editedWeeks = Number(
        courseInternshipWeeks[course.id] ?? course.internshipDurationWeeks ?? 6,
      );
      const parsedRequirements = (courseRequirements[course.id] ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length >= 3);

      const res = await fetch("/api/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          pricePaise,
          isPublished: togglePublish ? !course.isPublished : course.isPublished,
          ...(editedProjectTitle ? { projectTitle: editedProjectTitle } : {}),
          ...(Number.isFinite(editedWeeks) && editedWeeks >= 1 && editedWeeks <= 26
            ? { internshipDurationWeeks: Math.round(editedWeeks) }
            : {}),
          ...(parsedRequirements.length > 0 ? { completionRequirements: parsedRequirements } : {}),
          ...(newModuleTitle ? { newModuleTitle } : {}),
          ...(newAnnouncementTitle && newAnnouncementBody
            ? { newAnnouncementTitle, newAnnouncementBody }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update programme configuration.");
        return;
      }
      if (newModuleTitle) {
        setModuleTitles((prev) => ({ ...prev, [course.id]: "" }));
      }
      if (newAnnouncementTitle && newAnnouncementBody) {
        setAnnouncementTitles((prev) => ({ ...prev, [course.id]: "" }));
        setAnnouncementBodies((prev) => ({ ...prev, [course.id]: "" }));
      }
      void syncCourseToFirestore({
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        category: course.category,
        level: course.level,
        pricePaise,
        currency: "INR",
        estimatedHours: course.estimatedHours,
        linkedInternshipSlug: course.linkedInternshipSlug,
        isPublished: togglePublish ? !course.isPublished : course.isPublished,
      });
      setNotice(`Updated "${course.title}" (${formatInrFromPaise(pricePaise)}).`);
      await loadWorkspaceAdmin();
    } finally {
      setBusyCourseId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return `${u.name} ${u.email} ${u.cohort} ${u.role}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      <div
        role="tablist"
        aria-label="Admin operational areas"
        className="flex flex-wrap gap-2 border-b border-border pb-4"
      >
        {[
          { id: "overview" as const, label: "Overview, Users & Reports" },
          { id: "courses" as const, label: `Programmes & Pricing (${courses.length})` },
          { id: "payments" as const, label: "Internships, Certificates & Payments" },
          { id: "emails" as const, label: "Email Templates & Testmail" },
        ].map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={section === item.id}
            onClick={() => setSection(item.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              section === item.id
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-200">
          {error}
        </p>
      )}

      {section === "overview" && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Real-time revenue, submission approvals, and credential operations across {courses.length} bundled programmes ({contentSummary.projectCount} projects · {cohorts.length} cohorts).
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/mentor"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:border-foreground/30"
              >
                Review Project Queue <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <a
                href="/api/admin/reports?format=csv"
                download="tgl-platform-report.csv"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground hover:opacity-90"
              >
                Export CSV Report
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="tgl-glass rounded-2xl p-5">
              <p className="text-[11px] text-muted-foreground">Paid Revenue (INR)</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
                ₹{(reportSummary?.grossRevenueInr ?? 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {reportSummary?.paidOrdersCount ?? 0} verified orders
              </p>
            </div>
            <div className="tgl-glass rounded-2xl p-5">
              <p className="text-[11px] text-muted-foreground">Active Programmes</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
                {courses.length}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {contentSummary.pathwayCount} tracks · {cohorts.length} cohorts
              </p>
            </div>
            <div className="tgl-glass rounded-2xl p-5">
              <p className="text-[11px] text-muted-foreground">Projects Approved</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-accent">
                {reportSummary?.approvedSubmissions ?? 0}/{reportSummary?.totalSubmissions ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Mentor rubric verified
              </p>
            </div>
            <div className="tgl-glass rounded-2xl p-5">
              <p className="text-[11px] text-muted-foreground">Issued Certificates</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
                {reportSummary?.issuedCertificates ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {reportSummary?.completedInternships ?? 0} internships completed
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <section className="tgl-glass rounded-2xl p-6">
              <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
                <Layers3 size={15} className="text-[var(--accent)]" aria-hidden="true" />
                <span>Cohorts ({cohorts.length})</span>
              </h2>
              <div className="mt-4 space-y-2.5 text-xs">
                {cohorts.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="tgl-subsurface flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">{cohort.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Mentor: {cohort.mentorName} ({cohort.mentorEmail})
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {cohort.learnerCount} learners
                      </span>
                      <Link
                        href={`/pathways/${cohort.pathwaySlug}`}
                        className="font-medium text-[var(--accent)] hover:underline"
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
              className="tgl-glass self-start rounded-2xl p-6"
            >
              <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
                <Plus size={15} className="text-[var(--accent)]" aria-hidden="true" />
                <span>Create cohort</span>
              </h2>
              <div className="mt-4 space-y-3 text-xs">
                <label className="block text-muted-foreground">
                  Cohort name
                  <input
                    required
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                    placeholder="e.g. Winter Systems Cohort"
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-input px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block text-muted-foreground">
                  Primary pathway
                  <select
                    value={pathwaySlug}
                    onChange={(e) => setPathwaySlug(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-input px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {enrichedPathways.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-muted-foreground">
                  Assigned mentor name
                  <input
                    required
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    placeholder="Mentor name"
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-input px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block text-muted-foreground">
                  Mentor email
                  <input
                    type="email"
                    required
                    value={mentorEmail}
                    onChange={(e) => setMentorEmail(e.target.value)}
                    placeholder="mentor@touchgrasslater.org"
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-input px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground"
                >
                  Create cohort
                </button>
              </div>
            </form>
          </div>

          <section className="tgl-glass rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
                <Users size={15} className="text-[var(--accent)]" aria-hidden="true" />
                <span>Students, Mentors &amp; Staff ({filteredUsers.length}/{users.length})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user name, email, or cohort..."
                  aria-label="Filter users directory"
                  className="h-9 w-56 rounded-full border border-border bg-input px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                  aria-label="Filter directory by role"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="h-9 rounded-full border border-border bg-input px-3 text-xs text-foreground outline-none"
                >
                  <option value="all">All roles</option>
                  <option value="student">Students</option>
                  <option value="mentor">Mentors</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="tgl-subsurface rounded-xl p-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{u.name}</p>
                    <span className="capitalize font-medium text-[var(--accent)]">{u.role}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{u.email}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{u.cohort}</p>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground">
                  No users match the current search or role filter.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {section === "courses" && (
        <section className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
                <BookOpen size={15} className="text-[var(--accent)]" aria-hidden="true" />
                <span>Manage bundled programmes, single INR fee (₹499–₹1,999), project, internship &amp; criteria</span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Each Programme fee covers the course modules, attached project, included internship track, and certificate (₹0 extra).
              </p>
            </div>
            <Link
              href="/programmes"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-muted/40"
            >
              View public programmes <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>

          {activeStudioCourseId && (
            <CourseContentStudio
              courseId={activeStudioCourseId}
              onClose={() => setActiveStudioCourseId(null)}
              onStudioMutated={loadWorkspaceAdmin}
            />
          )}

          <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr]">
            <div className="space-y-4">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="tgl-glass rounded-2xl p-5 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-[var(--accent)]">
                        {course.category} · {course.moduleCount} modules · {course.lessonCount} lessons · Certificate Included (₹0 extra) ·{" "}
                        {course.isPublished ? "Published" : "Hidden"}
                        {course.hasDraftChanges ? " · Draft changes staged" : ""}
                      </p>
                      <h3 className="mt-1 text-base font-medium text-foreground">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-muted-foreground">{course.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveStudioCourseId(course.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90"
                      >
                        <PencilLine size={12} aria-hidden="true" />
                        Open Content Studio
                      </button>
                      <button
                        type="button"
                        disabled={busyCourseId === course.id}
                        onClick={() => void handleSaveCourse(course, true)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/40"
                      >
                        {course.isPublished ? "Hide" : "Publish"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                    <label className="block text-muted-foreground">
                      Attached project title
                      <input
                        type="text"
                        value={courseProjectTitles[course.id] ?? ""}
                        onChange={(e) =>
                          setCourseProjectTitles((prev) => ({
                            ...prev,
                            [course.id]: e.target.value,
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    <label className="block text-muted-foreground">
                      Included internship duration (weeks)
                      <input
                        type="number"
                        min={1}
                        max={26}
                        value={courseInternshipWeeks[course.id] ?? "6"}
                        onChange={(e) =>
                          setCourseInternshipWeeks((prev) => ({
                            ...prev,
                            [course.id]: e.target.value,
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 font-mono text-xs tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                  </div>

                  <label className="mt-3 block text-muted-foreground">
                    Completion &amp; certificate requirements (one requirement per line)
                    <textarea
                      rows={3}
                      value={courseRequirements[course.id] ?? ""}
                      onChange={(e) =>
                        setCourseRequirements((prev) => ({
                          ...prev,
                          [course.id]: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>

                  <div className="mt-3 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                    <label className="block text-muted-foreground">
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
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    <label className="block text-muted-foreground">
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
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                  </div>

                  {announcementTitles[course.id]?.trim() && (
                    <label className="mt-2.5 block text-muted-foreground">
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
                        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                  )}

                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-muted-foreground">
                        Single Enrolment INR Fee (₹499–₹1,999)
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
                          className="mt-1 block h-9 w-36 rounded-lg border border-border bg-input px-3 font-mono text-xs tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busyCourseId === course.id}
                        onClick={() => void handleSaveCourse(course, false)}
                        className="h-9 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground tabular-nums disabled:opacity-45"
                      >
                        Save programme ({formatInrFromPaise(course.pricePaise)})
                      </button>
                    </div>
                    <Link
                      href={`/programmes/${course.slug}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      Open programme page
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <form
              onSubmit={handleCreateCourse}
              className="tgl-glass self-start rounded-2xl p-6 text-xs"
            >
              <h3 className="flex items-center gap-2 text-base font-medium text-foreground">
                <Plus size={15} className="text-[var(--accent)]" aria-hidden="true" />
                <span>Create bundled programme (₹499–₹1,999)</span>
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Automatically includes course learning, practical project, internship track, and certificate (₹0 extra).
              </p>
              <div className="mt-4 space-y-3">
                <label className="block text-muted-foreground">
                  Programme title
                  <input
                    required
                    minLength={4}
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="e.g. Distributed Event Queues Internship Programme"
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block text-muted-foreground">
                  Subtitle / summary
                  <textarea
                    required
                    minLength={10}
                    rows={2}
                    value={newCourseSubtitle}
                    onChange={(e) => setNewCourseSubtitle(e.target.value)}
                    placeholder="What learners will master and build..."
                    className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-muted-foreground">
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
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Data & AI">Data &amp; AI</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Product & design">Product &amp; design</option>
                    </select>
                  </label>
                  <label className="block text-muted-foreground">
                    Single INR Fee (499–1999)
                    <input
                      type="number"
                      min={499}
                      max={1999}
                      required
                      value={newCourseRupees}
                      onChange={(e) => setNewCourseRupees(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 font-mono tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-muted-foreground">
                    Duration (hours)
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={newCourseHours}
                      onChange={(e) => setNewCourseHours(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <label className="block text-muted-foreground">
                    Lead mentor
                    <input
                      required
                      value={newCourseMentor}
                      onChange={(e) => setNewCourseMentor(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                </div>
                <label className="block text-muted-foreground">
                  Skills taught (comma separated)
                  <input
                    value={newCourseSkills}
                    onChange={(e) => setNewCourseSkills(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block text-muted-foreground">
                  Linked practical project title
                  <input
                    required
                    minLength={4}
                    value={newCourseProjectTitle}
                    onChange={(e) => setNewCourseProjectTitle(e.target.value)}
                    placeholder="e.g. Idempotent Webhook & Retry Worker"
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block text-muted-foreground">
                  Linked project brief
                  <textarea
                    required
                    minLength={10}
                    rows={2}
                    value={newCourseProjectSummary}
                    onChange={(e) => setNewCourseProjectSummary(e.target.value)}
                    placeholder="Expected deliverables and verification rubric..."
                    className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busyCourseId === "create"}
                  className="w-full rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground"
                >
                  Publish new programme
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
          embedded
        />
      )}
    </div>
  );
}
