"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
import type { CourseDetailResponse } from "@/lib/courses/store";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";
import type {
  CertificateIssuanceRecord,
  InternshipApplicationRecord,
  InternshipRecord,
} from "@/lib/certifications/store";
import type {
  ProjectSubmissionRecord,
  SupportingFileMeta,
} from "@/lib/learning-workspace-store";
import {
  computeUnifiedProgrammeProgression,
  type ProgressionStepKey,
  type UnifiedProgrammeProgression,
} from "@/lib/learning/progression";
import { LearningWorkspaceHeader } from "@/components/workspace/LearningWorkspaceHeader";
import { LearningRoadmap } from "@/components/workspace/LearningRoadmap";
import { WorkspaceProgressSidebar } from "@/components/workspace/WorkspaceProgressSidebar";
import { syncProjectSubmissionToFirestore } from "@/lib/firebase/firestore-sync";

type WorkspaceActor = {
  id: string;
  name: string;
  email: string;
  role: string;
  isSandbox?: boolean;
} | null;

const ALL_STEP_KEYS: ProgressionStepKey[] = [
  "enrolled",
  "learning_modules",
  "modules_completed",
  "project_unlocked",
  "project_submitted",
  "project_approved",
  "program_completed",
  "certificate_unlocked",
  "certificate_claimed",
];

function buildDefaultExpanded(
  progression: UnifiedProgrammeProgression | null,
): Record<ProgressionStepKey, boolean> {
  const map = Object.fromEntries(ALL_STEP_KEYS.map((k) => [k, false])) as Record<
    ProgressionStepKey,
    boolean
  >;
  if (!progression) return map;
  map[progression.currentStep.key] = true;
  if (
    progression.currentStep.key === "project_unlocked" ||
    progression.currentStep.key === "project_approved"
  ) {
    map.project_submitted = true;
  }
  return map;
}

