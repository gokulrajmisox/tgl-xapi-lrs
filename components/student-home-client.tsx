"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  FolderGit2,
  GitBranch,
  Layers3,
  Lock,
  MessageSquare,
  Network,
  PlayCircle,
  Sparkles,
  Trophy,
} from "lucide-react";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
import type { PublicCourseSummary } from "@/lib/courses/store";
import type {
  LearningEvidenceRecord,
  MentorMessageRecord,
  NodeProgressState,
  ProjectSubmissionRecord,
} from "@/lib/learning-workspace-store";
import type {
  CertificateIssuanceRecord,
  CertificationOrderRecord,
  CertificationPaymentRecord,
  CertificationProductRecord,
  InternshipApplicationRecord,
  InternshipRecord,
} from "@/lib/certifications/store";
import type { EmailDeliveryRecord } from "@/lib/email/provider";
import { computeUnifiedProgrammeProgression } from "@/lib/learning/progression";
import type { LearningUniverseSnapshot } from "@/lib/learning/skills-universe";
import { AnimatedLearningMetrics } from "@/components/learning-visualizations/AnimatedLearningMetrics";
import { LearningRoadmapView } from "@/components/learning-visualizations/LearningRoadmapView";
import { LearningUniverseGraph } from "@/components/learning-visualizations/LearningUniverseGraph";
import { MySkillsShowcase } from "@/components/learning-visualizations/MySkillsShowcase";
import { AchievementsPanel } from "@/components/learning-visualizations/AchievementsPanel";
import Magnet from "@/components/react-bits/Magnet";

type StatusFilter = "all" | "in_progress" | "pending_action" | "completed";
type MyLearningTab = "continue" | "roadmap" | "skills" | "universe" | "achievements";

const VALID_TABS: MyLearningTab[] = [
  "continue",
  "roadmap",
  "skills",
  "universe",
  "achievements",
];

