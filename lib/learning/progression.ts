import type { ProjectSubmissionStatus } from "@/lib/learning-workspace-store";

export type ProgressionStepKey =
  | "enrolled"
  | "learning_modules"
  | "modules_completed"
  | "project_unlocked"
  | "project_submitted"
  | "project_approved"
  | "program_completed"
  | "certificate_unlocked"
  | "certificate_claimed";

export type ProgressionStepState = "completed" | "active" | "locked";

export type ProgressionStep = {
  stepNumber: number;
  key: ProgressionStepKey;
  title: string;
  description: string;
  status: ProgressionStepState;
  lockReason: string | null;
  statusLabel: string;
};

export type ProjectStageStatus =
  | "locked"
  | "available"
  | "not_submitted"
  | "submitted"
  | "under_review"
  | "revision_required"
  | "approved";

export type CertificateLifecycleState =
  | "locked"
  | "eligible"
  | "generating"
  | "issued"
  | "claimed";

export type UnifiedProgrammeProgression = {
  steps: ProgressionStep[];
  overallProgressPercent: number;
  completedStepsCount: number;
  totalStepsCount: number;
  remainingStepsCount: number;
  currentStep: ProgressionStep;
  currentActivity: string;
  nextRequirement: string;
  projectStageStatus: ProjectStageStatus;
  canAccessProject: boolean;
  canSubmitProject: boolean;
  projectLockReason: string | null;
  canSubmitInternshipTasks: boolean;
  internshipTaskLockReason: string | null;
  certificateState: CertificateLifecycleState;
  certificateLockReason: string | null;
  allModulesAndQuizDone: boolean;
  projectApproved: boolean;
  internshipTasksApproved: boolean;
  programCompleted: boolean;
};

export type ProgressionInput = {
  enrolled: boolean;
  completedLessonCount: number;
  totalLessonCount: number;
  quizPassed: boolean;
  projectStatus: "not_started" | ProjectSubmissionStatus;
  hasInternshipTrack: boolean;
  totalInternshipTasks: number;
  approvedInternshipTasksCount: number;
  internshipFinalApproved: boolean;
  certificateStatus: "none" | "pending_approval" | "issued" | "revoked";
  certificateClaimed: boolean;
};

export function canAccessCourseProject(params: {
  enrolled: boolean;
  completedLessonCount: number;
  totalLessonCount: number;
  quizPassed: boolean;
}): { allowed: boolean; reason: string | null } {
  if (!params.enrolled) {
    return {
      allowed: false,
      reason: "Enrol in the programme first to unlock learning modules and projects.",
    };
  }
  const lessonsDone =
    params.totalLessonCount > 0 && params.completedLessonCount >= params.totalLessonCount;
  if (!lessonsDone) {
    return {
      allowed: false,
      reason: `Complete all learning modules (${params.completedLessonCount}/${params.totalLessonCount} lessons) before starting the project assignment.`,
    };
  }
  if (!params.quizPassed) {
    return {
      allowed: false,
      reason: "Pass the graded module assessment quiz before unlocking the project assignment.",
    };
  }
  return { allowed: true, reason: null };
}

export function canAccessInternshipTasks(params: {
  allModulesAndQuizDone: boolean;
  projectApproved: boolean;
}): { allowed: boolean; reason: string | null } {
  if (!params.allModulesAndQuizDone) {
    return {
      allowed: false,
      reason: "Complete all learning modules and pass the graded quiz first.",
    };
  }
  if (!params.projectApproved) {
    return {
      allowed: false,
      reason: "Earn mentor approval on your practical project before submitting internship tasks.",
    };
  }
  return { allowed: true, reason: null };
}