export function CourseWorkspaceClient({
  initialDetail,
  initialLessonId,
  initialInternshipTrack = null,
  initialInternshipApplication = null,
  initialIssuedCertificate = null,
  initialProgression = null,
  initialEnrolledAt = null,
  initialCompletedOn = null,
  initialClaimedAt = null,
  initialProjectSubmissions = [],
  user,
  isSandbox,
}: {
  initialDetail: CourseDetailResponse;
  initialLessonId?: string;
  initialInternshipTrack?: InternshipRecord | null;
  initialInternshipApplication?: InternshipApplicationRecord | null;
  initialIssuedCertificate?: CertificateIssuanceRecord | null;
  initialProgression?: UnifiedProgrammeProgression | null;
  initialEnrolledAt?: string | null;
  initialCompletedOn?: string | null;
  initialClaimedAt?: string | null;
  initialProjectSubmissions?: ProjectSubmissionRecord[];
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
  const [enrolledAt, setEnrolledAt] = useState<string | null>(initialEnrolledAt);
  const [completedOn, setCompletedOn] = useState<string | null>(initialCompletedOn);
  const [claimedAt, setClaimedAt] = useState<string | null>(initialClaimedAt);

  const [claimingCert, setClaimingCert] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<ProgressionStepKey, boolean>>(
    () => {
      const base = buildDefaultExpanded(initialProgression);
      if (initialLessonId && !initialDetail.locked) {
        const hasRequested = initialDetail.modules.some((m) =>
          m.lessons.some((l) => l.id === initialLessonId),
        );
        if (hasRequested) {
          base.learning_modules = true;
        }
      }
      return base;
    },
  );

  const [activeLessonId, setActiveLessonId] = useState<string>(() => {
    if (!initialDetail.locked && initialDetail.modules[0]?.lessons[0]) {
      const allLessonIds = new Set(
        initialDetail.modules.flatMap((m) => m.lessons.map((l) => l.id)),
      );
      if (initialLessonId && allLessonIds.has(initialLessonId)) {
        return initialLessonId;
      }
      if (
        initialDetail.lastVisitedLessonId &&
        allLessonIds.has(initialDetail.lastVisitedLessonId)
      ) {
        return initialDetail.lastVisitedLessonId;
      }
      for (const mod of initialDetail.modules) {
        for (const les of mod.lessons) {
          if (initialDetail.lessonProgress[les.id]?.status !== "completed") {
            return les.id;
          }
        }
      }
      return initialDetail.modules[0].lessons[0].id;
    }
    return "";
  });
  const [busyLessonId, setBusyLessonId] = useState<string | null>(null);
  const [busyExerciseLessonId, setBusyExerciseLessonId] = useState<string | null>(null);
  const [busyKnowledgeLessonId, setBusyKnowledgeLessonId] = useState<string | null>(null);
  const [busyModuleQuizId, setBusyModuleQuizId] = useState<string | null>(null);
  const [moduleQuizExplanations, setModuleQuizExplanations] = useState<
    Record<string, Record<string, string>>
  >({});
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
  const [submissions, setSubmissions] = useState<ProjectSubmissionRecord[]>(
    initialProjectSubmissions,
  );
  const [githubUrl, setGithubUrl] = useState(
    () =>
      initialProjectSubmissions[0]?.status === "revision_required"
        ? initialProjectSubmissions[0].githubUrl ||
          initialProjectSubmissions[0].artifactUrl ||
          ""
        : "",
  );
  const [deploymentUrl, setDeploymentUrl] = useState(
    () =>
      initialProjectSubmissions[0]?.status === "revision_required"
        ? initialProjectSubmissions[0].deploymentUrl ?? ""
        : "",
  );
  const [supportingEvidence, setSupportingEvidence] = useState(
    () =>
      initialProjectSubmissions[0]?.status === "revision_required"
        ? initialProjectSubmissions[0].supportingEvidence ?? ""
        : "",
  );
  const [supportingFiles, setSupportingFiles] = useState<SupportingFileMeta[]>([]);
  const [summary, setSummary] = useState(
    () =>
      initialProjectSubmissions[0]?.status === "revision_required"
        ? initialProjectSubmissions[0].summary ?? ""
        : "",
  );
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
      progression?: UnifiedProgrammeProgression | null;
      enrolledAt?: string | null;
      completedOn?: string | null;
      claimedAt?: string | null;
      projectSubmissions?: ProjectSubmissionRecord[];
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
    if ("enrolledAt" in fresh) setEnrolledAt(fresh.enrolledAt ?? null);
    if ("completedOn" in fresh) setCompletedOn(fresh.completedOn ?? null);
    if ("claimedAt" in fresh) setClaimedAt(fresh.claimedAt ?? null);
    if ("projectSubmissions" in fresh && fresh.projectSubmissions) {
      setSubmissions(fresh.projectSubmissions);
    }
    if (!fresh.locked) {
      const validIds = new Set(fresh.modules.flatMap((m) => m.lessons.map((l) => l.id)));
      const firstId = fresh.modules[0]?.lessons[0]?.id ?? "";
      setActiveLessonId((prev) => {
        if (prev && validIds.has(prev)) return prev;
        if (fresh.lastVisitedLessonId && validIds.has(fresh.lastVisitedLessonId)) {
          return fresh.lastVisitedLessonId;
        }
        return firstId;
      });
      if (fresh.quizAttempt) {
        setQuizAnswers(fresh.quizAttempt.answers);
      }
      if (fresh.progression) {
        setExpandedSteps((prev) => ({
          ...prev,
          [fresh.progression!.currentStep.key]: true,
        }));
      }
    }
    router.refresh();
  }, [detail.course.slug, router]);

  useEffect(() => {
    if (detail.locked || initialProjectSubmissions.length > 0) return;
    const projectSlug = detail.project.slug;
    fetch("/api/workspace/learner", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.workspace?.submissions) {
          const allSubs = data.workspace.submissions as ProjectSubmissionRecord[];
          const matching = allSubs.filter((s) => s.projectSlug === projectSlug);
          setSubmissions(matching);
        }
      })
      .catch(() => {});
  }, [detail.locked, detail.locked ? "" : detail.project.slug, initialProjectSubmissions.length]);

  const liveProgression = useMemo<UnifiedProgrammeProgression | null>(() => {
    if (detail.locked) return null;
    const tasks = internshipTrack?.tasks ?? [];
    const taskSubs = internshipApplication?.task_submissions ?? [];
    const approvedTasksCount = tasks.filter(
      (t) => taskSubs.find((s) => s.taskId === t.id)?.status === "approved",
    ).length;

    const latestProjectStatus =
      submissions[0]?.status ?? detail.internshipEligibility.projectStatus;

    return computeUnifiedProgrammeProgression({
      enrolled: detail.enrolled || user?.role === "admin",
      completedLessonCount: detail.course.completedLessonCount,
      totalLessonCount: detail.course.lessonCount,
      quizPassed: detail.course.quizPassed,
      projectStatus: latestProjectStatus,
      hasInternshipTrack: Boolean(internshipTrack),
      totalInternshipTasks: tasks.length,
      approvedInternshipTasksCount: approvedTasksCount,
      internshipFinalApproved: Boolean(
        internshipApplication?.status === "completed" &&
          internshipApplication?.mentor_approved,
      ),
      certificateStatus: issuedCertificate?.issuance_status ?? "none",
      certificateClaimed: Boolean(claimedAt),
    });
  }, [
    detail,
    internshipTrack,
    internshipApplication,
    submissions,
    issuedCertificate,
    claimedAt,
    user?.role,
  ]);

  const jumpToStep = useCallback((key: ProgressionStepKey) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: true }));
    if (typeof document !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.getElementById(`roadmap-step-${key}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, []);

  const toggleStep = useCallback((key: ProgressionStepKey) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSelectLessonId = useCallback(
    (lessonId: string) => {
      setActiveLessonId(lessonId);
      if (detail.locked) return;
      setDetail((prev) => {
        if (prev.locked) return prev;
        return {
          ...prev,
          lastVisitedLessonId: lessonId,
          course: { ...prev.course, lastVisitedLessonId: lessonId },
        };
      });
      fetch(`/api/courses/${detail.course.slug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "visit_lesson", lessonId }),
      }).catch(() => {});
    },
    [detail.locked, detail.course.slug],
  );

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
      await refreshDetail();
    } finally {
      setBusyLessonId(null);
    }
  };

  const handleToggleExerciseComplete = async (lessonId: string, completed: boolean) => {
    if (detail.locked) return;
    setBusyExerciseLessonId(lessonId);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/courses/${detail.course.slug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_exercise", lessonId, completed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update exercise completion.");
        return;
      }
      setDetail((prev) => {
        if (prev.locked) return prev;
        return {
          ...prev,
          exerciseCompletions: data.exerciseCompletions ?? prev.exerciseCompletions,
          course: data.summary ?? prev.course,
        };
      });
      setNotice(
        completed
          ? "Practical exercise marked complete."
          : "Practical exercise marked incomplete.",
      );
      await refreshDetail();
    } finally {
      setBusyExerciseLessonId(null);
    }
  };

  const handleSubmitKnowledgeCheck = async (lessonId: string, selectedIndex: number) => {
    if (detail.locked) return;
    setBusyKnowledgeLessonId(lessonId);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/courses/${detail.course.slug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_knowledge_check", lessonId, selectedIndex }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not grade knowledge check.");
        return;
      }
      setDetail((prev) => {
        if (prev.locked) return prev;
        return {
          ...prev,
          knowledgeCheckResults: data.knowledgeCheckResults ?? prev.knowledgeCheckResults,
        };
      });
      setNotice(
        data.result?.passed
          ? "Knowledge check verified! Explanation unlocked below."
          : "Answer recorded — review the explanation below and retry anytime.",
      );
    } finally {
      setBusyKnowledgeLessonId(null);
    }
  };

  const handleSubmitModuleQuiz = async (
    moduleId: string,
    answers: Record<string, number>,
  ) => {
    if (detail.locked) return;
    setBusyModuleQuizId(moduleId);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/courses/${detail.course.slug}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_module_quiz", moduleId, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not grade module quiz.");
        return;
      }
      if (data.explanations) {
        setModuleQuizExplanations((prev) => ({
          ...prev,
          [moduleId]: data.explanations,
        }));
      }
      setDetail((prev) => {
        if (prev.locked) return prev;
        return {
          ...prev,
          moduleQuizAttempts: data.moduleQuizAttempts ?? prev.moduleQuizAttempts,
          course: data.summary ?? prev.course,
        };
      });
      setNotice(
        data.attempt?.passed
          ? `Module checkpoint quiz passed (${data.attempt.scorePercent}%).`
          : `Module quiz scored ${data.attempt?.scorePercent ?? 0}%. Review explanations and retry.`,
      );
      await refreshDetail();
    } finally {
      setBusyModuleQuizId(null);
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
          ? `Quiz passed (${data.attempt.scorePercent}%). Practical Project Assignment is now unlocked.`
          : `Quiz scored ${data.attempt?.scorePercent ?? 0}%. Review feedback and retake anytime.`,
      );
      await refreshDetail();
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
      jumpToStep("project_submitted");
      setNotice("Project Assignment started. Submit your GitHub build below when ready.");
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
        void syncProjectSubmissionToFirestore({
          id: data.submission.id,
          projectSlug: detail.project.slug,
          pathwaySlug: data.submission.pathwaySlug,
          cohortName: data.submission.cohortName,
          learnerName: data.submission.learnerName,
          githubUrl: githubUrl.trim(),
          deploymentUrl: deploymentUrl.trim(),
          supportingEvidence: supportingEvidence.trim(),
          supportingFiles,
          summary: summary.trim(),
          reflection: reflection.trim(),
        });
      }
      setSummary("");
      setReflection("");
      setSupportingFiles([]);
      await refreshDetail();
      setNotice("Project submitted for mentor evaluation.");
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleClaimIncludedCertificate = async () => {
    setClaimingCert(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/certificates/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipApplicationId: internshipApplication?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not claim included certificate.");
        return;
      }
      if (data.issuance) {
        setIssuedCertificate(data.issuance);
        if (data.claimedAt) setClaimedAt(data.claimedAt);
        setNotice(
          `Official Certificate issued (${data.issuance.certificate_id}). Your verified PDF is ready below.`,
        );
      }
      await refreshDetail();
      jumpToStep("certificate_claimed");
    } finally {
      setClaimingCert(false);
    }
  };

  const handleDownloadCertificate = () => {
    if (!issuedCertificate) return;
    if (!claimedAt) {
      setClaimedAt(new Date().toISOString());
      fetch("/api/certificates/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCertificateId: issuedCertificate.certificate_id }),
      }).catch(() => {});
    }
  };

  const course = detail.course;

  /* LOCKED VISITOR VIEW — Syllabus, Skills, Project Preview & Single-Fee Enrolment */
  if (detail.locked) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 pb-24 pt-28 text-foreground md:px-12 md:pt-36">
        <div className="border-b border-border pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/programmes"
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Explore all programmes
            </Link>
            <span className="text-xs font-medium text-accent">
              {course.category} · {course.estimatedHours}h study + {course.internshipDurationWeeks}-week internship
            </span>
          </div>

          <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {course.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {course.subtitle}
              </p>
              {course.skills.length > 0 && (
                <p className="mt-3 text-xs text-accent">
                  Skills taught:{" "}
                  <span className="text-foreground/85">{course.skills.join(" · ")}</span>
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Lead Mentor: <strong className="text-foreground">{course.mentorName}</strong> ·{" "}
                {course.mentorRole} · Included Internship:{" "}
                <span className="font-medium text-accent">{course.linkedInternshipTitle}</span>
              </p>
            </div>

            <div className="tgl-glass rounded-2xl p-5 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Programme access</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                  <Lock size={13} aria-hidden="true" />
                  Syllabus preview
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">Single programme fee</span>
                <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
                  {formatInrFromPaise(course.pricePaise)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">all-inclusive</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-8">
            <section className="tgl-glass rounded-3xl p-6 sm:p-7">
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                Skills taught &amp; learning outcomes
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Complete technical capabilities and deliverables included in this {course.estimatedHours}-hour course:
              </p>
              {course.skills.length > 0 && (
                <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-xs font-medium text-accent">
                  {course.skills.join(" · ")}
                </p>
              )}
              <ul className="mt-4 space-y-2.5 text-xs leading-6 text-foreground/85">
                {course.outcomes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={14}
                      className="mt-1 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {course.prerequisites.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Prerequisites before starting
                  </h3>
                  <ul className="mt-2.5 space-y-1.5 text-xs leading-6 text-muted-foreground">
                    {course.prerequisites.map((pre) => (
                      <li key={pre} className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                        />
                        <span>{pre}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="tgl-glass rounded-3xl p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                  Course syllabus ({detail.syllabusModules.length} modules)
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock size={13} aria-hidden="true" />
                  Notes, videos, quizzes &amp; assignments locked until enrolled
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {detail.syllabusModules.map((mod) => (
                  <article key={mod.id} className="tgl-subsurface rounded-2xl p-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-mono text-xs font-semibold text-accent">
                        Module 0{mod.sortOrder}
                      </p>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {mod.estimatedMinutes} min total
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-foreground">
                      {mod.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{mod.summary}</p>
                    <ul className="mt-4 space-y-2 border-t border-border pt-3">
                      {mod.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between gap-3 text-xs text-foreground/80"
                        >
                          <span className="flex items-center gap-2">
                            <Lock
                              size={12}
                              className="shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span>{lesson.title}</span>
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
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

            <section className="tgl-glass rounded-3xl p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                Practical Project, Internship Tasks &amp; Completion Criteria
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                {detail.projectPreview.title}
              </h2>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {detail.projectPreview.summary}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {detail.projectPreview.milestoneCount} milestones ·{" "}
                {detail.projectPreview.deliverableCount} deliverables · Reviewed by{" "}
                {detail.projectPreview.mentorName} ({detail.projectPreview.mentorRole})
              </p>

              <div className="mt-5 space-y-3 border-t border-border pt-4 text-xs">
                <p className="font-semibold text-foreground">
                  Included Internship: {course.linkedInternshipTitle} (
                  {course.internshipDurationWeeks} weeks)
                </p>
                {internshipTrack?.tasks && internshipTrack.tasks.length > 0 && (
                  <ul className="space-y-2 text-foreground/80">
                    {internshipTrack.tasks.map((task) => (
                      <li key={task.id} className="tgl-subsurface rounded-xl px-3.5 py-2.5">
                        <span className="font-semibold text-foreground">{task.title}</span>{" "}
                        <span className="text-accent">({task.deadlineLabel})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-5 border-t border-border pt-4 text-xs">
                <p className="font-semibold text-foreground">
                  Completion requirements for your included certificate (₹0 extra)
                </p>
                <ul className="mt-2.5 space-y-1.5 text-foreground/80">
                  {course.completionRequirements.map((req) => (
                    <li key={req} className="flex items-start gap-2">
                      <CheckCircle2
                        size={13}
                        className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300"
                        aria-hidden="true"
                      />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  {course.includedCertificateTitle}: {course.certificateInfo}
                </p>
              </div>
            </section>
          </div>

          <aside className="self-start space-y-6 lg:sticky lg:top-24">
            <section className="tgl-glass-strong rounded-3xl p-6 sm:p-7">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                All-inclusive single enrolment fee
              </p>
              <div className="mt-3 flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                  Enrol Now
                </h2>
                <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                  {formatInrFromPaise(course.pricePaise)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Pay once to unlock course lessons, assignments, practical project feedback, internship tasks, and your included Internship Completion Certificate (₹0 extra after mentor approval).
              </p>

              <div className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
                <p className="font-semibold text-foreground">Everything included with this payment:</p>
                <ul className="space-y-1.5 text-foreground/80">
                  {course.includes.map((inc) => (
                    <li key={inc} className="flex items-start gap-2">
                      <CheckCircle2
                        size={13}
                        className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-300"
                        aria-hidden="true"
                      />
                      <span>{inc}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={13}
                      className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-300"
                      aria-hidden="true"
                    />
                    <span>{course.assignmentCount} hands-on assignments &amp; graded assessment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={13}
                      className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-300"
                      aria-hidden="true"
                    />
                    <span>Official {course.includedCertificateTitle} (₹0 extra fee)</span>
                  </li>
                </ul>
              </div>

              <div className="mt-5 border-t border-border pt-5">
                {!user || user.isSandbox || isSandbox ? (
                  <Link
                    href={`/auth/login?next=${encodeURIComponent(`/courses/${course.slug}`)}`}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-xs font-medium text-accent-foreground"
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

              <div className="tgl-subsurface mt-5 rounded-2xl p-4 text-xs leading-5 text-muted-foreground">
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck size={14} className="text-accent" aria-hidden="true" />
                  One-fee guarantee · No hidden certificate cost
                </p>
                <p className="mt-1.5">{course.internshipDisclosure}</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  /* UNLOCKED UNIFIED LEARNING WORKSPACE — Single Coursera-Style Page + 9-Step Linear Roadmap */
  const progression = liveProgression!;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-6 pb-24 pt-28 text-foreground md:px-12 md:pt-34">
      <LearningWorkspaceHeader
        course={course}
        progression={progression}
        enrolledAt={enrolledAt}
        hasInternshipApplication={Boolean(internshipApplication)}
        onContinueLearning={() => {
          jumpToStep(progression.currentStep.key);
          if (
            progression.currentStep.key === "learning_modules" &&
            !activeLessonId &&
            !detail.locked
          ) {
            const fallback =
              detail.lastVisitedLessonId ?? detail.modules[0]?.lessons[0]?.id ?? "";
            if (fallback) setActiveLessonId(fallback);
          }
        }}
      />

      {notice && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-200"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-800 dark:text-rose-200"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="min-w-0">
          <LearningRoadmap
            detail={detail}
            progression={progression}
            expandedSteps={expandedSteps}
            onToggleStep={toggleStep}
            onJumpToStep={jumpToStep}
            enrolledAt={enrolledAt}
            completedOn={completedOn}
            studentName={user?.name ?? "Verified Learner"}
            internshipTrack={internshipTrack}
            internshipApplication={internshipApplication}
            issuedCertificate={issuedCertificate}
            activeLessonId={activeLessonId}
            onSelectLessonId={handleSelectLessonId}
            busyLessonId={busyLessonId}
            onToggleLessonComplete={toggleLessonComplete}
            busyExerciseLessonId={busyExerciseLessonId}
            onToggleExerciseComplete={handleToggleExerciseComplete}
            busyKnowledgeLessonId={busyKnowledgeLessonId}
            onSubmitKnowledgeCheck={handleSubmitKnowledgeCheck}
            busyModuleQuizId={busyModuleQuizId}
            moduleQuizExplanations={moduleQuizExplanations}
            onSubmitModuleQuiz={handleSubmitModuleQuiz}
            assignmentTexts={assignmentTexts}
            assignmentUrls={assignmentUrls}
            busyAssignmentId={busyAssignmentId}
            onAssignmentTextChange={(id, val) =>
              setAssignmentTexts((prev) => ({ ...prev, [id]: val }))
            }
            onAssignmentUrlChange={(id, val) =>
              setAssignmentUrls((prev) => ({ ...prev, [id]: val }))
            }
            onSubmitAssignment={handleSubmitAssignment}
            quizAnswers={quizAnswers}
            quizExplanations={quizExplanations}
            busyQuiz={busyQuiz}
            onQuizAnswerChange={(questionId, optIdx) =>
              setQuizAnswers((prev) => ({ ...prev, [questionId]: optIdx }))
            }
            onSubmitQuiz={handleSubmitQuiz}
            submissions={submissions}
            githubUrl={githubUrl}
            deploymentUrl={deploymentUrl}
            supportingEvidence={supportingEvidence}
            supportingFiles={supportingFiles}
            summary={summary}
            reflection={reflection}
            submittingProject={submittingProject}
            onGithubUrlChange={setGithubUrl}
            onDeploymentUrlChange={setDeploymentUrl}
            onSupportingEvidenceChange={setSupportingEvidence}
            onSupportingFilesChange={handleSupportingFilesChange}
            onRemoveSupportingFile={(name) =>
              setSupportingFiles((prev) => prev.filter((f) => f.name !== name))
            }
            onSummaryChange={setSummary}
            onReflectionChange={setReflection}
            onStartProject={() => void handleStartProject()}
            onSubmitProject={handleSubmitProject}
            claimingCert={claimingCert}
            onClaimCertificate={handleClaimIncludedCertificate}
            onDownloadCertificate={handleDownloadCertificate}
            onRefreshWorkspace={refreshDetail}
          />
        </div>

        <WorkspaceProgressSidebar
          progression={progression}
          completedLessons={course.completedLessonCount}
          totalLessons={course.lessonCount}
          quizPassed={course.quizPassed}
          onSelectStep={jumpToStep}
        />
      </div>
    </div>
  );
}