export function StudentHomeClient({
  learnerName,
  initialTab,
  learningUniverse,
  courses,
  internships,
  applications,
  issuances,
  claimedCertIds = [],
  submissions,
  messages,
  emailLogs = [],
}: {
  learnerName: string;
  initialTab?: string;
  learningUniverse: LearningUniverseSnapshot;
  courses: PublicCourseSummary[];
  internships: InternshipRecord[];
  applications: InternshipApplicationRecord[];
  orders: CertificationOrderRecord[];
  payments: CertificationPaymentRecord[];
  issuances: CertificateIssuanceRecord[];
  claimedCertIds?: string[];
  products: CertificationProductRecord[];
  nodeStates: Record<string, NodeProgressState>;
  savedItems: string[];
  submissions: ProjectSubmissionRecord[];
  messages: MentorMessageRecord[];
  evidence: LearningEvidenceRecord[];
  emailLogs?: EmailDeliveryRecord[];
}) {
  const [activeTab, setActiveTab] = useState<MyLearningTab>(() => {
    if (initialTab && VALID_TABS.includes(initialTab as MyLearningTab)) {
      return initialTab as MyLearningTab;
    }
    return "continue";
  });
  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    () =>
      learningUniverse.nodes.find((n) => n.status === "acquired")?.id ??
      learningUniverse.nodes.find((n) => n.status === "in_progress")?.id ??
      learningUniverse.nodes[0]?.id ??
      "",
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const claimedSet = useMemo(() => new Set(claimedCertIds), [claimedCertIds]);

  const enrolledItems = useMemo(() => {
    return courses
      .filter((c) => c.enrolled)
      .map((course) => {
        const track =
          internships.find((i) => i.slug === course.linkedInternshipSlug) ?? null;
        const app = track
          ? applications.find((a) => a.internship_id === track.id) ?? null
          : null;
        const sub =
          submissions.find((s) => s.projectSlug === course.projectSlug) ?? null;
        const cert = app
          ? issuances.find(
              (i) =>
                i.internship_application_id === app.id &&
                i.issuance_status !== "revoked",
            ) ?? null
          : null;

        const tasks = track?.tasks ?? [];
        const approvedTasks = tasks.filter(
          (t) =>
            app?.task_submissions?.find((ts) => ts.taskId === t.id)?.status ===
            "approved",
        ).length;

        const progression = computeUnifiedProgrammeProgression({
          enrolled: true,
          completedLessonCount: course.completedLessonCount,
          totalLessonCount: course.lessonCount,
          quizPassed: course.quizPassed,
          projectStatus: sub?.status ?? "not_started",
          hasInternshipTrack: Boolean(track),
          totalInternshipTasks: tasks.length,
          approvedInternshipTasksCount: approvedTasks,
          internshipFinalApproved: Boolean(
            app?.status === "completed" && app?.mentor_approved,
          ),
          certificateStatus: cert?.issuance_status ?? "none",
          certificateClaimed: cert ? claimedSet.has(cert.certificate_id) : false,
        });

        const hasPendingAction =
          !progression.programCompleted &&
          (sub?.status === "revision_required" ||
            !sub ||
            sub.status === "in_progress" ||
            approvedTasks < tasks.length ||
            progression.certificateState === "eligible");

        return {
          course,
          track,
          app,
          sub,
          cert,
          progression,
          hasPendingAction,
        };
      });
  }, [courses, internships, applications, submissions, issuances, claimedSet]);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    enrolledItems.forEach((item) => set.add(item.course.category));
    return Array.from(set);
  }, [enrolledItems]);

  const filteredEnrolled = useMemo(() => {
    return enrolledItems.filter((item) => {
      if (categoryFilter !== "All" && item.course.category !== categoryFilter) {
        return false;
      }
      const isDone = item.progression.programCompleted;
      if (statusFilter === "completed") return isDone;
      if (statusFilter === "in_progress") return !isDone;
      if (statusFilter === "pending_action") return item.hasPendingAction;
      return true;
    });
  }, [enrolledItems, categoryFilter, statusFilter]);

  const pendingActionItems = useMemo(() => {
    const items: Array<{
      id: string;
      kind: "project" | "task" | "certificate";
      title: string;
      detail: string;
      deadlineLabel: string;
      href: string;
    }> = [];

    for (const item of enrolledItems) {
      if (item.sub?.status === "revision_required") {
        items.push({
          id: `rev-${item.course.id}`,
          kind: "project",
          title: `Revision requested · ${item.course.projectTitle}`,
          detail: item.sub.mentorFeedback || "Update repository and resubmit for mentor evaluation.",
          deadlineLabel: "Action needed",
          href: `/programmes/${item.course.slug}#project-build`,
        });
      } else if (!item.sub || item.sub.status === "in_progress") {
        items.push({
          id: `proj-${item.course.id}`,
          kind: "project",
          title: `Submit project · ${item.course.projectTitle}`,
          detail: `Required deliverable for ${item.course.title}.`,
          deadlineLabel: "Milestone",
          href: `/programmes/${item.course.slug}#project-build`,
        });
      }

      if (item.track?.tasks?.length) {
        for (const t of item.track.tasks) {
          const ts = item.app?.task_submissions?.find((x) => x.taskId === t.id);
          if (!ts || ts.status === "revision_required") {
            items.push({
              id: `task-${item.course.id}-${t.id}`,
              kind: "task",
              title: t.title,
              detail: `${item.track.title} · ${t.deliverableFormat}`,
              deadlineLabel: t.deadlineLabel,
              href: `/programmes/${item.course.slug}#internship-track`,
            });
          }
        }
      }

      if (item.progression.certificateState === "eligible") {
        items.push({
          id: `cert-${item.course.id}`,
          kind: "certificate",
          title: `Claim included certificate · ${item.course.includedCertificateTitle}`,
          detail: "All requirements complete — generate your QR-verified PDF at ₹0 extra.",
          deadlineLabel: "Ready now",
          href: `/programmes/${item.course.slug}#certificate-claim`,
        });
      }
    }

    return items.slice(0, 6);
  }, [enrolledItems]);

  const realNotifications = useMemo(() => {
    const notes: Array<{ id: string; label: string; detail: string; timestamp: string }> = [];

    for (const sub of submissions) {
      if (sub.mentorFeedback && sub.reviewedAt) {
        notes.push({
          id: `sub-${sub.id}`,
          label: `Mentor review · ${sub.projectTitle}`,
          detail: `${sub.status.replaceAll("_", " ")}: ${sub.mentorFeedback}`,
          timestamp: sub.reviewedAt,
        });
      }
    }
    for (const cert of issuances) {
      if (cert.issuance_status === "issued" && cert.issued_at) {
        notes.push({
          id: `cert-${cert.id}`,
          label: `Certificate issued · ${cert.certificate_id}`,
          detail: `${cert.achievement_title} verified credential is ready to download.`,
          timestamp: cert.issued_at,
        });
      }
    }
    for (const email of emailLogs) {
      notes.push({
        id: `mail-${email.id}`,
        label: email.subject.replace(/^\[TEST\]\s*/i, ""),
        detail: `Delivered (${email.delivery_status}) to ${email.recipient_email}`,
        timestamp: email.created_at,
      });
    }
    for (const msg of messages.filter((m) => m.authorRole === "mentor")) {
      notes.push({
        id: `msg-${msg.id}`,
        label: `${msg.authorName} replied · ${msg.topic}`,
        detail: msg.body,
        timestamp: msg.createdAt,
      });
    }

    return notes
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [submissions, issuances, emailLogs, messages]);

  const activeCertificates = useMemo(
    () => issuances.filter((i) => i.issuance_status === "issued"),
    [issuances],
  );

  const exploreProgrammes = useMemo(
    () => courses.filter((c) => !c.enrolled).slice(0, 3),
    [courses],
  );

  // Also show any standalone internship applications whose course isn't already enrolled
  const standaloneApplications = useMemo(() => {
    const enrolledCourseSlugs = new Set(enrolledItems.map((i) => i.course.slug));
    return applications
      .map((app) => {
        const track = internships.find((i) => i.id === app.internship_id);
        if (!track) return null;
        if (
          track.required_course_slug &&
          enrolledCourseSlugs.has(track.required_course_slug)
        ) {
          return null;
        }
        const matchedCourse = track.required_course_slug
          ? courses.find((c) => c.slug === track.required_course_slug) ?? null
          : null;
        return { app, track, matchedCourse };
      })
      .filter(Boolean) as Array<{
      app: InternshipApplicationRecord;
      track: InternshipRecord;
      matchedCourse: PublicCourseSummary | null;
    }>;
  }, [applications, internships, courses, enrolledItems]);

  // Top primary recommendation
  const primaryFocus = enrolledItems.find((i) => !i.progression.programCompleted) ?? enrolledItems[0] ?? null;
  const nextRecommendation = (() => {
    if (!primaryFocus) {
      return {
        heading: "Start your first learning & internship programme",
        reason:
          "Browse Programmes to view modules, practical projects, internship sprints, and included certificates covered by one single INR enrolment fee.",
        ctaLabel: "Explore Programmes",
        href: "/programmes",
      };
    }
    const { course, progression } = primaryFocus;
    return {
      heading: course.title,
      reason: `Active step ${progression.currentStep.stepNumber}/9 (${progression.currentStep.title}): ${progression.nextRequirement}`,
      ctaLabel: progression.certificateState === "issued" || progression.certificateState === "eligible"
        ? "Open Certificate Workspace"
        : "Continue Learning",
      href: `/programmes/${course.slug}`,
    };
  })();

  const inspectSkillInUniverse = (skillId?: string) => {
    if (skillId) {
      setSelectedSkillId(skillId);
    }
    setActiveTab("universe");
  };

  return (
    <div className="space-y-6">
      {/* Unified My Learning Navigation Switcher */}
      <nav aria-label="My Learning views" className="tgl-glass rounded-2xl p-2">
        <div
          role="tablist"
          aria-label="Student portal workspace sections"
          className="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap"
        >
          {(
            [
              { id: "continue", label: "Continue Learning", icon: Compass },
              { id: "roadmap", label: "Learning Roadmap", icon: GitBranch },
              { id: "skills", label: "My Skills", icon: Layers3 },
              { id: "universe", label: "Learning Universe", icon: Network },
              { id: "achievements", label: "Achievements", icon: Trophy },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                }`}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Animated Real Learning Metrics Strip */}
      <AnimatedLearningMetrics metrics={learningUniverse.metrics} />

      {activeTab === "roadmap" && (
        <LearningRoadmapView
          roadmaps={learningUniverse.roadmaps}
          onInspectSkill={(id) => inspectSkillInUniverse(id)}
        />
      )}

      {activeTab === "skills" && (
        <MySkillsShowcase
          categories={learningUniverse.categories}
          nodes={learningUniverse.nodes}
          selectedNodeId={selectedSkillId}
          onSelectNodeId={setSelectedSkillId}
          onOpenConstellation={(id) => inspectSkillInUniverse(id)}
        />
      )}

      {activeTab === "universe" && (
        <LearningUniverseGraph
          nodes={learningUniverse.nodes}
          edges={learningUniverse.edges}
          selectedNodeId={selectedSkillId}
          onSelectNodeId={setSelectedSkillId}
        />
      )}

      {activeTab === "achievements" && (
        <AchievementsPanel
          achievements={learningUniverse.achievements}
          metrics={learningUniverse.metrics}
          issuances={issuances}
          submissions={submissions}
        />
      )}

      {activeTab === "continue" && (
        <div className="space-y-8">
          {/* Top Hero / Continue Card */}
          <section
            aria-labelledby="my-learning-next"
            className="tgl-glass flex flex-col justify-between gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-7"
          >
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                <Sparkles size={13} aria-hidden="true" />
                Continue Your Journey
              </p>
              <h2
                id="my-learning-next"
                className="text-xl font-semibold tracking-[-0.03em] text-foreground sm:text-2xl"
              >
                {nextRecommendation.heading}
              </h2>
              <p className="max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm">
                {nextRecommendation.reason}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("universe")}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-5 py-3 text-xs font-medium text-foreground transition-colors hover:border-foreground/30"
              >
                <Network size={14} className="text-accent" aria-hidden="true" />
                Skill Constellation
              </button>
              <Magnet padding={60} magnetStrength={2.8} maxOffset={7}>
                <Link
                  href={nextRecommendation.href}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-3 text-xs font-medium text-accent-foreground shadow-sm transition-opacity hover:opacity-90"
                >
                  <PlayCircle size={15} aria-hidden="true" />
                  {nextRecommendation.ctaLabel}
                </Link>
              </Magnet>
            </div>
          </section>

      {/* Enrolled Programmes & Internship Workspaces */}
      <section aria-labelledby="enrolled-list-heading" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2
              id="enrolled-list-heading"
              className="text-lg font-semibold tracking-[-0.03em] text-foreground"
            >
              Enrolled programmes &amp; internships
            </h2>
            <p className="text-xs text-muted-foreground">
              Open any item to enter its unified 9-step workspace — lessons, project assignment, internship tasks, and certificate in one view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "in_progress", "pending_action", "completed"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`min-h-9 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "in_progress"
                    ? "In Progress"
                    : f === "pending_action"
                      ? "Pending Action"
                      : "Completed"}
              </button>
            ))}

            {categories.length > 2 && (
              <select
                aria-label="Filter by discipline"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="min-h-9 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {filteredEnrolled.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredEnrolled.map(({ course, track, app, progression }) => (
              <article
                key={course.id}
                className="tgl-glass flex flex-col justify-between gap-5 rounded-3xl p-6 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-medium text-accent">
                      {course.category} · {course.estimatedHours}h + {course.internshipDurationWeeks}wk internship
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        progression.programCompleted
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-accent"
                      }`}
                    >
                      {progression.programCompleted ? (
                        <CheckCircle2 size={12} aria-hidden="true" />
                      ) : (
                        <BookOpen size={12} aria-hidden="true" />
                      )}
                      {progression.currentStep.title}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                      {course.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {course.subtitle}
                    </p>
                  </div>

                  {/* Unified 9-step progress bar */}
                  <div className="tgl-subsurface rounded-2xl p-4 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">
                        Roadmap Progress ({progression.completedStepsCount}/
                        {progression.totalStepsCount} steps)
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-accent">
                        {progression.overallProgressPercent}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${progression.overallProgressPercent}%` }}
                      />
                    </div>
                    <p className="mt-2.5 text-[11px] leading-4 text-muted-foreground">
                      Next: <span className="text-foreground">{progression.nextRequirement}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="tgl-subsurface rounded-xl px-3 py-2">
                      <span className="text-muted-foreground">Lessons</span>
                      <p className="mt-0.5 font-mono font-medium tabular-nums text-foreground">
                        {course.completedLessonCount}/{course.lessonCount}
                      </p>
                    </div>
                    <div className="tgl-subsurface rounded-xl px-3 py-2">
                      <span className="text-muted-foreground">Project</span>
                      <p className="mt-0.5 truncate font-medium capitalize text-foreground">
                        {progression.projectStageStatus.replaceAll("_", " ")}
                      </p>
                    </div>
                    <div className="tgl-subsurface rounded-xl px-3 py-2">
                      <span className="text-muted-foreground">Certificate</span>
                      <p className="mt-0.5 truncate font-medium capitalize text-foreground">
                        {progression.certificateState}
                      </p>
                    </div>
                  </div>

                  {track && (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Briefcase size={12} className="shrink-0 text-accent" aria-hidden="true" />
                      <span>
                        Included Internship: <strong className="text-foreground">{track.title}</strong> ·{" "}
                        <span className="capitalize">{app ? app.status.replaceAll("_", " ") : "included"}</span>
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="text-[11px] text-muted-foreground">
                    Mentor: {course.mentorName}
                  </span>
                  <Link
                    href={`/programmes/${course.slug}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
                  >
                    Open Learning Workspace
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}

            {standaloneApplications.map(({ app, track, matchedCourse }) => (
              <article
                key={app.id}
                className="tgl-glass flex flex-col justify-between gap-5 rounded-3xl p-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-medium text-accent">
                      Internship Track · {track.duration_weeks} weeks
                    </span>
                    <span className="font-medium capitalize text-emerald-700 dark:text-emerald-300">
                      {app.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                    {track.title}
                  </h3>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {track.description}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="text-[11px] text-muted-foreground">
                    {(track.tasks ?? []).length} sprint tasks included
                  </span>
                  <Link
                    href={matchedCourse ? `/programmes/${matchedCourse.slug}` : "/internships"}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                  >
                    {matchedCourse ? "Open Unified Workspace" : "Open Internship"}
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="tgl-glass rounded-3xl p-8 text-center text-xs text-muted-foreground">
            <p className="text-sm font-medium text-foreground">
              {enrolledItems.length === 0
                ? `Welcome, ${learnerName}. You haven't enrolled in a programme yet.`
                : "No programmes match your active filter."}
            </p>
            <p className="mt-1">
              {enrolledItems.length === 0
                ? "Explore available programmes to see modules, projects, and included certificates."
                : "Clear or switch filters above to see your active programmes."}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {enrolledItems.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setCategoryFilter("All");
                  }}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                >
                  Show all enrolled
                </button>
              ) : (
                <Link
                  href="/programmes"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground"
                >
                  Explore Programmes <ArrowUpRight size={13} />
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Pending Submissions, Deadlines & Quick Certificate Downloads */}
      {(pendingActionItems.length > 0 || activeCertificates.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="tgl-glass rounded-3xl p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Clock size={16} className="text-accent" aria-hidden="true" />
              <span>Pending Submissions &amp; Deadlines ({pendingActionItems.length})</span>
            </h2>
            <div className="mt-4 space-y-2.5 text-xs">
              {pendingActionItems.map((task) => (
                <Link
                  key={task.id}
                  href={task.href}
                  className="tgl-subsurface flex items-center justify-between gap-4 rounded-2xl p-3.5 transition-colors hover:border-foreground/25"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{task.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{task.detail}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-medium text-accent">
                    {task.deadlineLabel} →
                  </span>
                </Link>
              ))}
              {pendingActionItems.length === 0 && (
                <p className="text-muted-foreground">
                  No overdue tasks or pending submissions right now.
                </p>
              )}
            </div>
          </section>

          <section className="tgl-glass rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Award size={16} className="text-accent" aria-hidden="true" />
                <span>Earned Certificates ({activeCertificates.length})</span>
              </h2>
              <Link href="/certificates" className="text-xs font-medium text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-2.5 text-xs">
              {activeCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="tgl-subsurface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-accent">{cert.certificate_id}</p>
                    <p className="mt-0.5 truncate font-semibold text-foreground">
                      {cert.achievement_title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/certificates/${encodeURIComponent(cert.certificate_id)}/pdf`}
                      download={`${cert.certificate_id}.pdf`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[11px] font-medium text-accent-foreground hover:opacity-90"
                    >
                      <Download size={12} aria-hidden="true" />
                      PDF
                    </a>
                    <Link
                      href={`/verify/certificate/${encodeURIComponent(cert.certificate_id)}`}
                      className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-foreground/30"
                    >
                      Verify
                    </Link>
                  </div>
                </div>
              ))}
              {activeCertificates.length === 0 && (
                <p className="text-muted-foreground">
                  Complete your enrolled course, practical project approval, and internship tasks to unlock your included ₹0 certificate.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Bottom Row: Available Catalog Preview + Real Notifications & Mentor Updates */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        {exploreProgrammes.length > 0 && (
          <section className="tgl-glass rounded-3xl p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <FolderGit2 size={16} className="text-accent" aria-hidden="true" />
                <span>Recommended programmes to unlock</span>
              </h2>
              <Link href="/programmes" className="text-xs font-medium text-accent hover:underline">
                View catalog
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {exploreProgrammes.map((course) => (
                <div
                  key={course.id}
                  className="tgl-subsurface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Lock size={11} aria-hidden="true" />
                      {course.category} · {formatInrFromPaise(course.pricePaise)} INR all-inclusive
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {course.title}
                    </p>
                    <p className="mt-0.5 truncate text-muted-foreground">
                      {course.skills.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                  <Link
                    href={`/programmes/${course.slug}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 whitespace-nowrap shrink-0"
                  >
                    Preview &amp; Enrol
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="tgl-glass rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Bell size={15} className="text-accent" aria-hidden="true" />
              <span>Notifications &amp; Mentor Updates ({realNotifications.length || messages.length})</span>
            </h2>
            <Link href="/certificates" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              <MessageSquare size={13} aria-hidden="true" />
              Credentials
            </Link>
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            {realNotifications.map((item) => (
              <div key={item.id} className="tgl-subsurface rounded-2xl p-3.5">
                <p className="font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 leading-5 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
            {realNotifications.length === 0 && messages.slice(0, 3).map((m) => (
              <div key={m.id} className="tgl-subsurface rounded-2xl p-3.5">
                <p className="font-semibold text-foreground">
                  {m.authorName} · {m.topic}
                </p>
                <p className="mt-1 leading-5 text-muted-foreground">{m.body}</p>
              </div>
            ))}
            {realNotifications.length === 0 && messages.length === 0 && (
              <p className="text-muted-foreground">
                Ask a mentor question or submit project work inside your programme workspace to receive updates here.
              </p>
            )}
          </div>
        </section>
      </div>
        </div>
      )}
    </div>
  );
}