export function computeUnifiedProgrammeProgression(
  input: ProgressionInput,
): UnifiedProgrammeProgression {
  const lessonsDone =
    input.enrolled &&
    input.totalLessonCount > 0 &&
    input.completedLessonCount >= input.totalLessonCount;
  const allModulesAndQuizDone = lessonsDone && input.quizPassed;
  const projectAccess = canAccessCourseProject({
    enrolled: input.enrolled,
    completedLessonCount: input.completedLessonCount,
    totalLessonCount: input.totalLessonCount,
    quizPassed: input.quizPassed,
  });

  const projectStartedOrFurther =
    allModulesAndQuizDone && input.projectStatus !== "not_started";
  const projectSubmittedOrFurther =
    allModulesAndQuizDone &&
    (input.projectStatus === "submitted" ||
      input.projectStatus === "under_review" ||
      input.projectStatus === "approved");
  const projectApproved = allModulesAndQuizDone && input.projectStatus === "approved";

  const internshipTasksApproved = input.hasInternshipTrack
    ? input.totalInternshipTasks === 0 ||
      input.approvedInternshipTasksCount >= input.totalInternshipTasks
    : true;

  const programCompleted =
    projectApproved &&
    internshipTasksApproved &&
    (input.hasInternshipTrack ? input.internshipFinalApproved : true);

  const certificateIssued =
    programCompleted && input.certificateStatus === "issued";
  const certificateClaimed = certificateIssued && input.certificateClaimed;

  const taskAccess = canAccessInternshipTasks({
    allModulesAndQuizDone,
    projectApproved,
  });

  // Derive ProjectStageStatus cleanly
  const projectStageStatus: ProjectStageStatus = !projectAccess.allowed
    ? "locked"
    : input.projectStatus === "not_started"
      ? "available"
      : input.projectStatus === "in_progress"
        ? "not_submitted"
        : input.projectStatus === "revision_required"
          ? "revision_required"
          : input.projectStatus;

  const certificateState: CertificateLifecycleState = !programCompleted
    ? "locked"
    : certificateClaimed
      ? "claimed"
      : certificateIssued
        ? "issued"
        : "eligible";

  // Build ordered step booleans
  const stepDoneFlags: boolean[] = [
    input.enrolled,
    lessonsDone,
    allModulesAndQuizDone,
    projectStartedOrFurther,
    projectSubmittedOrFurther,
    projectApproved,
    programCompleted,
    certificateIssued,
    certificateClaimed,
  ];

  // Ensure strict monotonic sequence: once a prerequisite step is false, no later step can be completed or active
  for (let i = 1; i < stepDoneFlags.length; i += 1) {
    if (!stepDoneFlags[i - 1]) {
      stepDoneFlags[i] = false;
    }
  }

  const firstIncompleteIdx = stepDoneFlags.findIndex((done) => !done);
  const stepStateAt = (idx: number): ProgressionStepState => {
    if (stepDoneFlags[idx]) return "completed";
    if (firstIncompleteIdx === idx) return "active";
    return "locked";
  };

  const remainingLessons = Math.max(0, input.totalLessonCount - input.completedLessonCount);
  const remainingTasks = Math.max(
    0,
    input.totalInternshipTasks - input.approvedInternshipTasksCount,
  );

  const stepDefinitions: Array<Omit<ProgressionStep, "stepNumber" | "status">> = [
    {
      key: "enrolled",
      title: "Enrolled",
      description: "Verified programme enrolment unlocking lessons, project, internship & included certificate.",
      lockReason: input.enrolled ? null : "Complete programme enrolment to begin.",
      statusLabel: input.enrolled ? "Active" : "Enrol required",
    },
    {
      key: "learning_modules",
      title: "Learning Modules",
      description: `Read study notes, watch curated lectures & review assignments (${input.completedLessonCount}/${input.totalLessonCount} lessons).`,
      lockReason: input.enrolled ? null : "Enrol in the programme first.",
      statusLabel: lessonsDone
        ? "All lessons done"
        : `${input.completedLessonCount}/${input.totalLessonCount} lessons`,
    },
    {
      key: "modules_completed",
      title: "Modules & Quiz Completed",
      description: "Pass the graded assessment quiz after finishing your learning lessons.",
      lockReason: lessonsDone
        ? null
        : `Finish ${remainingLessons} remaining lesson${remainingLessons === 1 ? "" : "s"} to unlock the graded quiz check.`,
      statusLabel: allModulesAndQuizDone
        ? "Quiz passed"
        : lessonsDone
          ? "Quiz pending"
          : "Locked",
    },
    {
      key: "project_unlocked",
      title: "Project Assignment Unlocked",
      description: "Review project brief, instructions, and start your hands-on build.",
      lockReason: projectAccess.reason,
      statusLabel: projectStartedOrFurther
        ? "Started"
        : allModulesAndQuizDone
          ? "Available"
          : "Locked",
    },
    {
      key: "project_submitted",
      title: "Project Submitted",
      description: "Submit your GitHub repository, demo link, supporting files, and summary.",
      lockReason: projectStartedOrFurther
        ? null
        : "Unlock and start your project assignment first.",
      statusLabel:
        input.projectStatus === "revision_required"
          ? "Changes requested"
          : projectSubmittedOrFurther
            ? "Submitted"
            : projectStartedOrFurther
              ? "Ready to submit"
              : "Locked",
    },
    {
      key: "project_approved",
      title: "Project Approved",
      description: "Mentor reviews deliverables, rubric criteria, and approves your project.",
      lockReason: projectSubmittedOrFurther
        ? null
        : input.projectStatus === "revision_required"
          ? "Address mentor feedback and resubmit your project."
          : "Submit your project assignment for mentor evaluation.",
      statusLabel: projectApproved
        ? "Approved"
        : input.projectStatus === "under_review"
          ? "Under review"
          : input.projectStatus === "submitted"
            ? "Awaiting review"
            : "Locked",
    },
    {
      key: "program_completed",
      title: "Program Completed",
      description: input.hasInternshipTrack
        ? `Complete ${input.totalInternshipTasks} internship sprint tasks and earn final mentor completion sign-off.`
        : "Mentor final completion verification confirmed.",
      lockReason: projectApproved
        ? null
        : "Your practical project must be approved by a mentor first.",
      statusLabel: programCompleted
        ? "Completed"
        : projectApproved
          ? input.hasInternshipTrack
            ? `${input.approvedInternshipTasksCount}/${input.totalInternshipTasks} tasks approved`
            : "Awaiting final sign-off"
          : "Locked",
    },
    {
      key: "certificate_unlocked",
      title: "Certificate Unlocked",
      description: "Official QR-verified completion certificate included at ₹0 extra fee.",
      lockReason: programCompleted
        ? null
        : input.hasInternshipTrack && projectApproved
          ? remainingTasks > 0
            ? `Complete ${remainingTasks} remaining internship task${remainingTasks === 1 ? "" : "s"} and await mentor completion approval.`
            : "Awaiting final mentor completion approval."
          : "Complete all modules, approved project, and internship requirements first.",
      statusLabel: certificateIssued
        ? "Issued"
        : programCompleted
          ? "Eligible · Ready"
          : "Locked",
    },
    {
      key: "certificate_claimed",
      title: "Certificate Claimed",
      description: "Claim, preview, verify via QR code, and download your official PDF credential.",
      lockReason: certificateIssued
        ? null
        : programCompleted
          ? "Claim your certificate in the previous step first."
          : "Certificate unlocks once program completion is confirmed.",
      statusLabel: certificateClaimed
        ? "Claimed & downloaded"
        : certificateIssued
          ? "Ready to download"
          : "Locked",
    },
  ];

  const steps: ProgressionStep[] = stepDefinitions.map((def, idx) => ({
    stepNumber: idx + 1,
    ...def,
    status: stepStateAt(idx),
  }));

  const completedStepsCount = steps.filter((s) => s.status === "completed").length;
  const totalStepsCount = steps.length;
  const remainingStepsCount = totalStepsCount - completedStepsCount;
  const overallProgressPercent = Math.round((completedStepsCount / totalStepsCount) * 100);
  const currentStep =
    steps.find((s) => s.status === "active") ?? steps[steps.length - 1];

  const currentActivity =
    completedStepsCount === totalStepsCount
      ? "Programme completed & certificate claimed"
      : `${currentStep.title} (${currentStep.statusLabel})`;

  const nextRequirement = (() => {
    if (completedStepsCount === totalStepsCount) {
      return "All requirements met. Download or share your verified certificate anytime.";
    }
    switch (currentStep.key) {
      case "enrolled":
        return "Activate your programme enrolment to unlock lessons.";
      case "learning_modules":
        return `Complete ${remainingLessons} remaining lesson${remainingLessons === 1 ? "" : "s"} to unlock the graded quiz.`;
      case "modules_completed":
        return "Pass the graded module assessment quiz to unlock your practical project.";
      case "project_unlocked":
        return "Open the Project Assignment section and click Start Project.";
      case "project_submitted":
        return input.projectStatus === "revision_required"
          ? "Review mentor comments, update your repository, and resubmit your project."
          : "Submit your GitHub URL and project summary for mentor review.";
      case "project_approved":
        return "Your project is queued with your mentor. Check back shortly for review feedback.";
      case "program_completed":
        return remainingTasks > 0
          ? `Submit & get approval on ${remainingTasks} internship task${remainingTasks === 1 ? "" : "s"} to earn final mentor completion.`
          : "All internship tasks are approved — awaiting final mentor completion confirmation.";
      case "certificate_unlocked":
        return "Click Claim Included Certificate to generate your official QR-verified credential (₹0 extra).";
      case "certificate_claimed":
        return "Download your official PDF certificate or share your QR verification link.";
    }
  })();

  const certificateLockReason = programCompleted
    ? null
    : steps[7].lockReason ?? "Complete all preceding steps to unlock your certificate.";

  return {
    steps,
    overallProgressPercent,
    completedStepsCount,
    totalStepsCount,
    remainingStepsCount,
    currentStep,
    currentActivity,
    nextRequirement,
    projectStageStatus,
    canAccessProject: projectAccess.allowed,
    canSubmitProject: projectAccess.allowed && input.projectStatus !== "approved",
    projectLockReason: projectAccess.reason,
    canSubmitInternshipTasks: taskAccess.allowed,
    internshipTaskLockReason: taskAccess.reason,
    certificateState,
    certificateLockReason,
    allModulesAndQuizDone,
    projectApproved,
    internshipTasksApproved,
    programCompleted,
  };
}
