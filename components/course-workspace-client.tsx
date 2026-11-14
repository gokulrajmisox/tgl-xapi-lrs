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
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  FileUp,
  FolderGit2,
  Lock,
  Play,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
import type { CourseLesson } from "@/lib/courses/catalog";
import type { CourseDetailResponse } from "@/lib/courses/store";
import { getProjectGuidance } from "@/lib/learning-graph";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";
import SlideCommit from "@/components/react-bits/SlideCommit";
import type {
  CertificateIssuanceRecord,
  InternshipApplicationRecord,
  InternshipRecord,
} from "@/lib/certifications/store";
import type {
  ProjectSubmissionRecord,
  ProjectSubmissionStatus,
  SupportingFileMeta,
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
  initialInternshipTrack = null,
  initialInternshipApplication = null,
  initialIssuedCertificate = null,
  user,
  isSandbox,
}: {
  initialDetail: CourseDetailResponse;
  initialInternshipTrack?: InternshipRecord | null;
  initialInternshipApplication?: InternshipApplicationRecord | null;
  initialIssuedCertificate?: CertificateIssuanceRecord | null;
  user: WorkspaceActor;
  isSandbox: boolean;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<CourseDetailResponse>(initialDetail);
  const [internshipTrack, setInternshipTrack] = useState<InternshipRecord | null>(
    initialInternshipTrack,
  );
  const [internshipApplication, setInternshipApplication] =
    useState<InternshipApplicationRecord | null>(initialInternshipApplication);
  const [issuedCertificate, setIssuedCertificate] =
    useState<CertificateIssuanceRecord | null>(initialIssuedCertificate);
  const [claimingCert, setClaimingCert] = useState(false);
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
  const [supportingFiles, setSupportingFiles] = useState<SupportingFileMeta[]>([]);
  const [summary, setSummary] = useState("");
  const [reflection, setReflection] = useState("");
  const [submittingProject, setSubmittingProject] = useState(false);

  const refreshDetail = useCallback(async () => {
    const res = await fetch(`/api/courses/${detail.course.slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const fresh = (await res.json()) as CourseDetailResponse & {
      internshipTrack?: InternshipRecord | null;
      internshipApplication?: InternshipApplicationRecord | null;
      issuedCertificate?: CertificateIssuanceRecord | null;
    };
    setDetail(fresh);
    if ("internshipTrack" in fresh) {
      setInternshipTrack(fresh.internshipTrack ?? null);
    }
    if ("internshipApplication" in fresh) {
      setInternshipApplication(fresh.internshipApplication ?? null);
    }
    if ("issuedCertificate" in fresh) {
      setIssuedCertificate(fresh.issuedCertificate ?? null);
    }
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

  const nextIncompleteInfo = useMemo(() => {
    if (detail.locked) {
      return { lesson: null as CourseLesson | null, moduleTitle: "" };
    }
    for (const mod of detail.modules) {
      for (const les of mod.lessons) {
        if (detail.lessonProgress[les.id]?.status !== "completed") {
          return { lesson: les, moduleTitle: `Module ${mod.sortOrder}: ${mod.title}` };
        }
      }
    }
    const lastMod = detail.modules[detail.modules.length - 1];
    const firstLes = detail.modules[0]?.lessons[0] ?? null;
    return {
      lesson: firstLes,
      moduleTitle: lastMod ? `Module ${lastMod.sortOrder}: ${lastMod.title}` : "",
    };
  }, [detail]);

  const projectGuidance = useMemo(
    () => (detail.locked ? null : getProjectGuidance(detail.project)),
    [detail],
  );

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

  const handleSupportingFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).slice(0, 5);
    if (picked.length === 0) return;
    setSupportingFiles((prev) => {
      const merged = [...prev];
      for (const file of picked) {
        if (!merged.some((f) => f.name === file.name && f.sizeBytes === file.size)) {
          merged.push({
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type || "application/octet-stream",
          });
        }
      }
      return merged.slice(0, 5);
    });
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
          supportingFiles,
          summary: summary.trim(),
          reflection: reflection.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit project.");
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
      setSupportingFiles([]);
      await refreshDetail();
      setNotice("Project submitted for mentor review.");
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleClaimIncludedCertificate = async () => {
    if (!internshipApplication) return;
    setClaimingCert(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/certificates/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipApplicationId: internshipApplication.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not claim included certificate.");
        return;
      }
      if (data.issuance) {
        setIssuedCertificate(data.issuance);
        setNotice(`Included Internship Completion Certificate issued (${data.issuance.certificate_id}).`);
      }
      await refreshDetail();
    } finally {
      setClaimingCert(false);
    }
  };

  const course = detail.course;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-24 pt-28 text-[#f4f3ef] md:px-12 md:pt-36">
      {/* Top Breadcrumb & Programme Hero Summary */}
      <div className="border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/programmes"
            className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All programmes
          </Link>
          <span className="text-xs text-[#b9a9d6]">
            {course.category} · {course.estimatedHours}h study + {course.internshipDurationWeeks}-week internship
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
              {course.mentorRole} · Included Internship:{" "}
              <Link href="/internships" className="text-[#b9a9d6] hover:underline">
                {course.linkedInternshipTitle}
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/50">Programme access</span>
              {detail.locked ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-200">
                  <Lock size={13} aria-hidden="true" />
                  Syllabus preview
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  Enrolled · Internship {internshipApplication ? "active" : "included"}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
              <span className="text-white/50">Single programme fee</span>
              <span className="font-mono text-xl font-semibold tabular-nums text-[#f4f3ef]">
                {formatInrFromPaise(course.pricePaise)}{" "}
                <span className="text-xs font-normal text-white/45">all-inclusive</span>
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
                Practical Project, Internship Tasks &amp; Completion Criteria
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

              <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-xs">
                <p className="font-medium text-[#f4f3ef]">
                  Included Internship: {course.linkedInternshipTitle} ({course.internshipDurationWeeks} weeks)
                </p>
                {internshipTrack?.tasks && internshipTrack.tasks.length > 0 && (
                  <ul className="space-y-2 text-white/65">
                    {internshipTrack.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5"
                      >
                        <span className="font-medium text-white/90">{task.title}</span>{" "}
                        <span className="text-[#b9a9d6]">({task.deadlineLabel})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4 text-xs">
                <p className="font-medium text-[#f4f3ef]">
                  Completion requirements for your included certificate (₹0 extra)
                </p>
                <ul className="mt-2.5 space-y-1.5 text-white/70">
                  {course.completionRequirements.map((req) => (
                    <li key={req} className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-emerald-300/90">
                  {course.includedCertificateTitle}: {course.certificateInfo}
                </p>
              </div>
            </section>
          </div>

          <aside className="self-start space-y-6">
            <section className="rounded-2xl border border-[#b9a9d6]/30 bg-[#131118] p-6 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#b9a9d6]">
                All-inclusive single enrolment fee
              </p>
              <div className="mt-3 flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-medium tracking-[-0.03em]">
                  Enrol Now
                </h2>
                <span className="font-mono text-2xl font-semibold tabular-nums text-[#f4f3ef]">
                  {formatInrFromPaise(course.pricePaise)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/60">
                Pay once to unlock course lessons, assignments, practical project feedback, internship tasks, and your included Internship Completion Certificate (₹0 extra after mentor approval).
              </p>

              <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs text-white/75">
                <p className="font-medium text-white">Everything included with this payment:</p>
                <ul className="space-y-1.5 text-white/70">
                  {course.includes.map((inc) => (
                    <li key={inc} className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
                      <span>{inc}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span>{course.assignmentCount} hands-on assignments &amp; graded assessment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span>Official {course.includedCertificateTitle} (₹0 extra fee)</span>
                  </li>
                </ul>
              </div>

              <div className="mt-5 border-t border-white/10 pt-5">
                {!user && !isSandbox ? (
                  <Link
                    href={`/auth/login?next=${encodeURIComponent(`/programmes/${course.slug}`)}`}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111111]"
                  >
                    Sign in to Enrol Now ({formatInrFromPaise(course.pricePaise)})
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                ) : (
                  <RazorpayCheckoutButton
                    orderKind="programme_enrollment"
                    courseId={course.id}
                    productName={course.title}
                    pricePaise={course.pricePaise}
                    courseDuration={`${course.estimatedHours}h course + ${course.internshipDurationWeeks}-wk internship`}
                    whatYouReceive={course.includes}
                    eligible={true}
                    alreadyEnrolled={false}
                    studentName={user?.name}
                    studentEmail={user?.email}
                    onSuccess={() => void refreshDetail()}
                  />
                )}
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-white/60">
                <p className="flex items-center gap-1.5 font-medium text-white/90">
                  <ShieldCheck size={14} className="text-[#b9a9d6]" aria-hidden="true" />
                  One-fee guarantee · No hidden certificate cost
                </p>
                <p className="mt-1.5">{course.internshipDisclosure}</p>
              </div>
            </section>
          </aside>
        </div>
      ) : (
        /* UNLOCKED ENROLLED COURSE WORKSPACE */
        <div className="mt-8 space-y-6">
          {/* Top Progress Banner with Continue Learning CTA */}
          <section
            aria-label="Course progress overview"
            className="flex flex-col justify-between gap-5 rounded-2xl border border-[#b9a9d6]/30 bg-[#131118] p-5 sm:flex-row sm:items-center sm:p-6"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="font-medium text-[#b9a9d6]">
                  Overall Progress: <strong className="font-mono text-white">{course.progressPercent}%</strong>
                </span>
                <span className="text-white/70">
                  Lessons Completed: <strong className="font-mono text-white">{course.completedLessonCount}/{course.lessonCount}</strong>
                </span>
                {nextIncompleteInfo.moduleTitle && (
                  <span className="truncate text-white/60">
                    Current Module: <strong className="text-white/90">{nextIncompleteInfo.moduleTitle}</strong>
                  </span>
                )}
              </div>
              <div className="h-2 w-full max-w-xl overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#b9a9d6] transition-all"
                  style={{ width: `${course.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {nextIncompleteInfo.lesson && (
                <button
                  type="button"
                  onClick={() => {
                    selectViewMode("lessons");
                    setActiveLessonId(nextIncompleteInfo.lesson!.id);
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] hover:bg-white whitespace-nowrap shrink-0"
                >
                  <PlayCircle size={14} aria-hidden="true" />
                  Continue Learning
                </button>
              )}
              <button
                type="button"
                onClick={() => selectViewMode("project")}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/85 hover:border-white/35 whitespace-nowrap shrink-0"
              >
                <FolderGit2 size={14} aria-hidden="true" />
                {currentProjectStatus === "not_started" ? "Start Project" : "Open Project"}
              </button>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-[310px_1fr]">
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

                  <p className="mt-4 text-sm leading-6 text-white/75">
                    {detail.project.brief}
                  </p>

                  {projectGuidance && (
                    <>
                      <div className="mt-5 grid gap-4 rounded-xl border border-white/10 bg-black/30 p-4 text-xs sm:grid-cols-2">
                        <div>
                          <p className="font-medium text-[#b9a9d6]">Why this project matters</p>
                          <p className="mt-1 leading-5 text-white/65">{projectGuidance.whyItMatters}</p>
                        </div>
                        <div>
                          <p className="flex items-center gap-1.5 font-medium text-[#b9a9d6]">
                            <CalendarClock size={13} aria-hidden="true" />
                            Submission deadline &amp; method
                          </p>
                          <p className="mt-1 leading-5 text-white/65">
                            <strong className="text-white/90">{projectGuidance.submissionDeadline}</strong> ·{" "}
                            {projectGuidance.submissionMethod}
                          </p>
                        </div>
                      </div>

                      {projectGuidance.requiredSkills.length > 0 && (
                        <div className="mt-4 text-xs text-white/65">
                          <span className="font-medium text-white/90">Required skills: </span>
                          {projectGuidance.requiredSkills.join(" · ")}
                        </div>
                      )}

                      <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-xs">
                          <p className="font-medium text-[#f4f3ef]">Step-by-step instructions</p>
                          <ol className="mt-3 list-decimal space-y-2 pl-4 text-white/70">
                            {projectGuidance.stepByStep.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-xs">
                          <p className="font-medium text-[#f4f3ef]">How mentors evaluate your work</p>
                          <ul className="mt-3 space-y-2 text-white/70">
                            {projectGuidance.evaluationCriteria.map((criterion) => (
                              <li key={criterion} className="flex items-start gap-2">
                                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                                <span>{criterion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </>
                  )}
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
                        ? `Resubmit Project to ${detail.project.mentorName}`
                        : `Submit Project for Mentor Review (${detail.project.mentorName})`}
                    </h3>
                    <div className="mt-4 space-y-3.5 text-xs">
                      <label className="block text-white/70">
                        GitHub repository URL
                        <input
                          type="url"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          placeholder="https://github.com/your-handle/project"
                          className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"
                        />
                      </label>
                      <label className="block text-white/70">
                        Live demo URL (optional)
                        <input
                          type="url"
                          value={deploymentUrl}
                          onChange={(e) => setDeploymentUrl(e.target.value)}
                          placeholder="https://your-demo.vercel.app"
                          className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"
                        />
                      </label>
                      <label className="block text-white/70">
                        Notes or test summary
                        <input
                          type="text"
                          value={supportingEvidence}
                          onChange={(e) => setSupportingEvidence(e.target.value)}
                          placeholder="e.g. All checks pass, screenshots saved in /docs"
                          className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white"
                        />
                      </label>

                      <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3.5">
                        <label className="flex cursor-pointer items-center justify-between gap-3 text-white/75">
                          <span className="flex items-center gap-2 font-medium">
                            <FileUp size={14} className="text-[#b9a9d6]" aria-hidden="true" />
                            Attach supporting files (optional PDF, PNG, MD, ZIP)
                          </span>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg,.md,.txt,.json,.zip"
                            onChange={handleSupportingFilesChange}
                            className="sr-only"
                          />
                          <span className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/85 hover:border-white/35">
                            Choose files
                          </span>
                        </label>
                        {supportingFiles.length > 0 && (
                          <ul className="space-y-1.5 pt-1">
                            {supportingFiles.map((file) => (
                              <li
                                key={file.name}
                                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-[11px]"
                              >
                                <span className="truncate text-white/85">{file.name}</span>
                                <button
                                  type="button"
                                  aria-label={`Remove ${file.name}`}
                                  onClick={() =>
                                    setSupportingFiles((prev) =>
                                      prev.filter((f) => f.name !== file.name),
                                    )
                                  }
                                  className="ml-2 text-white/55 hover:text-white"
                                >
                                  <X size={13} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <label className="block text-white/70">
                        What did you build? (10+ characters)
                        <textarea
                          rows={3}
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          placeholder="Briefly explain what your project does and how you tested it..."
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                        />
                      </label>
                      <label className="block text-white/70">
                        Questions for your mentor (optional)
                        <textarea
                          rows={2}
                          value={reflection}
                          onChange={(e) => setReflection(e.target.value)}
                          placeholder="Anything you would like extra feedback on?"
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                        />
                      </label>

                      <div className="flex flex-col items-center gap-3 pt-2">
                        <SlideCommit
                          label={
                            currentProjectStatus === "revision_required"
                              ? "Slide to Resubmit Project"
                              : "Slide to Submit Project"
                          }
                          doneLabel="Submitted to mentor"
                          errorLabel="Check required fields"
                          trackColor="#1a1820"
                          handleColor="#f4f3ef"
                          successColor="#22c55e"
                          dangerColor="#e5484d"
                          width={276}
                          height={50}
                          disabled={submittingProject}
                          onConfirm={handleSubmitProject}
                        />
                        <button
                          type="button"
                          disabled={submittingProject}
                          onClick={() => void handleSubmitProject().catch(() => {})}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-xs font-medium text-white hover:border-white/40 disabled:opacity-45"
                        >
                          <Send size={13} aria-hidden="true" />
                          {currentProjectStatus === "revision_required"
                            ? "Resubmit Project"
                            : "Submit Project"}
                        </button>
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
                                className={`inline-flex items-center gap-1 capitalize font-medium ${
                                  sub.status === "approved"
                                    ? "text-emerald-300"
                                    : sub.status === "revision_required"
                                      ? "text-amber-300"
                                      : "text-[#b9a9d6]"
                                }`}
                              >
                                <CheckCircle2 size={12} aria-hidden="true" />
                                {sub.status.replaceAll("_", " ")}
                              </span>
                            </div>
                            {(sub.githubUrl || sub.artifactUrl) && (
                              <p className="mt-1 truncate font-mono text-[11px] text-[#b9a9d6]">
                                {sub.githubUrl || sub.artifactUrl}
                              </p>
                            )}
                            <p className="mt-1.5 text-white/65">{sub.summary}</p>
                            {sub.supportingEvidence && (
                              <p className="mt-1 text-[11px] text-white/50">
                                Notes: {sub.supportingEvidence}
                              </p>
                            )}
                            {sub.supportingFiles && sub.supportingFiles.length > 0 && (
                              <p className="mt-1 text-[11px] text-white/55">
                                Files: {sub.supportingFiles.map((f) => f.name).join(", ")}
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
                          <p className="text-white/50">
                            No submissions yet for this project. Click &ldquo;Start Project&rdquo; or submit your build on the left.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#b9a9d6]/25 bg-[#131118] p-5 text-xs">
                      <p className="font-medium text-[#f4f3ef]">
                        Bundled Internship &amp; Included Certificate (₹0 extra)
                      </p>
                      <p className="mt-1.5 leading-5 text-white/60">
                        {issuedCertificate
                          ? `Your included certificate (${issuedCertificate.certificate_id}) has been issued and is ready to download.`
                          : internshipApplication?.mentor_approved && internshipApplication.status === "completed"
                            ? "All internship tasks and mentor evaluations are approved! Claim your included Internship Completion Certificate now at ₹0 extra."
                            : internshipApplication
                              ? "Your linked internship track is active! Complete its weekly deliverables in the Internship Workspace to earn your included certificate (₹0 extra)."
                              : "Complete your project submission and mentor review to finish your bundled internship track and receive your included certificate (₹0 extra)."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href="/internships"
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 font-medium text-[#111111]"
                        >
                          Open Internship Tasks <ArrowUpRight size={12} aria-hidden="true" />
                        </Link>
                        {issuedCertificate ? (
                          <Link
                            href={`/verify/certificate/${encodeURIComponent(issuedCertificate.certificate_id)}`}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-emerald-400/35 px-4 py-2 text-emerald-200 hover:border-emerald-300"
                          >
                            Download Certificate <ArrowUpRight size={12} aria-hidden="true" />
                          </Link>
                        ) : internshipApplication?.mentor_approved &&
                          internshipApplication.status === "completed" ? (
                          <button
                            type="button"
                            disabled={claimingCert}
                            onClick={() => void handleClaimIncludedCertificate()}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#b9a9d6]/45 px-4 py-2 font-medium text-[#f4f3ef] hover:bg-[#b9a9d6]/15 disabled:opacity-50"
                          >
                            {claimingCert ? "Issuing..." : "Claim Included Certificate (₹0 extra)"}
                          </button>
                        ) : (
                          <Link
                            href="/certificates"
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white/85 hover:border-white/35"
                          >
                            Check Certificate Status
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
