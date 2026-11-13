"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  FolderGit2,
  Lock,
  Play,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
import type { CourseLesson } from "@/lib/courses/catalog";
import type { CourseDetailResponse } from "@/lib/courses/store";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";
import SlideCommit from "@/components/react-bits/SlideCommit";
import type {
  ProjectSubmissionRecord,
  ProjectSubmissionStatus,
} from "@/lib/learning-workspace-store";

type WorkspaceActor = {
  id: string;
  name: string;
  email: string;
  role: string;
} | null;

type CourseWorkspaceTab = "lessons" | "assessments" | "announcements" | "project";

const PROJECT_LIFECYCLE: Array<{
  key: "not_started" | ProjectSubmissionStatus;
  label: string;
}> = [
  { key: "not_started", label: "Not Started" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Approved" },
];

export function CourseWorkspaceClient({
  initialDetail,
  user,
  isSandbox,
}: {
  initialDetail: CourseDetailResponse;
  user: WorkspaceActor;
  isSandbox: boolean;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<CourseDetailResponse>(initialDetail);
  const [viewMode, setViewModeState] = useState<CourseWorkspaceTab>("lessons");
  const selectViewMode = useCallback((next: CourseWorkspaceTab) => {
    setViewModeState(next);
    if (typeof document !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.getElementById("course-study-pane");
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < 88 || rect.top > window.innerHeight * 0.6) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      });
    }
  }, []);
  const [activeLessonId, setActiveLessonId] = useState<string>(() => {
    if (!initialDetail.locked && initialDetail.modules[0]?.lessons[0]) {
      return initialDetail.modules[0].lessons[0].id;
    }
    return "";
  });
  const [busyLessonId, setBusyLessonId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Assignments & Quiz state
  const [assignmentTexts, setAssignmentTexts] = useState<Record<string, string>>({});
  const [assignmentUrls, setAssignmentUrls] = useState<Record<string, string>>({});
  const [busyAssignmentId, setBusyAssignmentId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>(() => {
    if (!initialDetail.locked && initialDetail.quizAttempt) {
      return initialDetail.quizAttempt.answers;
    }
    return {};
  });
  const [quizExplanations, setQuizExplanations] = useState<Record<string, string>>(() => {
    if (!initialDetail.locked && initialDetail.quizAttempt) {
      const map: Record<string, string> = {};
      for (const q of initialDetail.quiz.questions) {
        if (q.explanation) map[q.id] = q.explanation;
      }
      return map;
    }
    return {};
  });
  const [busyQuiz, setBusyQuiz] = useState(false);

  // Capstone project state
  const [submissions, setSubmissions] = useState<ProjectSubmissionRecord[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [deploymentUrl, setDeploymentUrl] = useState("");
  const [supportingEvidence, setSupportingEvidence] = useState("");
  const [summary, setSummary] = useState("");
  const [reflection, setReflection] = useState("");
  const [submittingProject, setSubmittingProject] = useState(false);

  const refreshDetail = useCallback(async () => {
    const res = await fetch(`/api/courses/${detail.course.slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const fresh = (await res.json()) as CourseDetailResponse;
    setDetail(fresh);
    if (!fresh.locked) {
      const firstId = fresh.modules[0]?.lessons[0]?.id ?? "";
      setActiveLessonId((prev) => prev || firstId);
      if (fresh.quizAttempt) {
        setQuizAnswers(fresh.quizAttempt.answers);
      }
    }
    router.refresh();
  }, [detail.course.slug, router]);

  useEffect(() => {
    if (detail.locked) return;
    const projectSlug = detail.project.slug;
    fetch("/api/workspace/learner", {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.workspace?.submissions) {
          const allSubs = data.workspace.submissions as ProjectSubmissionRecord[];
          const matching = allSubs.filter((s) => s.projectSlug === projectSlug);
          setSubmissions(matching);
          const latest = matching[0];
          if (latest && latest.status === "revision_required") {
            setGithubUrl(latest.githubUrl || latest.artifactUrl || "");
            setDeploymentUrl(latest.deploymentUrl ?? "");
            setSupportingEvidence(latest.supportingEvidence ?? "");
            setSummary(latest.summary ?? "");
          }
        }
      })
      .catch(() => {});
  }, [detail]);

  const flatLessons = useMemo<CourseLesson[]>(() => {
    if (detail.locked) return [];
    return detail.modules.flatMap((m) => m.lessons);
  }, [detail]);

  const activeLesson = useMemo(() => {
    if (detail.locked) return null;
    return (
      flatLessons.find((l) => l.id === activeLessonId) ?? flatLessons[0] ?? null
    );
  }, [detail.locked, flatLessons, activeLessonId]);

  const activeLessonIdx = activeLesson
    ? flatLessons.findIndex((l) => l.id === activeLesson.id)
    : -1;

  const latestSubmission: ProjectSubmissionRecord | null =
    submissions.length > 0 ? submissions[0] : null;
  const currentProjectStatus: "not_started" | ProjectSubmissionStatus =
    latestSubmission?.status ?? "not_started";

  const toggleLessonComplete = async (lessonId: string) => {
    if (detail.locked) return;
    const current = detail.lessonProgress[lessonId]?.status ?? "not_started";
    const nextStatus = current === "completed" ? "not_started" : "completed";
    setBusyLessonId(lessonId);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/courses/${detail.course.slug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lesson", lessonId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update lesson progress.");
        return;
      }
      setDetail((prev) => {
        if (prev.locked) return prev;
        return {
          ...prev,
          lessonProgress: data.progress,
          course: data.summary ?? prev.course,
          internshipEligibility: data.internshipEligibility ?? prev.internshipEligibility,
        };
      });
      setNotice(
        nextStatus === "completed"
          ? "Lesson progress saved."
          : "Lesson marked incomplete.",
      );
    } finally {
      setBusyLessonId(null);
    }
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (detail.locked) return;
    const text = (assignmentTexts[assignmentId] ?? "").trim();
    const url = (assignmentUrls[assignmentId] ?? "").trim();
    if (text.length < 10) {
      setError("Write at least 10 characters explaining your assignment solution.");
      return;
    }
    setBusyAssignmentId(assignmentId);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/courses/${detail.course.slug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_assignment",
          assignmentId,
          submissionText: text,
          artifactUrl: url,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit assignment.");
        return;
      }
      setDetail((prev) => {
        if (prev.locked) return prev;
        return {
          ...prev,
          assignmentSubmissions: data.assignmentSubmissions ?? prev.assignmentSubmissions,
        };
      });
      setNotice("Course assignment saved.");
    } finally {
      setBusyAssignmentId(null);
    }
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (detail.locked) return;
    if (Object.keys(quizAnswers).length < detail.quiz.questions.length) {
      setError("Answer every quiz question before submitting for grading.");
      return;
    }
    setBusyQuiz(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/courses/${detail.course.slug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_quiz",
          answers: quizAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit quiz.");
        return;
      }
      if (data.explanations) setQuizExplanations(data.explanations);
      setDetail((prev) => {
        if (prev.locked) return prev;
        return {
          ...prev,
          quizAttempt: data.attempt,
          course: data.summary ?? prev.course,
          internshipEligibility: data.internshipEligibility ?? prev.internshipEligibility,
        };
      });
      setNotice(
        data.attempt?.passed
          ? `Quiz passed (${data.attempt.scorePercent}%).`
          : `Quiz scored ${data.attempt?.scorePercent ?? 0}%. Review feedback and retake anytime.`,
      );
    } finally {
      setBusyQuiz(false);
    }
  };

  const handleStartProject = async () => {
    if (detail.locked) return;
    setSubmittingProject(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/workspace/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_project",
          projectSlug: detail.project.slug,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start project.");
        return;
      }
      if (data.submission) {
        setSubmissions((prev) =>
          prev.some((s) => s.id === data.submission.id) ? prev : [data.submission, ...prev],
        );
      }
      await refreshDetail();
      setNotice("Linked project moved to In Progress.");
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleSubmitProject = async () => {
    if (detail.locked) return;
    if (!githubUrl.trim() || summary.trim().length < 10) {
      setError("Provide a valid GitHub repository URL and at least a 10-character summary.");
      throw new Error("Missing project fields");
    }
    setSubmittingProject(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/workspace/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_project",
          projectSlug: detail.project.slug,
          githubUrl: githubUrl.trim(),
          artifactUrl: githubUrl.trim(),
          deploymentUrl: deploymentUrl.trim(),
          supportingEvidence: supportingEvidence.trim(),
          summary: summary.trim(),
          reflection: reflection.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit capstone project.");
        throw new Error(data.error ?? "Submit failed");
      }
      if (data.submission) {
        setSubmissions((prev) => {
          const rest = prev.filter((s) => s.id !== data.submission.id);
          return [data.submission, ...rest];
        });
      }
      setSummary("");
      setReflection("");
      await refreshDetail();
      setNotice("Project submitted for mentor review.");
    } finally {
      setSubmittingProject(false);
    }
  };

  const course = detail.course;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-24 pt-28 text-[#f4f3ef] md:px-12 md:pt-36">
      {/* Top Breadcrumb & Course Hero Summary */}
      <div className="border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All courses
          </Link>
          <span className="text-xs text-[#b9a9d6]">
            {course.category} · {course.level} · {course.estimatedHours} hours
          </span>
        </div>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-medium tracking-[-0.05em] sm:text-5xl">
              {course.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              {course.subtitle}
            </p>
            {course.skills.length > 0 && (
              <p className="mt-3 text-xs text-[#b9a9d6]">
                Skills taught: <span className="text-white/85">{course.skills.join(" · ")}</span>
              </p>
            )}
            <p className="mt-3 text-xs text-white/50">
              Lead Mentor: <strong className="text-white/85">{course.mentorName}</strong> ·{" "}
              {course.mentorRole} · Related Internship:{" "}
              <Link href="/internships" className="text-[#b9a9d6] hover:underline">
                {course.linkedInternshipTitle}
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/50">Access status</span>
              {detail.locked ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-200">
                  <Lock size={13} aria-hidden="true" />
                  Locked preview
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  Enrolled &amp; unlocked
                </span>
              )}
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
              <span className="text-white/50">Course fee</span>
              <span className="font-mono text-xl font-semibold tabular-nums text-[#f4f3ef]">
                {formatInrFromPaise(course.pricePaise)}{" "}
                <span className="text-xs font-normal text-white/45">INR</span>
              </span>
            </div>
            {!detail.locked && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span>Course progress</span>
                  <span className="font-mono tabular-nums">
                    {course.completedLessonCount}/{course.lessonCount} lessons ·{" "}
                    {course.progressPercent}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#b9a9d6] transition-all"
                    style={{ width: `${course.progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">
          {error}
        </p>
      )}

      {/* LOCKED VISITOR VIEW: Syllabus, Skills, Project, Internship & Certificate Info ONLY */}
      {detail.locked ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-8">
            <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-7">
              <h2 className="text-lg font-medium tracking-[-0.03em]">
                Skills taught &amp; learning outcomes
              </h2>
              <p className="mt-1.5 text-xs text-white/50">
                Complete technical capabilities and deliverables included in this {course.estimatedHours}-hour course:
              </p>
              {course.skills.length > 0 && (
                <p className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-[#d8cbea]">
                  {course.skills.join(" · ")}
                </p>
              )}
              <ul className="mt-4 space-y-2.5 text-xs leading-6 text-white/75">
                {course.outcomes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 size={14} className="mt-1 shrink-0 text-[#b9a9d6]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-medium tracking-[-0.03em]">
                  Course syllabus ({detail.syllabusModules.length} modules)
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
                  <Lock size={13} aria-hidden="true" />
                  Notes, videos, quizzes &amp; assignments locked until enrolled
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {detail.syllabusModules.map((mod) => (
                  <article
                    key={mod.id}
                    className="rounded-xl border border-white/10 bg-black/25 p-5"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-xs font-mono text-[#b9a9d6]">
                        Module 0{mod.sortOrder}
                      </p>
                      <span className="text-[11px] text-white/45">
                        {mod.estimatedMinutes} min total
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-medium text-[#f4f3ef]">
                      {mod.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      {mod.summary}
                    </p>
                    <ul className="mt-4 space-y-2 border-t border-white/10 pt-3">
                      {mod.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between gap-3 text-xs text-white/65"
                        >
                          <span className="flex items-center gap-2">
                            <Lock size={12} className="shrink-0 text-white/35" aria-hidden="true" />
                            <span>{lesson.title}</span>
                          </span>
                          <span className="shrink-0 text-[11px] text-white/45">
                            {lesson.lessonType === "video"
                              ? "Curated video"
                              : lesson.lessonType === "project_milestone"
                                ? "Project milestone"
                                : "Study notes"}{" "}
                            · {lesson.durationLabel}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#b9a9d6]">
                Linked Practical Project &amp; Related Internship
              </p>
              <h2 className="mt-2 text-lg font-medium">{detail.projectPreview.title}</h2>
              <p className="mt-2 text-xs leading-6 text-white/60">
                {detail.projectPreview.summary}
              </p>
              <p className="mt-3 text-[11px] text-white/45">
                {detail.projectPreview.milestoneCount} milestones ·{" "}
                {detail.projectPreview.deliverableCount} deliverables · Reviewed by{" "}
                {detail.projectPreview.mentorName} ({detail.projectPreview.mentorRole})
              </p>
              <div className="mt-4 border-t border-white/10 pt-4 text-xs text-white/65">
                <p>
                  Related Internship:{" "}
                  <strong className="text-[#d8cbea]">{course.linkedInternshipTitle}</strong>
                </p>
                <p className="mt-1 text-[11px] text-white/45">{course.certificateInfo}</p>
              </div>
            </section>
          </div>

          <aside className="self-start space-y-6">
            <section className="rounded-2xl border border-[#b9a9d6]/30 bg-[#131118] p-6 sm:p-7">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#b9a9d6]">
                Course Checkout · Verified Access Only
              </p>
              <div className="mt-3 flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-medium tracking-[-0.03em]">
                  Enrol Now
                </h2>
                <span className="font-mono text-2xl font-semibold tabular-nums text-[#f4f3ef]">
                  {formatInrFromPaise(course.pricePaise)}
                </span>
              </div>

              <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs text-white/75">
                <p className="font-medium text-white">What enrollment unlocks immediately:</p>
                <ul className="space-y-1.5 text-white/65">
                  {course.includes.map((inc) => (
                    <li key={inc} className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
                      <span>{inc}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span>{course.assignmentCount} hands-on course assignments &amp; graded quiz</span>
                  </li>
                </ul>
              </div>

              <div className="mt-5 border-t border-white/10 pt-5">
                {!user && !isSandbox ? (
                  <Link
                    href={`/auth/login?next=${encodeURIComponent(`/courses/${course.slug}`)}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111111]"
                  >
                    Sign in to Enrol Now ({formatInrFromPaise(course.pricePaise)})
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                ) : (
                  <RazorpayCheckoutButton
                    orderKind="course_enrollment"
                    courseId={course.id}
                    productName={course.title}
                    pricePaise={course.pricePaise}
                    eligible={true}
                    alreadyEnrolled={false}
                    studentName={user?.name}
                    studentEmail={user?.email}
                    onSuccess={() => void refreshDetail()}
                  />
                )}
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 text-[11px] leading-5 text-white/55">
                <p className="flex items-center gap-1.5 font-medium text-white/85">
                  <ShieldCheck size={13} className="text-[#b9a9d6]" aria-hidden="true" />
                  Internship &amp; Certificate Policy
                </p>
                <p className="mt-1.5">{course.internshipDisclosure}</p>
              </div>
            </section>
          </aside>
        </div>
      ) : (
        /* UNLOCKED ENROLLED COURSE WORKSPACE */
        <div className="mt-8 grid gap-8 lg:grid-cols-[310px_1fr]">
          {/* Left Module & Workspace Navigation */}
          <aside className="self-start space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#111111] p-4">
              <p className="px-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
                Course outline
              </p>
              <div className="mt-3 space-y-4">
                {detail.modules.map((mod) => (
                  <div key={mod.id} className="space-y-1.5">
                    <p className="px-2 text-xs font-medium text-[#b9a9d6]">
                      0{mod.sortOrder}. {mod.title}
                    </p>
                    <ul className="space-y-1">
                      {mod.lessons.map((lesson) => {
                        const isDone =
                          detail.lessonProgress[lesson.id]?.status === "completed";
                        const isActive =
                          viewMode === "lessons" && activeLesson?.id === lesson.id;
                        return (
                          <li key={lesson.id} className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={
                                isDone
                                  ? `Mark ${lesson.title} incomplete`
                                  : `Mark ${lesson.title} complete`
                              }
                              disabled={busyLessonId === lesson.id}
                              onClick={() => void toggleLessonComplete(lesson.id)}
                              className="grid size-7 shrink-0 place-items-center rounded-lg text-white/55 hover:bg-white/[0.06] hover:text-white"
                            >
                              {isDone ? (
                                <CheckCircle2 size={14} className="text-emerald-400" />
                              ) : (
                                <Circle size={14} className="text-white/30" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                selectViewMode("lessons");
                                setActiveLessonId(lesson.id);
                              }}
                              className={`flex-1 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                                isActive
                                  ? "bg-[#f4f3ef] font-medium text-[#111111]"
                                  : "text-white/75 hover:bg-white/[0.05] hover:text-white"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                {lesson.lessonType === "video" ? (
                                  <PlayCircle size={12} className="shrink-0" aria-hidden="true" />
                                ) : (
                                  <BookOpen size={12} className="shrink-0" aria-hidden="true" />
                                )}
                                <span className="line-clamp-2">{lesson.title}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => selectViewMode("assessments")}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                    viewMode === "assessments"
                      ? "bg-[#b9a9d6] text-[#111111]"
                      : "border border-white/15 text-white/80 hover:border-white/35"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ClipboardCheck size={14} aria-hidden="true" />
                    Assignments &amp; Quiz
                  </span>
                  <span className="font-mono text-[10px]">
                    {detail.quizAttempt?.passed ? "Passed" : "Pending"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectViewMode("announcements")}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                    viewMode === "announcements"
                      ? "bg-[#b9a9d6] text-[#111111]"
                      : "border border-white/15 text-white/80 hover:border-white/35"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Bell size={14} aria-hidden="true" />
                    Announcements
                  </span>
                  <span className="font-mono text-[10px]">
                    {detail.announcements.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectViewMode("project")}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                    viewMode === "project"
                      ? "bg-[#b9a9d6] text-[#111111]"
                      : "border border-[#b9a9d6]/30 text-[#d8cbea] hover:bg-[#b9a9d6]/10"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderGit2 size={14} aria-hidden="true" />
                    Linked Project
                  </span>
                  <span className="text-[10px] capitalize">
                    {currentProjectStatus.replaceAll("_", " ")}
                  </span>
                </button>
              </div>
            </div>

            {/* Internship Eligibility Card */}
            <div className="rounded-2xl border border-[#b9a9d6]/30 bg-[#131118] p-5 text-xs">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#b9a9d6]">
                <Award size={14} aria-hidden="true" />
                <span>Internship Eligibility</span>
              </div>
              <p className="mt-2 font-medium text-[#f4f3ef]">
                {detail.internshipEligibility.linkedInternshipTitle}
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-white/65">
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    size={12}
                    className={
                      detail.internshipEligibility.lessonsCompleted
                        ? "text-emerald-400"
                        : "text-white/25"
                    }
                    aria-hidden="true"
                  />
                  <span>Complete course lessons ({course.completedLessonCount}/{course.lessonCount})</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    size={12}
                    className={
                      detail.internshipEligibility.quizPassed
                        ? "text-emerald-400"
                        : "text-white/25"
                    }
                    aria-hidden="true"
                  />
                  <span>Pass graded quiz ({detail.quizAttempt ? `${detail.quizAttempt.scorePercent}%` : "Not attempted"})</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    size={12}
                    className={
                      detail.internshipEligibility.projectApproved
                        ? "text-emerald-400"
                        : "text-white/25"
                    }
                    aria-hidden="true"
                  />
                  <span className="capitalize">
                    Linked project ({detail.internshipEligibility.projectStatus.replaceAll("_", " ")})
                  </span>
                </li>
              </ul>
              <Link
                href="/internships"
                className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium ${
                  detail.internshipEligibility.eligibleForInternship
                    ? "bg-[#f4f3ef] text-[#111111]"
                    : "border border-white/15 text-white/80 hover:border-white/35"
                }`}
              >
                {detail.internshipEligibility.eligibleForInternship
                  ? "Eligible · Open Internship"
                  : "View Internship Track"}{" "}
                <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>
          </aside>

          {/* Main Unlocked Study Pane */}
          <div id="course-study-pane" className="min-w-0 scroll-mt-28 space-y-6">
            {viewMode === "lessons" && activeLesson && (
              <article className="space-y-6 rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#b9a9d6]">
                      {activeLesson.lessonType === "video"
                        ? "Curated Video + Study Guide"
                        : activeLesson.lessonType === "project_milestone"
                          ? "Project Milestone Guide"
                          : "Written Study Notes"}{" "}
                      · {activeLesson.durationLabel}
                    </p>
                    <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                      {activeLesson.title}
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-white/60">
                      {activeLesson.summary}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busyLessonId === activeLesson.id}
                    onClick={() => void toggleLessonComplete(activeLesson.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      detail.lessonProgress[activeLesson.id]?.status === "completed"
                        ? "border border-emerald-400/35 bg-emerald-400/15 text-emerald-200"
                        : "bg-[#f4f3ef] text-[#111111] hover:bg-white"
                    }`}
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {detail.lessonProgress[activeLesson.id]?.status === "completed"
                      ? "Completed"
                      : "Mark lesson complete"}
                  </button>
                </div>

                {/* Curated YouTube Video Embed (never copied or rehosted) */}
                {activeLesson.youtubeVideoId && (
                  <div className="space-y-3">
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/15 bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${activeLesson.youtubeVideoId}?rel=0`}
                        title={activeLesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/65">
                      <span>
                        Curated external lecture by{" "}
                        <strong className="text-white/90">
                          {activeLesson.videoCreator ?? "YouTube Educator"}
                        </strong>
                      </span>
                      {activeLesson.youtubeUrl && (
                        <a
                          href={activeLesson.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[#b9a9d6] hover:text-white"
                        >
                          Watch on YouTube <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Structured Written Study Notes */}
                <div className="space-y-5">
                  {activeLesson.noteSections.map((sec) => (
                    <section
                      key={sec.heading}
                      className="rounded-xl border border-white/10 bg-black/25 p-5"
                    >
                      <h3 className="text-base font-medium text-[#f4f3ef]">
                        {sec.heading}
                      </h3>
                      <p className="mt-2 text-xs leading-6 text-white/70 sm:text-sm sm:leading-7">
                        {sec.body}
                      </p>
                      {sec.codeSnippet && (
                        <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#09090b] p-4 font-mono text-xs leading-5 text-[#d8cbea]">
                          <code>{sec.codeSnippet}</code>
                        </pre>
                      )}
                      <p className="mt-4 border-t border-white/10 pt-3 text-xs text-[#b9a9d6]">
                        Key takeaway: {sec.takeaway}
                      </p>
                    </section>
                  ))}
                </div>

                {/* Curated Reference Links */}
                {activeLesson.resources.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-medium text-white">
                      Supporting reference docs
                    </p>
                    <ul className="mt-3 space-y-2 text-xs">
                      {activeLesson.resources.map((resLink) => (
                        <li key={resLink.id}>
                          <a
                            href={resLink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[#b9a9d6] hover:text-white"
                          >
                            {resLink.title} ({resLink.provider})
                            <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Lesson Footer Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <button
                    type="button"
                    disabled={activeLessonIdx <= 0}
                    onClick={() => {
                      const prev = flatLessons[activeLessonIdx - 1];
                      if (prev) setActiveLessonId(prev.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-white/75 disabled:opacity-35"
                  >
                    <ArrowLeft size={13} aria-hidden="true" />
                    Previous lesson
                  </button>

                  {activeLessonIdx < flatLessons.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = flatLessons[activeLessonIdx + 1];
                        if (next) setActiveLessonId(next.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111]"
                    >
                      Next lesson <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectViewMode("assessments")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#b9a9d6] px-4 py-2 text-xs font-medium text-[#111111]"
                    >
                      Continue to Assignments &amp; Quiz <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </article>
            )}

            {viewMode === "assessments" && (
              <div className="space-y-6">
                {/* Course Assignments */}
                <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
                  <h2 className="text-xl font-medium tracking-[-0.03em]">
                    Course assignments ({detail.assignments.length})
                  </h2>
                  <p className="mt-1 text-xs text-white/55">
                    Submit applied exercises to lock in engineering habits alongside your capstone project.
                  </p>
                  <div className="mt-5 space-y-4">
                    {detail.assignments.map((asgn) => {
                      const existingSub = detail.assignmentSubmissions[asgn.id];
                      return (
                        <article
                          key={asgn.id}
                          className="rounded-xl border border-white/10 bg-black/25 p-5 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="text-base font-medium text-[#f4f3ef]">{asgn.title}</h3>
                              <p className="mt-1 text-[11px] text-[#b9a9d6]">
                                Est. {asgn.estimatedMinutes} min · {asgn.deliverableHint}
                              </p>
                            </div>
                            <span
                              className={`font-medium ${
                                existingSub ? "text-emerald-300" : "text-white/45"
                              }`}
                            >
                              {existingSub ? "Submitted" : "Pending"}
                            </span>
                          </div>
                          <p className="mt-2 leading-6 text-white/70">{asgn.prompt}</p>

                          {existingSub && (
                            <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-950/20 p-3 text-emerald-100">
                              <p className="font-medium">Submitted solution:</p>
                              <p className="mt-1">{existingSub.submissionText}</p>
                              {existingSub.artifactUrl && (
                                <a
                                  href={existingSub.artifactUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-block font-mono text-[11px] text-[#b9a9d6] underline"
                                >
                                  {existingSub.artifactUrl}
                                </a>
                              )}
                            </div>
                          )}

                          <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4">
                            <textarea
                              rows={2}
                              value={assignmentTexts[asgn.id] ?? existingSub?.submissionText ?? ""}
                              onChange={(e) =>
                                setAssignmentTexts((prev) => ({
                                  ...prev,
                                  [asgn.id]: e.target.value,
                                }))
                              }
                              placeholder="Write your engineering notes or solution summary..."
                              className="w-full rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="url"
                                value={assignmentUrls[asgn.id] ?? existingSub?.artifactUrl ?? ""}
                                onChange={(e) =>
                                  setAssignmentUrls((prev) => ({
                                    ...prev,
                                    [asgn.id]: e.target.value,
                                  }))
                                }
                                placeholder="Optional Gist / PR / URL"
                                className="h-9 flex-1 rounded-xl border border-white/10 bg-[#151515] px-3 text-xs text-white"
                              />
                              <button
                                type="button"
                                disabled={busyAssignmentId === asgn.id}
                                onClick={() => void handleSubmitAssignment(asgn.id)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] disabled:opacity-45"
                              >
                                <Send size={12} aria-hidden="true" />
                                {existingSub ? "Update submission" : "Submit assignment"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                {/* Graded Interactive Quiz */}
                <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#b9a9d6]">
                        Graded Assessment · Pass mark {detail.quiz.passingScorePercent}%
                      </p>
                      <h2 className="mt-1 text-xl font-medium tracking-[-0.03em]">
                        {detail.quiz.title}
                      </h2>
                    </div>
                    {detail.quizAttempt && (
                      <div className="text-right text-xs">
                        <p
                          className={`font-mono text-base font-semibold tabular-nums ${
                            detail.quizAttempt.passed ? "text-emerald-300" : "text-amber-300"
                          }`}
                        >
                          {detail.quizAttempt.scorePercent}% ·{" "}
                          {detail.quizAttempt.passed ? "Passed" : "Retry needed"}
                        </p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmitQuiz} className="mt-6 space-y-6">
                    {detail.quiz.questions.map((q, idx) => (
                      <fieldset
                        key={q.id}
                        className="rounded-xl border border-white/10 bg-black/25 p-5 text-xs"
                      >
                        <legend className="font-medium text-[#f4f3ef]">
                          {idx + 1}. {q.prompt}
                        </legend>
                        <div className="mt-3 space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const checked = quizAnswers[q.id] === optIdx;
                            return (
                              <label
                                key={opt}
                                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                                  checked
                                    ? "border-[#b9a9d6] bg-[#b9a9d6]/10 text-white"
                                    : "border-white/10 text-white/70 hover:border-white/25"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  checked={checked}
                                  onChange={() =>
                                    setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                  }
                                  className="mt-0.5 accent-[#b9a9d6]"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                        {quizExplanations[q.id] && (
                          <p className="mt-3 border-t border-white/10 pt-2.5 text-[11px] text-[#b9a9d6]">
                            Explanation: {quizExplanations[q.id]}
                          </p>
                        )}
                      </fieldset>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="submit"
                        disabled={busyQuiz}
                        className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] disabled:opacity-45"
                      >
                        <ClipboardCheck size={14} aria-hidden="true" />
                        {busyQuiz
                          ? "Grading..."
                          : detail.quizAttempt
                            ? "Retake & grade quiz"
                            : "Submit quiz for grading"}
                      </button>

                      <button
                        type="button"
                        onClick={() => selectViewMode("project")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 hover:border-white/35"
                      >
                        Proceed to Linked Project <ArrowRight size={12} aria-hidden="true" />
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}

            {viewMode === "announcements" && (
              <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
                <h2 className="text-xl font-medium tracking-[-0.03em]">
                  Course announcements ({detail.announcements.length})
                </h2>
                <p className="mt-1 text-xs text-white/55">
                  Updates from course mentors, office hours, and capstone rubric reminders.
                </p>
                <div className="mt-5 space-y-4">
                  {detail.announcements.map((ann) => (
                    <article
                      key={ann.id}
                      className="rounded-xl border border-white/10 bg-black/25 p-5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-[#b9a9d6]">
                          {ann.pinned ? "Pinned update · " : ""}
                          {ann.authorName}
                        </span>
                        <span className="text-[11px] text-white/45">
                          {new Date(ann.publishedAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-base font-medium text-[#f4f3ef]">
                        {ann.title}
                      </h3>
                      <p className="mt-2 leading-6 text-white/70">{ann.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {viewMode === "project" && (
              /* LINKED PRACTICAL PROJECT WITH 5-STAGE LIFECYCLE */
              <div className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#b9a9d6]">
                        Linked Practical Project · {detail.project.estimatedHours} hours
                      </p>
                      <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] sm:text-3xl">
                        {detail.project.title}
                      </h2>
                    </div>

                    {currentProjectStatus === "not_started" && (
                      <button
                        type="button"
                        disabled={submittingProject}
                        onClick={() => void handleStartProject()}
                        className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111]"
                      >
                        <Play size={12} aria-hidden="true" />
                        Start Project
                      </button>
                    )}
                  </div>

                  {/* Lifecycle bar */}
                  <ol className="mt-5 grid gap-2 sm:grid-cols-5">
                    {PROJECT_LIFECYCLE.map((step, idx) => {
                      const activeIdx =
                        currentProjectStatus === "revision_required"
                          ? 2
                          : Math.max(
                              0,
                              PROJECT_LIFECYCLE.findIndex((s) => s.key === currentProjectStatus),
                            );
                      const reached = idx <= activeIdx;
                      const isRev = currentProjectStatus === "revision_required" && idx === 3;
                      return (
                        <li
                          key={step.key}
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            isRev
                              ? "border-amber-400/40 bg-amber-950/25 text-amber-200"
                              : reached
                                ? "border-[#b9a9d6]/40 bg-[#b9a9d6]/10 text-[#f4f3ef]"
                                : "border-white/10 bg-black/20 text-white/40"
                          }`}
                        >
                          <p className="font-medium">
                            {isRev ? "Revision Required" : step.label}
                          </p>
                        </li>
                      );
                    })}
                  </ol>

                  <p className="mt-4 text-sm leading-6 text-white/65">
                    {detail.project.brief}
                  </p>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-xs">
                      <p className="font-medium text-[#f4f3ef]">Milestones</p>
                      <ul className="mt-3 space-y-2 text-white/65">
                        {detail.project.milestones.map((m) => (
                          <li key={m} className="flex items-start gap-2">
                            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#b9a9d6]" aria-hidden="true" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-xs">
                      <p className="font-medium text-[#f4f3ef]">Deliverables &amp; Rubric</p>
                      <ul className="mt-3 space-y-2 text-white/65">
                        {detail.project.deliverables.map((d) => (
                          <li key={d} className="flex items-start gap-2">
                            <FolderGit2 size={13} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Project Submission + Mentor Critique */}
                <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
                  <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                    <h3 className="flex items-center gap-2 text-base font-medium">
                      {currentProjectStatus === "revision_required" ? (
                        <RotateCcw size={15} className="text-amber-300" aria-hidden="true" />
                      ) : (
                        <Send size={15} className="text-[#b9a9d6]" aria-hidden="true" />
                      )}
                      {currentProjectStatus === "revision_required"
                        ? `Resubmit revision to ${detail.project.mentorName}`
                        : `Submit build for mentor review (${detail.project.mentorName})`}
                    </h3>
                    <div className="mt-4 space-y-3.5 text-xs">
                      <label className="block text-white/65">
                        GitHub repository URL
                        <input
                          type="url"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          placeholder="https://github.com/your-handle/project"
                          className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"
                        />
                      </label>
                      <label className="block text-white/65">
                        Deployment URL (optional)
                        <input
                          type="url"
                          value={deploymentUrl}
                          onChange={(e) => setDeploymentUrl(e.target.value)}
                          placeholder="https://your-demo.vercel.app"
                          className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"
                        />
                      </label>
                      <label className="block text-white/65">
                        Supporting evidence (test logs / architecture notes)
                        <input
                          type="text"
                          value={supportingEvidence}
                          onChange={(e) => setSupportingEvidence(e.target.value)}
                          placeholder="e.g. Unit test logs passed + Lighthouse screenshot in repo"
                          className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"
                        />
                      </label>
                      <label className="block text-white/65">
                        Implementation summary
                        <textarea
                          rows={3}
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          placeholder="Describe your architecture, verification checks, and tests..."
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                        />
                      </label>
                      <label className="block text-white/65">
                        Trade-offs &amp; reflection (optional)
                        <textarea
                          rows={2}
                          value={reflection}
                          onChange={(e) => setReflection(e.target.value)}
                          placeholder="What tradeoffs did you make?"
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                        />
                      </label>

                      <div className="flex flex-col items-center gap-2 pt-2">
                        <SlideCommit
                          label={
                            currentProjectStatus === "revision_required"
                              ? "Slide to resubmit revision"
                              : "Slide to submit capstone"
                          }
                          doneLabel="Submitted to mentor"
                          errorLabel="Missing details"
                          trackColor="#1a1820"
                          handleColor="#f4f3ef"
                          successColor="#22c55e"
                          dangerColor="#e5484d"
                          width={276}
                          height={50}
                          disabled={submittingProject}
                          onConfirm={handleSubmitProject}
                        />
                        <p className="text-[11px] text-white/45">
                          Slide across or focus and press End to send your repository to mentors.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                      <h3 className="text-base font-medium">
                        Submission history &amp; feedback ({submissions.length})
                      </h3>
                      <div className="mt-4 space-y-3 text-xs">
                        {submissions.map((sub) => (
                          <article
                            key={sub.id}
                            className="rounded-xl border border-white/10 bg-black/25 p-4"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-[#f4f3ef]">
                                {sub.learnerName}
                              </span>
                              <span
                                className={`capitalize font-medium ${
                                  sub.status === "approved"
                                    ? "text-emerald-300"
                                    : sub.status === "revision_required"
                                      ? "text-amber-300"
                                      : "text-[#b9a9d6]"
                                }`}
                              >
                                {sub.status.replaceAll("_", " ")}
                              </span>
                            </div>
                            {(sub.githubUrl || sub.artifactUrl) && (
                              <p className="mt-1 truncate font-mono text-[11px] text-[#b9a9d6]">
                                {sub.githubUrl || sub.artifactUrl}
                              </p>
                            )}
                            <p className="mt-1.5 text-white/60">{sub.summary}</p>
                            {sub.supportingEvidence && (
                              <p className="mt-1 text-[11px] text-white/45">
                                Evidence: {sub.supportingEvidence}
                              </p>
                            )}
                            {sub.mentorFeedback && (
                              <p className="mt-2 rounded-lg border border-emerald-400/20 bg-emerald-950/20 p-3 text-emerald-200">
                                Mentor ({sub.mentorName}): {sub.mentorFeedback}
                              </p>
                            )}
                          </article>
                        ))}
                        {submissions.length === 0 && (
                          <p className="text-white/45">
                            No submissions yet for this project. Click &ldquo;Start Project&rdquo; or submit your build on the left.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#b9a9d6]/25 bg-[#131118] p-5 text-xs">
                      <p className="font-medium text-[#f4f3ef]">
                        Internship &amp; Certificate Pathway
                      </p>
                      <p className="mt-1.5 leading-5 text-white/55">
                        {course.internshipDisclosure}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href="/internships"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 font-medium text-[#111111]"
                        >
                          Internship track <ArrowUpRight size={12} aria-hidden="true" />
                        </Link>
                        <Link
                          href="/certificates"
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white/80 hover:border-white/35"
                        >
                          Optional certificates (₹299–₹599)
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
