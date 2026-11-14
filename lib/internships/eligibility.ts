export type InternshipTaskDefinition = {
  id: string;
  title: string;
  brief: string;
  deadlineLabel: string;
  deliverableFormat: string;
};

export type InternshipTaskSubmission = {
  taskId: string;
  submissionUrl: string;
  summary: string;
  status: "submitted" | "approved" | "revision_required";
  mentorFeedback: string | null;
  scoreLabel: string | null;
  submittedAt: string;
  evaluatedAt: string | null;
};

export type InternshipEligibilityEvaluation = {
  eligible: boolean;
  courseEnrolled: boolean;
  projectApproved: boolean;
  quizPassed: boolean;
  requiredCourseSlug: string | null;
  requiredProjectSlug: string | null;
  requiredCourseTitle?: string | null;
  requiredProjectTitle?: string | null;
  requiredSkills?: string[];
  missingRequirements: string[];
};

export function evaluateInternshipEligibility(input: {
  requiredCourseSlug: string | null;
  requiredProjectSlug: string | null;
  requiredCourseTitle?: string | null;
  requiredProjectTitle?: string | null;
  requiredSkills?: string[];
  requireProjectApproval: boolean;
  courseEnrolled: boolean;
  quizPassed: boolean;
  projectApproved: boolean;
}): InternshipEligibilityEvaluation {
  const missingRequirements: string[] = [];

  if (input.requiredCourseSlug && !input.courseEnrolled) {
    missingRequirements.push(
      input.requiredCourseTitle
        ? `Enrol in "${input.requiredCourseTitle}" and complete its core lessons`
        : "Enrol in the required course and complete its core lessons",
    );
  }
  if (input.requireProjectApproval && input.requiredProjectSlug && !input.projectApproved) {
    missingRequirements.push(
      input.requiredProjectTitle
        ? `Earn mentor approval on "${input.requiredProjectTitle}"`
        : "Earn mentor approval on the required practical project",
    );
  }

  return {
    eligible: missingRequirements.length === 0,
    courseEnrolled: input.courseEnrolled,
    projectApproved: input.projectApproved,
    quizPassed: input.quizPassed,
    requiredCourseSlug: input.requiredCourseSlug,
    requiredProjectSlug: input.requiredProjectSlug,
    requiredCourseTitle: input.requiredCourseTitle ?? null,
    requiredProjectTitle: input.requiredProjectTitle ?? null,
    requiredSkills: input.requiredSkills ?? [],
    missingRequirements,
  };
}

export function checkAllInternshipTasksApproved(params: {
  tasks: InternshipTaskDefinition[];
  submissions: InternshipTaskSubmission[];
}): { readyForFinalApproval: boolean; approvedCount: number; totalCount: number; pendingTaskTitles: string[] } {
  if (params.tasks.length === 0) {
    return {
      readyForFinalApproval: true,
      approvedCount: 0,
      totalCount: 0,
      pendingTaskTitles: [],
    };
  }

  const pendingTaskTitles: string[] = [];
  let approvedCount = 0;

  for (const task of params.tasks) {
    const sub = params.submissions.find((s) => s.taskId === task.id);
    if (sub && sub.status === "approved") {
      approvedCount += 1;
    } else {
      pendingTaskTitles.push(task.title);
    }
  }

  return {
    readyForFinalApproval: pendingTaskTitles.length === 0,
    approvedCount,
    totalCount: params.tasks.length,
    pendingTaskTitles,
  };
}
