import {
  getCertificateClaimedAt,
  listInternships,
  listIssuances,
  listStudentApplications,
  type CertificateIssuanceRecord,
  type InternshipApplicationRecord,
  type InternshipRecord,
  type SandboxUser,
} from "@/lib/certifications/store";
import {
  getCourseDetailForActor,
  listUserCourseEnrollments,
  type CourseDetailResponse,
} from "@/lib/courses/store";
import {
  getLearnerSnapshot,
  type ProjectSubmissionRecord,
} from "@/lib/learning-workspace-store";
import {
  computeUnifiedProgrammeProgression,
  type UnifiedProgrammeProgression,
} from "./progression";

export type ProgrammeWorkspacePayload = {
  detail: CourseDetailResponse;
  internshipTrack: InternshipRecord | null;
  internshipApplication: InternshipApplicationRecord | null;
  issuedCertificate: CertificateIssuanceRecord | null;
  progression: UnifiedProgrammeProgression | null;
  enrolledAt: string | null;
  completedOn: string | null;
  claimedAt: string | null;
  projectSubmissions: ProjectSubmissionRecord[];
};

export async function buildProgrammeWorkspacePayload(params: {
  slug: string;
  user: SandboxUser | null;
}): Promise<ProgrammeWorkspacePayload | null> {
  const userId = params.user?.id ?? null;
  const detail = await getCourseDetailForActor({
    slug: params.slug,
    userId,
    bypassLockForAdmin: params.user?.role === "admin",
  });

  if (!detail) return null;

  const [internships, applications, issuances, enrollments] = await Promise.all([
    listInternships(),
    userId ? listStudentApplications(userId) : Promise.resolve([]),
    userId ? listIssuances(userId) : Promise.resolve([]),
    userId ? listUserCourseEnrollments(userId) : Promise.resolve([]),
  ]);

  const internshipTrack =
    internships.find((i) => i.slug === detail.course.linkedInternshipSlug) ?? null;
  const internshipApplication = internshipTrack
    ? applications.find((a) => a.internship_id === internshipTrack.id) ?? null
    : null;
  const issuedCertificate = internshipApplication
    ? issuances.find(
        (i) =>
          i.internship_application_id === internshipApplication.id &&
          i.issuance_status !== "revoked",
      ) ??
      issuances.find(
        (i) =>
          i.issuance_status !== "revoked" &&
          internshipTrack &&
          i.achievement_title === internshipTrack.title,
      ) ??
      null
    : null;

  const matchingEnrollment =
    enrollments.find(
      (e) => e.courseId === detail.course.id && e.status === "active",
    ) ?? null;

  const snapshot = userId ? getLearnerSnapshot(userId) : null;
  const projectSubmissions = snapshot
    ? snapshot.submissions.filter(
        (s) => s.projectSlug === detail.course.projectSlug,
      )
    : [];

  const claimedAt = issuedCertificate
    ? getCertificateClaimedAt(issuedCertificate.certificate_id)
    : null;

  let progression: UnifiedProgrammeProgression | null = null;
  if (!detail.locked) {
    const tasks = internshipTrack?.tasks ?? [];
    const taskSubs = internshipApplication?.task_submissions ?? [];
    const approvedTasksCount = tasks.filter(
      (t) => taskSubs.find((s) => s.taskId === t.id)?.status === "approved",
    ).length;

    progression = computeUnifiedProgrammeProgression({
      enrolled: detail.enrolled || params.user?.role === "admin",
      completedLessonCount: detail.course.completedLessonCount,
      totalLessonCount: detail.course.lessonCount,
      quizPassed: detail.course.quizPassed,
      projectStatus: detail.internshipEligibility.projectStatus,
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
  }

  return {
    detail,
    internshipTrack,
    internshipApplication,
    issuedCertificate,
    progression,
    enrolledAt: matchingEnrollment?.enrolledAt ?? null,
    completedOn:
      internshipApplication?.completed_at ??
      issuedCertificate?.issued_at ??
      null,
    claimedAt,
    projectSubmissions,
  };
}
