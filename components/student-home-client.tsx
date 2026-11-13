"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock3,
  FolderGit2,
  Lock,
  MessageSquare,
  Receipt,
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
import { StudentCertificationsPanel } from "@/components/student-certifications-panel";

export function StudentHomeClient({
  learnerName,
  courses,
  internships,
  applications,
  orders,
  payments,
  issuances,
  nodeStates,
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
  const recommendedCourses = courses.filter((c) => !c.enrolled).slice(0, 3);
  const completedLessonsTotal = enrolledCourses.reduce(
    (sum, c) => sum + c.completedLessonCount,
    0,
  );
  const approvedProjects = submissions.filter((s) => s.status === "approved").length;
  const completedInternships = applications.filter(
    (a) => a.status === "completed" && a.mentor_approved,
  );
  const issuedCerts = issuances.filter((i) => i.issuance_status === "issued");
  const paidOrders = orders.filter((o) => o.order_status === "paid");

  // Pending internship tasks across active applications
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

  const anyCourseQuizOrNotesDone =
    enrolledCourses.some((c) => c.completedLessonCount > 0 || c.quizPassed) ||
    Object.values(nodeStates).some((s) => s === "completed");

  const stages: JourneyStageState[] = [
    {
      step: 1,
      key: "pay",
      label: "Pay",
      detail:
        paidOrders.length > 0
          ? `${paidOrders.length} verified INR payment${paidOrders.length > 1 ? "s" : ""}`
          : "Choose a paid course (₹499–₹1,999)",
      status: paidOrders.length > 0 || enrolledCourses.length > 0 ? "completed" : "active",
      href: "/courses",
    },
    {
      step: 2,
      key: "enrol",
      label: "Enrol in Course",
      detail:
        enrolledCourses.length > 0
          ? `${enrolledCourses.length} active course${enrolledCourses.length > 1 ? "s" : ""}`
          : "Unlock notes, videos & quiz",
      status: enrolledCourses.length > 0 ? "completed" : "active",
      href: enrolledCourses[0] ? `/courses/${enrolledCourses[0].slug}` : "/courses",
    },
    {
      step: 3,
      key: "learn",
      label: "Learn",
      detail:
        completedLessonsTotal > 0
          ? `${completedLessonsTotal} lesson${completedLessonsTotal === 1 ? "" : "s"} done`
          : "Read notes & pass quiz",
      status: enrolledCourses.some((c) => c.progressPercent >= 100 && c.quizPassed)
        ? "completed"
        : anyCourseQuizOrNotesDone || enrolledCourses.length > 0
          ? "active"
          : "upcoming",
      href: enrolledCourses[0] ? `/courses/${enrolledCourses[0].slug}` : "/courses",
    },
    {
      step: 4,
      key: "project",
      label: "Build Project",
      detail:
        approvedProjects > 0
          ? `${approvedProjects} mentor-approved`
          : submissions.length > 0
            ? `${submissions.length} submitted / active`
            : "Submit GitHub & demo URL",
      status:
        approvedProjects > 0
          ? "completed"
          : submissions.length > 0
            ? "active"
            : "upcoming",
      href: submissions[0] ? `/projects/${submissions[0].projectSlug}` : "/explore",
    },
    {
      step: 5,
      key: "internship",
      label: "Complete Internship",
      detail:
        completedInternships.length > 0
          ? "Mentor-approved & completed"
          : applications.length > 0
            ? `${pendingInternshipTasks.length} pending tasks`
            : "Apply with approved project",
      status:
        completedInternships.length > 0
          ? "completed"
          : applications.length > 0 || approvedProjects > 0
            ? "active"
            : "upcoming",
      href: "/internships",
    },
    {
      step: 6,
      key: "certificate",
      label: "Internship Certificate",
      detail:
        issuedCerts.length > 0
          ? `${issuedCerts.length} QR credential issued`
          : completedInternships.length > 0
            ? "Unlocked · Claim ₹299–₹599"
            : "Unlocks after internship approval",
      status:
        issuedCerts.length > 0
          ? "completed"
          : completedInternships.length > 0
            ? "active"
            : "upcoming",
      href: "/certificates",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stage 1-6 Interactive Visual Journey Tracker */}
      <StudentJourneyTracker stages={stages} />

      {/* Snapshot KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
            Enrolled courses
          </p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-[#f4f3ef]">
            {enrolledCourses.length} active
          </p>
          <p className="mt-1 text-[11px] text-white/50">
            {completedLessonsTotal} lesson{completedLessonsTotal === 1 ? "" : "s"} completed
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#111111] p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
            Project reviews
          </p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-[#f4f3ef]">
            {approvedProjects} approved · {submissions.length} total
          </p>
          <p className="mt-1 text-[11px] text-white/50">Mentor feedback recorded</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#111111] p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
            Pending internship tasks
          </p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-[#b9a9d6]">
            {pendingInternshipTasks.length} pending
          </p>
          <p className="mt-1 text-[11px] text-white/50">
            {completedInternships.length} programme completed
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#111111] p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
            Issued credentials
          </p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-emerald-300">
            {issuedCerts.length} QR verified
          </p>
          <p className="mt-1 text-[11px] text-white/50">
            {payments.filter((p) => p.payment_status === "captured").length} INR transactions
          </p>
        </article>
      </div>

      {/* Main 2-Column Operational Workspace */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-6">
          {/* Enrolled Courses & Next Recommended */}
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-base font-medium">
                <BookOpen size={16} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Enrolled courses &amp; progress, {learnerName}</span>
              </h2>
              <Link href="/courses" className="text-xs text-[#b9a9d6] hover:text-white">
                Explore catalog
              </Link>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-black/25 p-4"
                >
                  <div>
                    <p className="text-[11px] text-emerald-300">
                      Enrolled · {course.completedLessonCount}/{course.lessonCount} lessons ({course.progressPercent}%) · Quiz:{" "}
                      {course.quizPassed ? `Passed (${course.quizScorePercent}%)` : "Pending"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#f4f3ef]">
                      {course.title}
                    </p>
                    <p className="mt-0.5 text-white/50">
                      Project: {course.projectTitle} · Internship: {course.linkedInternshipTitle}
                    </p>
                  </div>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="rounded-full bg-[#f4f3ef] px-4 py-2 text-[11px] font-medium text-[#111111] whitespace-nowrap shrink-0"
                  >
                    Continue learning
                  </Link>
                </div>
              ))}

              {recommendedCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-[11px] text-white/50">
                      <Lock size={11} aria-hidden="true" />
                      {course.category} · {formatInrFromPaise(course.pricePaise)} INR
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#f4f3ef]">
                      {course.title}
                    </p>
                    <p className="mt-0.5 text-white/45">
                      {course.skills.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="rounded-full border border-white/15 px-3.5 py-2 text-[11px] text-white/85 hover:border-white/35 whitespace-nowrap shrink-0"
                  >
                    Enrol Now
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Linked Project Submissions */}
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-base font-medium">
                <FolderGit2 size={16} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Linked practical projects &amp; status</span>
              </h2>
              <Link href="/explore" className="text-xs text-white/55 hover:text-white">
                All projects
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {submissions.map((sub) => (
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
                  <p className="mt-1.5 text-white/55">{sub.summary}</p>
                  {sub.mentorFeedback && (
                    <p className="mt-2 rounded-lg border border-emerald-400/20 bg-emerald-950/20 p-2.5 text-emerald-200/90">
                      Mentor ({sub.mentorName}): {sub.mentorFeedback}
                    </p>
                  )}
                </article>
              ))}
              {submissions.length === 0 && (
                <p className="text-xs text-white/45">
                  No projects submitted yet. Enrol in a course to unlock its linked capstone project.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Internship Tasks, Mentor Messages & Receipts */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#b9a9d6]/25 bg-[#131118] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-medium">
                <Briefcase size={15} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>Internship status &amp; pending tasks</span>
              </h2>
              <Link href="/internships" className="text-xs text-[#b9a9d6] hover:text-white">
                Workspace
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
                        className={`capitalize text-[11px] font-medium ${
                          app.status === "completed" && app.mentor_approved
                            ? "text-emerald-300"
                            : "text-[#b9a9d6]"
                        }`}
                      >
                        {app.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    {app.mentor_notes && (
                      <p className="mt-1.5 text-[11px] text-white/55">{app.mentor_notes}</p>
                    )}
                  </div>
                );
              })}

              {pendingInternshipTasks.length > 0 && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                    Pending tasks with deadlines
                  </p>
                  {pendingInternshipTasks.map((item) => (
                    <Link
                      key={item.task.id}
                      href="/internships"
                      className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-3 hover:border-white/30"
                    >
                      <div>
                        <p className="font-medium text-[#f4f3ef]">{item.task.title}</p>
                        <p className="mt-0.5 text-[11px] text-[#b9a9d6]">
                          Due: {item.task.deadlineLabel} ·{" "}
                          {item.submission ? item.submission.status.replaceAll("_", " ") : "Action needed"}
                        </p>
                      </div>
                      <Clock3 size={13} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              )}

              {applications.length === 0 && (
                <p className="text-white/50">
                  No active internship applications yet. Approve a course capstone project to unlock admission.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <MessageSquare size={15} className="text-[#b9a9d6]" aria-hidden="true" />
              <span>Mentor feedback &amp; replies</span>
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
                  <p className="mt-1 text-white/55">{m.body}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-white/45">No mentor thread messages yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-medium">
                <Receipt size={15} className="text-[#b9a9d6]" aria-hidden="true" />
                <span>INR payments ({orders.length})</span>
              </h2>
              <Link href="/certificates" className="text-xs text-[#b9a9d6] hover:text-white">
                Certificates
              </Link>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {orders.slice(0, 3).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/25 px-3.5 py-2.5"
                >
                  <span className="truncate font-mono text-[11px] text-white/75">
                    {o.order_kind === "course_enrollment" ? "Course" : "Certificate"} ·{" "}
                    {o.order_status}
                  </span>
                  <span className="font-mono font-medium tabular-nums text-[#f4f3ef]">
                    {formatInrFromPaise(o.amount_paise)}
                  </span>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-white/45">No INR checkout orders recorded yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Unified Certifications, Checkout & Downloadable QR Receipts Panel */}
      <StudentCertificationsPanel />

      {/* Direct Next Step Callout */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-400/25 bg-emerald-950/15 p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">
            Verified Portfolio &amp; Certificates
          </p>
          <p className="mt-1 text-sm text-[#f4f3ef]">
            Every verified certificate carries a unique ID, scannable QR code, and public <code className="text-[#b9a9d6]">/verify/certificate/[id]</code> link.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/learn/portfolio"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs text-white/90 hover:border-white/40 whitespace-nowrap shrink-0"
          >
            <CheckCircle2 size={13} aria-hidden="true" /> Open Evidence Portfolio
          </Link>
          <Link
            href="/certificates"
            className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] whitespace-nowrap shrink-0"
          >
            <Award size={13} aria-hidden="true" /> Certificates &amp; Verification
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
