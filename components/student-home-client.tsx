"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock3,
  FolderGit2,
  Lock,
  MessageSquare,
  Sparkles,
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
import { StudentJourneyTracker, type JourneyStageState } from "@/components/student-journey-tracker";
import Magnet from "@/components/react-bits/Magnet";

export function StudentHomeClient({
  learnerName,
  courses,
  internships,
  applications,
  issuances,
  submissions,
  messages,
}: {
  learnerName: string;
  courses: PublicCourseSummary[];
  internships: InternshipRecord[];
  applications: InternshipApplicationRecord[];
  orders: CertificationOrderRecord[];
  payments: CertificationPaymentRecord[];
  issuances: CertificateIssuanceRecord[];
  products: CertificationProductRecord[];
  nodeStates: Record<string, NodeProgressState>;
  savedItems: string[];
  submissions: ProjectSubmissionRecord[];
  messages: MentorMessageRecord[];
  evidence: LearningEvidenceRecord[];
}) {
  const enrolledCourses = courses.filter((c) => c.enrolled);
  const starterCourses = courses.filter((c) => !c.enrolled).slice(0, 3);
  const completedLessonsTotal = enrolledCourses.reduce(
    (sum, c) => sum + c.completedLessonCount,
    0,
  );
  const totalLessonsAcrossEnrolled = enrolledCourses.reduce(
    (sum, c) => sum + c.lessonCount,
    0,
  );
  const passedQuizzes = enrolledCourses.filter((c) => c.quizPassed).length;
  const approvedProjects = submissions.filter((s) => s.status === "approved").length;
  const latestProject = submissions[0] ?? null;

  const completedInternships = applications.filter(
    (a) => a.status === "completed" && a.mentor_approved,
  );
  const issuedCerts = issuances.filter((i) => i.issuance_status === "issued");

  const pendingInternshipTasks = applications.flatMap((app) => {
    const track = internships.find((i) => i.id === app.internship_id);
    if (!track?.tasks) return [];
    const subs = app.task_submissions ?? [];
    return track.tasks
      .filter((t) => subs.find((s) => s.taskId === t.id)?.status !== "approved")
      .map((t) => ({
        internshipTitle: track.title,
        task: t,
        submission: subs.find((s) => s.taskId === t.id) ?? null,
      }));
  });

  const approvedTaskCount = applications.reduce((acc, app) => {
    const subs = app.task_submissions ?? [];
    return acc + subs.filter((s) => s.status === "approved").length;
  }, 0);

  // Determine the single best "What should I do next?" prompt for ordinary students
  const nextPrompt: {
    heading: string;
    reason: string;
    ctaLabel: string;
    href: string;
  } = (() => {
    if (enrolledCourses.length === 0) {
      return {
        heading: "Enrol in your first internship programme",
        reason:
          "Browse Programmes to view the complete syllabus, practical project, internship track, and included certificate before paying one all-inclusive INR fee.",
        ctaLabel: "Explore Programmes",
        href: "/programmes",
      };
    }

    const activeCourse =
      enrolledCourses.find((c) => c.progressPercent < 100 || !c.quizPassed) ??
      enrolledCourses[0];

    if (activeCourse && (activeCourse.progressPercent < 100 || !activeCourse.quizPassed)) {
      return {
        heading: `Continue ${activeCourse.title}`,
        reason:
          activeCourse.progressPercent < 100
            ? `You have finished ${activeCourse.completedLessonCount} of ${activeCourse.lessonCount} lessons. Pick up right where you left off.`
            : "You finished the lessons! Complete the graded assessment to prepare for mentor approval.",
        ctaLabel: "Continue Learning",
        href: `/programmes/${activeCourse.slug}`,
      };
    }

    if (approvedProjects === 0) {
      const targetProjectSlug =
        latestProject?.projectSlug ?? activeCourse?.projectSlug ?? "";
      return {
        heading:
          latestProject?.status === "revision_required"
            ? "Update your project with mentor feedback"
            : latestProject
              ? `Check your project: ${latestProject.projectTitle}`
              : "Start your practical project",
        reason:
          latestProject?.status === "revision_required"
            ? "Your mentor left comments to help you pass. Review the notes and resubmit."
            : "Build the practical project included in your programme and send it to your mentor for approval.",
        ctaLabel: latestProject ? "Submit Project" : "Start Project",
        href: targetProjectSlug ? `/projects/${targetProjectSlug}` : "/explore",
      };
    }

    if (pendingInternshipTasks.length > 0 && completedInternships.length === 0) {
      const firstPending = pendingInternshipTasks[0];
      return {
        heading: `Complete your internship task: ${firstPending.task.title}`,
        reason: `Due ${firstPending.task.deadlineLabel}. Finish all tasks to unlock final mentor completion approval and your included certificate.`,
        ctaLabel: "Complete Task",
        href: "/internships",
      };
    }

    if (completedInternships.length > 0 && issuedCerts.length === 0) {
      return {
        heading: "Your included Internship Certificate is unlocked",
        reason:
          "Your mentor approved all internship tasks! Claim your included official certificate (₹0 extra) with a QR verification link.",
        ctaLabel: "Download Certificate",
        href: "/certificates",
      };
    }

    if (issuedCerts.length > 0) {
      return {
        heading: "Open or download your Internship Completion Certificate",
        reason: `Certificate ${issuedCerts[0].certificate_id} is active (₹0 extra, included with your programme) and ready to share.`,
        ctaLabel: "Open Certificate",
        href: `/verify/certificate/${encodeURIComponent(issuedCerts[0].certificate_id)}`,
      };
    }

    return {
      heading: "Keep building with Touch Grass Later",
      reason: "Explore more programmes, practical projects, and internship tracks at any time.",
      ctaLabel: "Explore Programmes",
      href: "/programmes",
    };
  })();

  const hasEnrolled = enrolledCourses.length > 0;
  const learningDone = enrolledCourses.some((c) => c.progressPercent >= 100 && c.quizPassed);
  const projectDone = approvedProjects > 0;
  const internshipDone = completedInternships.length > 0;
  const certIssued = issuedCerts.length > 0;

  const stages: JourneyStageState[] = [
    {
      step: 1,
      key: "enrolled",
      label: "Enrolled",
      detail: hasEnrolled
        ? `${enrolledCourses.length} programme active`
        : "Choose & enrol in a programme",
      status: hasEnrolled ? "completed" : "active",
      href: enrolledCourses[0] ? `/programmes/${enrolledCourses[0].slug}` : "/programmes",
    },
    {
      step: 2,
      key: "learning",
      label: "Learning",
      detail: hasEnrolled
        ? `${completedLessonsTotal}/${totalLessonsAcrossEnrolled || completedLessonsTotal} lessons · ${passedQuizzes} quiz`
        : "Notes, curated videos & quiz",
      status: learningDone ? "completed" : hasEnrolled ? "active" : "upcoming",
      href: enrolledCourses[0] ? `/programmes/${enrolledCourses[0].slug}` : "/programmes",
    },
    {
      step: 3,
      key: "project",
      label: "Project",
      detail: projectDone
        ? `${approvedProjects} project approved`
        : latestProject
          ? `Status: ${latestProject.status.replaceAll("_", " ")}`
          : "Build your practical project",
      status: projectDone ? "completed" : hasEnrolled ? "active" : "upcoming",
      href: latestProject
        ? `/projects/${latestProject.projectSlug}`
        : enrolledCourses[0]?.projectSlug
          ? `/projects/${enrolledCourses[0].projectSlug}`
          : "/explore",
    },
    {
      step: 4,
      key: "internship",
      label: "Internship",
      detail: internshipDone
        ? "All internship tasks approved"
        : applications.length > 0
          ? `${pendingInternshipTasks.length} task${pendingInternshipTasks.length === 1 ? "" : "s"} remaining`
          : "Included with programme enrolment",
      status: internshipDone
        ? "completed"
        : applications.length > 0 || projectDone
          ? "active"
          : "upcoming",
      href: "/internships",
    },
    {
      step: 5,
      key: "completed",
      label: "Completed",
      detail: internshipDone
        ? "Mentor final approval complete"
        : "Awaiting task & mentor review",
      status: internshipDone ? "completed" : applications.length > 0 ? "active" : "upcoming",
      href: "/internships",
    },
    {
      step: 6,
      key: "certificate",
      label: "Certificate Issued",
      detail: certIssued
        ? `${issuedCerts[0].certificate_id}`
        : internshipDone
          ? "Ready at ₹0 extra"
          : "Included (₹0 extra) on completion",
      status: certIssued ? "completed" : internshipDone ? "active" : "upcoming",
      href: certIssued
        ? `/verify/certificate/${encodeURIComponent(issuedCerts[0].certificate_id)}`
        : "/certificates",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Single "What should I do next?" Guidance Card */}
      <section
        aria-labelledby="next-step-heading"
        className="flex flex-col justify-between gap-5 rounded-3xl border border-[#b9a9d6]/40 bg-[#15121d] p-6 sm:flex-row sm:items-center sm:p-7"
      >
        <div className="space-y-1.5">
          <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#b9a9d6]">
            <Sparkles size={13} aria-hidden="true" />
            What should I do next?
          </p>
          <h2 id="next-step-heading" className="text-xl font-medium tracking-[-0.03em] text-[#f4f3ef] sm:text-2xl">
            {nextPrompt.heading}
          </h2>
          <p className="max-w-2xl text-xs leading-6 text-white/70 sm:text-sm">
            {nextPrompt.reason}
          </p>
        </div>

        <Magnet padding={60} magnetStrength={2.8} maxOffset={7}>
          <Link
            href={nextPrompt.href}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-6 py-3 text-xs font-medium text-[#111111] transition-colors hover:bg-white whitespace-nowrap shrink-0"
          >
            {nextPrompt.ctaLabel}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </Magnet>
      </section>

      {/* Clean 4-Stage Progress Tracker */}
      <StudentJourneyTracker stages={stages} />

      {/* Main Scannable Workspace Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-6">
          {/* 1. Continue your course */}
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-base font-medium">
                <BookOpen size={16} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Your active programmes</span>
              </h2>
              <Link href="/programmes" className="text-xs text-[#b9a9d6] hover:text-white">
                Explore Programmes
              </Link>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {enrolledCourses.length > 0 ? (
                enrolledCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-400/25 bg-black/25 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-emerald-300">
                        Enrolled · {course.completedLessonCount}/{course.lessonCount} lessons ({course.progressPercent}%) · Quiz:{" "}
                        {course.quizPassed ? "Passed" : "Pending"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#f4f3ef]">
                        {course.title}
                      </p>
                      <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#b9a9d6]"
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <Link
                      href={`/programmes/${course.slug}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] whitespace-nowrap shrink-0"
                    >
                      Continue Learning
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 p-5 text-white/60">
                  <p>You have not enrolled in a programme yet, {learnerName}.</p>
                  <p className="mt-1 text-white/50">
                    Pick a programme below to see its syllabus, project, internship tasks, and included certificate before paying.
                  </p>
                </div>
              )}

              {starterCourses.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                    {enrolledCourses.length > 0 ? "More programmes to explore" : "Available internship programmes"}
                  </p>
                  {starterCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
                    >
                      <div>
                        <p className="inline-flex items-center gap-1.5 text-[11px] text-white/55">
                          <Lock size={11} aria-hidden="true" />
                          {course.category} · {formatInrFromPaise(course.pricePaise)} INR all-inclusive
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#f4f3ef]">
                          {course.title}
                        </p>
                        <p className="mt-0.5 text-white/50">
                          {course.skills.slice(0, 3).join(" · ")}
                        </p>
                      </div>
                      <Link
                        href={`/programmes/${course.slug}`}
                        className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2 text-xs text-white/85 hover:border-white/35 whitespace-nowrap shrink-0"
                      >
                        Enrol Now
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 2. Your learning progress */}
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <h2 className="text-base font-medium">Your learning progress</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] text-white/50">Lessons finished</p>
                <p className="mt-1.5 font-mono text-xl font-medium text-[#f4f3ef]">
                  {completedLessonsTotal}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] text-white/50">Course quizzes passed</p>
                <p className="mt-1.5 font-mono text-xl font-medium text-[#f4f3ef]">
                  {passedQuizzes}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] text-white/50">Approved projects</p>
                <p className="mt-1.5 font-mono text-xl font-medium text-emerald-300">
                  {approvedProjects}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-[11px] text-white/50">Internship tasks done</p>
                <p className="mt-1.5 font-mono text-xl font-medium text-[#b9a9d6]">
                  {approvedTaskCount}
                </p>
              </div>
            </div>
          </section>

          {/* 3. Your current project */}
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-base font-medium">
                <FolderGit2 size={16} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Your current project</span>
              </h2>
              <Link href="/explore" className="text-xs text-white/65 hover:text-white">
                All projects
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {submissions.length > 0 ? (
                submissions.map((sub) => (
                  <article
                    key={sub.id}
                    className="rounded-xl border border-white/10 bg-black/25 p-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/projects/${sub.projectSlug}`}
                        className="text-sm font-medium text-[#f4f3ef] hover:text-[#b9a9d6]"
                      >
                        {sub.projectTitle}
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1 capitalize font-medium ${
                          sub.status === "approved"
                            ? "text-emerald-300"
                            : sub.status === "revision_required"
                              ? "text-amber-300"
                              : "text-[#b9a9d6]"
                        }`}
                      >
                        {sub.status === "approved" ? (
                          <CheckCircle2 size={12} aria-hidden="true" />
                        ) : sub.status === "revision_required" ? (
                          <AlertCircle size={12} aria-hidden="true" />
                        ) : (
                          <Clock3 size={12} aria-hidden="true" />
                        )}
                        {sub.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1.5 text-white/65">
                      {sub.summary || "Work started — add your GitHub link when ready to submit."}
                    </p>
                    {sub.mentorFeedback && (
                      <p className="mt-2 rounded-lg border border-emerald-400/20 bg-emerald-950/20 p-2.5 text-emerald-200/95">
                        Mentor ({sub.mentorName}): {sub.mentorFeedback}
                      </p>
                    )}
                    <div className="mt-3">
                      <Link
                        href={`/projects/${sub.projectSlug}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-white/90 hover:border-white/35"
                      >
                        {sub.status === "in_progress"
                          ? "Submit Project"
                          : sub.status === "revision_required"
                            ? "Resubmit Project"
                            : "Open Project"}
                        <ArrowRight size={12} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 p-5 text-xs text-white/60">
                  <p>No active project yet. Pick a course to start your practical project.</p>
                  <Link
                    href={enrolledCourses[0]?.projectSlug ? `/projects/${enrolledCourses[0].projectSlug}` : "/explore"}
                    className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111]"
                  >
                    Start Project <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Internship Status, Certificate Progress & Mentor Notes */}
        <div className="space-y-6">
          {/* 4. Your internship status & next task */}
          <section className="rounded-2xl border border-[#b9a9d6]/25 bg-[#131118] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-medium">
                <Briefcase size={15} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Your internship status &amp; next task</span>
              </h2>
              <Link href="/internships" className="text-xs text-[#b9a9d6] hover:text-white">
                View Internship
              </Link>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {applications.map((app) => {
                const track = internships.find((i) => i.id === app.internship_id);
                return (
                  <div
                    key={app.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[#f4f3ef]">
                        {track?.title ?? "Internship"}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 capitalize text-[11px] font-medium ${
                          app.status === "completed" && app.mentor_approved
                            ? "text-emerald-300"
                            : "text-[#b9a9d6]"
                        }`}
                      >
                        {app.status === "completed" && app.mentor_approved ? (
                          <CheckCircle2 size={12} aria-hidden="true" />
                        ) : (
                          <Clock3 size={12} aria-hidden="true" />
                        )}
                        {app.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    {app.mentor_notes && (
                      <p className="mt-1.5 text-[11px] text-white/65">{app.mentor_notes}</p>
                    )}
                  </div>
                );
              })}

              {pendingInternshipTasks.length > 0 && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
                    Next task to complete
                  </p>
                  {pendingInternshipTasks.map((item) => (
                    <Link
                      key={item.task.id}
                      href="/internships"
                      className="flex min-h-11 items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-3.5 hover:border-white/30"
                    >
                      <div>
                        <p className="font-medium text-[#f4f3ef]">{item.task.title}</p>
                        <p className="mt-0.5 text-[11px] text-[#b9a9d6]">
                          Due {item.task.deadlineLabel} ·{" "}
                          {item.submission ? item.submission.status.replaceAll("_", " ") : "Action needed"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#f4f3ef] px-3 py-1 text-[11px] font-medium text-[#111111]">
                        Complete Task
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {applications.length === 0 && (
                <div className="space-y-3 text-white/60">
                  <p>
                    Once your course quiz and project are approved, you can join a matching internship for free.
                  </p>
                  <Link
                    href="/internships"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-white/90 hover:border-white/35"
                  >
                    View Internship <ArrowUpRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* 5. Your certificate progress */}
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-medium">
                <Award size={16} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Included Internship Certificate</span>
              </h2>
              <Link href="/certificates" className="text-xs text-[#b9a9d6] hover:text-white">
                {issuedCerts.length > 0 ? "Download Certificate" : "Check eligibility"}
              </Link>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {issuedCerts.length > 0 ? (
                issuedCerts.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-950/20 p-4"
                  >
                    <div>
                      <p className="font-mono text-[11px] text-emerald-300">
                        {cert.certificate_id}
                      </p>
                      <p className="mt-1 font-medium text-[#f4f3ef]">
                        {cert.achievement_title}
                      </p>
                    </div>
                    <Link
                      href={`/verify/certificate/${encodeURIComponent(cert.certificate_id)}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 font-medium text-[#111111]"
                    >
                      Download Certificate <ArrowUpRight size={12} aria-hidden="true" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-white/70">
                  <p className="font-medium text-white">
                    {completedInternships.length > 0
                      ? "You are eligible for your included Internship Certificate (₹0 extra)!"
                      : "Included automatically on programme & internship approval."}
                  </p>
                  <p className="mt-1 leading-5 text-white/55">
                    Every programme includes your official QR-verified Internship Completion Certificate at ₹0 extra once learning, project, and internship tasks pass mentor approval.
                  </p>
                  <Link
                    href="/certificates"
                    className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 font-medium text-[#111111]"
                  >
                    {completedInternships.length > 0 ? "Download Certificate" : "Check Eligibility"}{" "}
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Mentor Replies */}
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <MessageSquare size={15} className="text-[#b9a9d6]" aria-hidden="true" />
              <span>Mentor messages ({messages.length})</span>
            </h2>
            <div className="mt-4 space-y-2.5 text-xs">
              {messages.slice(0, 3).map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-black/25 p-3.5"
                >
                  <p className="font-medium text-[#f4f3ef]">
                    {m.authorName} · {m.topic}
                  </p>
                  <p className="mt-1 text-white/65">{m.body}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-white/50">
                  Ask your mentor a question anytime from your project workspace.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
