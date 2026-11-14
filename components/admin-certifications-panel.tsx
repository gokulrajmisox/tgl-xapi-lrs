"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";
import {
  formatInrFromPaise,
  type CertificateType,
} from "@/lib/certifications/pricing";
import type { EmailTemplateDefinition, EmailTemplateKey } from "@/lib/email/templates";
import type { EmailDeliveryRecord } from "@/lib/email/provider";

type Product = {
  id: string;
  name: string;
  description: string;
  certificate_type: CertificateType;
  price_paise: number;
  currency: string;
  enabled: boolean;
};

type Order = {
  id: string;
  user_id: string;
  order_kind?: "programme_enrollment" | "course_enrollment" | "certificate";
  product_id: string | null;
  course_id?: string | null;
  razorpay_order_id: string;
  amount_paise: number;
  order_status: string;
  payment_mode: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

type Payment = {
  id: string;
  order_id: string;
  user_id: string;
  razorpay_payment_id: string;
  payment_status: string;
  payment_method: string | null;
  failure_reason: string | null;
  refund_id: string | null;
  verified_at: string | null;
  created_at: string;
};

type Issuance = {
  id: string;
  certificate_id: string;
  recipient_name: string;
  recipient_email: string;
  achievement_title: string;
  certificate_type: CertificateType;
  issuance_status: "issued" | "revoked" | "pending_approval";
  revocation_reason: string | null;
  issued_at: string | null;
};

import type {
  InternshipTaskDefinition,
  InternshipTaskSubmission,
} from "@/lib/internships/eligibility";

type Application = {
  id: string;
  user_id: string;
  internship_id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  submission_url: string | null;
  task_submissions?: InternshipTaskSubmission[];
  final_evaluation_notes?: string | null;
  final_score_label?: string | null;
  mentor_approved: boolean;
  mentor_notes: string | null;
};

type Internship = {
  id: string;
  slug: string;
  title: string;
  track: string;
  description: string;
  duration_weeks: number;
  required_course_slug?: string | null;
  required_project_slug?: string | null;
  require_project_approval?: boolean;
  tasks?: InternshipTaskDefinition[];
};

type TabKey = "certificates" | "payments" | "emails";

export function AdminCertificationsPanel({
  isSandbox,
  initialTab = "certificates",
  embedded = false,
}: {
  isSandbox: boolean;
  initialTab?: TabKey;
  embedded?: boolean;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [issuances, setIssuances] = useState<Issuance[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateDefinition[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailDeliveryRecord[]>([]);
  const [emailConfig, setEmailConfig] = useState<{
    provider: string;
    testMode: boolean;
    from: string;
  } | null>(null);

  const [taskFeedbacks, setTaskFeedbacks] = useState<Record<string, string>>({});
  const [taskScores, setTaskScores] = useState<Record<string, string>>({});
  const [finalScores, setFinalScores] = useState<Record<string, string>>({});
  const [newIntTitle, setNewIntTitle] = useState("");
  const [newIntTrack, setNewIntTrack] = useState("Engineering");
  const [newIntDesc, setNewIntDesc] = useState("");
  const [newIntWeeks, setNewIntWeeks] = useState("6");
  const [newIntCourseSlug, setNewIntCourseSlug] = useState("web-architecture-systems");
  const [newIntTaskTitle, setNewIntTaskTitle] = useState("");
  const [newIntTaskBrief, setNewIntTaskBrief] = useState("");
  const [newIntTaskDeadline, setNewIntTaskDeadline] = useState("Week 2");

  const [paymentFilter, setPaymentFilter] = useState("all");
  const [refundReasons, setRefundReasons] = useState<Record<string, string>>({});
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});

  const [selectedTemplateKey, setSelectedTemplateKey] = useState<EmailTemplateKey>("payment_success");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [testRecipient, setTestRecipient] = useState("gokulrajmathsmaths@gmail.com");
  const [testPreview, setTestPreview] = useState<{ subject: string; html: string; text: string } | null>(null);
  const [simulateEmailFailure, setSimulateEmailFailure] = useState(false);

  const [pendingConfirm, setPendingConfirm] = useState<
    | {
        type: "refund";
        paymentId: string;
        itemTitle: string;
        amountLabel: string;
        reason: string;
      }
    | {
        type: "revoke";
        certificateId: string;
        recipientName: string;
        reason: string;
      }
    | null
  >(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    const [ordersRes, emailsRes] = await Promise.all([
      fetch("/api/admin/certifications/orders", { cache: "no-store" }),
      fetch("/api/admin/emails/test", { cache: "no-store" }),
    ]);

    if (ordersRes.ok) {
      const data = await ordersRes.json();
      setProducts(data.products ?? []);
      setOrders(data.orders ?? []);
      setPayments(data.payments ?? []);
      setIssuances(data.issuances ?? []);
      setApplications(data.applications ?? []);
      setInternships(data.internships ?? []);
    }

    if (emailsRes.ok) {
      const data = await emailsRes.json();
      setTemplates(data.templates ?? []);
      setEmailLogs(data.logs ?? []);
      setEmailConfig(data.config ?? null);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const tpl = templates.find((t) => t.template_key === selectedTemplateKey);
    if (tpl) {
      setEditSubject(tpl.subject_template);
      setEditBody(tpl.body_template);
    }
  }, [selectedTemplateKey, templates]);

  const handleRefund = async (paymentId: string) => {
    const reason = (refundReasons[paymentId] || "Admin-approved refund").trim();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/certifications/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refund failed.");
      setNotice(`Refund processed (${data.payment.refund_id}).`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleEvaluateTask = async (
    applicationId: string,
    taskId: string,
    decision: "approved" | "revision_required",
  ) => {
    const key = `${applicationId}:${taskId}`;
    const mentorFeedback =
      taskFeedbacks[key]?.trim() ||
      (decision === "approved"
        ? "Task deliverable verified and approved."
        : "Please refine task deliverables and resubmit.");
    const scoreLabel = taskScores[key]?.trim() || (decision === "approved" ? "Meets Rubric" : "Needs Revision");

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/certifications/issuances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate_task",
          applicationId,
          taskId,
          decision,
          mentorFeedback,
          scoreLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Task evaluation failed.");
      setNotice(`Internship task marked ${decision.replaceAll("_", " ")}.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task evaluation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateInternship = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/certifications/issuances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_internship",
          title: newIntTitle,
          track: newIntTrack,
          description: newIntDesc,
          durationWeeks: Number(newIntWeeks) || 6,
          requiredCourseSlug: newIntCourseSlug || null,
          requiredProjectSlug: null,
          requireProjectApproval: true,
          initialTaskTitle: newIntTaskTitle,
          initialTaskBrief: newIntTaskBrief,
          initialTaskDeadline: newIntTaskDeadline,
          initialTaskFormat: "GitHub URL + Verification Notes",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create internship programme.");
      setNotice(`Created internship "${data.internship.title}".`);
      setNewIntTitle("");
      setNewIntDesc("");
      setNewIntTaskTitle("");
      setNewIntTaskBrief("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create internship programme.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveInternship = async (applicationId: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/certifications/issuances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_internship",
          applicationId,
          mentorNotes: "All assigned tasks verified and final internship completion approved.",
          finalScoreLabel: finalScores[applicationId]?.trim() || "Distinction / Verified",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approval failed.");
      setNotice(
        data.issuance?.certificate_id
          ? `Internship approved & included certificate ${data.issuance.certificate_id} issued at ₹0 extra.`
          : "Internship completion approved and certificate confirmation emails logged.",
      );
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeCertificate = async (certificateId: string) => {
    const reason = (revokeReasons[certificateId] || "").trim();
    if (reason.length < 5) {
      setError("Enter an audit reason (at least 5 characters) before revoking a certificate.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/certifications/issuances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_certificate",
          certificateId,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Revocation failed.");
      setNotice(`Certificate ${certificateId} revoked with audit trail.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revocation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTemplate = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/emails/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedTemplateKey,
          subjectTemplate: editSubject,
          bodyTemplate: editBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save template.");
      setNotice(`Saved email template "${selectedTemplateKey}".`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Template save failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleTestEmail = async (
    templateOverride?: EmailTemplateKey,
    previewOnly = false,
  ) => {
    const targetKey = templateOverride ?? selectedTemplateKey;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/emails/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testRecipient,
          templateKey: targetKey,
          certificateName:
            targetKey === "certificate_issued" || targetKey === "internship_eligibility_confirmed"
              ? "Internship Certificate"
              : targetKey === "certificate_ready"
                ? "Course Completion Certificate"
                : "Internship Certificate",
          simulateFailure: simulateEmailFailure,
          previewOnly,
        }),
      });
      const data = await res.json();
      if (previewOnly) {
        if (!res.ok) throw new Error(data.error ?? "Preview failed.");
        setTestPreview(data.preview);
        return;
      }
      if (data.logs) setEmailLogs(data.logs);
      if (!res.ok) {
        throw new Error(data.record?.error_message ?? data.error ?? "Test email delivery failed.");
      }
      setNotice(
        `Test email (${targetKey}) logged as "${data.record.delivery_status}" to ${data.record.recipient_email}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test email error.");
    } finally {
      setBusy(false);
    }
  };

  const filteredPayments = payments.filter(
    (p) => paymentFilter === "all" || p.payment_status === paymentFilter,
  );

  return (
    <div
      className={
        embedded
          ? "text-[#f4f3ef] pb-12 pt-2"
          : "mx-auto max-w-[1200px] px-6 pb-24 pt-36 text-[#f4f3ef] md:px-12 md:pt-44"
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">
            TGL Administration · Payments, Certificates &amp; Email
          </p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">
            Certification &amp; <span className="font-serif italic text-[#b9a9d6]">Payment Console</span>
          </h1>
          <p className="mt-3 max-w-2xl text-xs leading-6 text-white/55">
            Inspect Razorpay Programme orders and refunds, evaluate internship tasks, approve completions (auto-issuing ₹0 certificates), revoke certificates with audit notes, and send test emails.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/programmes"
            className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 hover:border-white/35"
          >
            Programme Catalog
          </Link>
          <button
            type="button"
            onClick={() => void loadAll()}
            aria-label="Refresh admin data"
            className="grid size-9 place-items-center rounded-full border border-white/15 text-white/70 hover:text-white"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {isSandbox && (
        <p className="mt-5 rounded-xl border border-[#b9a9d6]/30 bg-[#b9a9d6]/10 px-4 py-3 text-xs text-[#dfd5ef]">
          Sandbox mode active (Supabase env vars not set). All state updates, refunds, revocations, auto-issued certificates, and test email logs run in server memory.
        </p>
      )}

      {notice && (
        <p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-xs text-emerald-200">
          <CheckCircle2 size={14} /> {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-xs text-rose-200">
          <ShieldAlert size={14} /> {error}
        </p>
      )}

      <div role="tablist" aria-label="Admin sections" className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {(
          [
            ["certificates", `Internships & Certificates (${issuances.length})`],
            ["payments", `Programme Orders & Payments (${orders.length})`],
            ["emails", `Email Templates & Test (${emailLogs.length})`],
          ] as [TabKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              tab === key
                ? "bg-[#f4f3ef] text-[#111111]"
                : "border border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "payments" && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-medium">Programme orders, payments &amp; refunds</h2>
            <div className="flex flex-wrap gap-1.5">
              {["all", "captured", "failed", "cancelled", "refunded"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPaymentFilter(status)}
                  className={`rounded-full px-3 py-1.5 text-xs capitalize ${
                    paymentFilter === status
                      ? "bg-[#f4f3ef] text-[#111111]"
                      : "border border-white/10 text-white/60"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredPayments.map((pay) => {
              const order = orders.find((o) => o.id === pay.order_id);
              const prod = products.find((p) => p.id === order?.product_id);
              const isProgrammeOrder =
                order?.order_kind === "programme_enrollment" ||
                order?.order_kind === "course_enrollment" ||
                Boolean(order?.metadata?.courseTitle ?? order?.metadata?.programmeTitle);
              const itemTitle = isProgrammeOrder
                ? `Programme Enrolment: ${String(
                    order?.metadata?.courseTitle ??
                      order?.metadata?.programmeTitle ??
                      "TGL Programme",
                  )}`
                : (prod?.name ?? "Programme Enrolment");
              return (
                <article
                  key={pay.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#111111] p-5 md:flex-row md:items-center"
                >
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-[#f4f3ef]">
                      {itemTitle} ·{" "}
                      <span className="font-mono tabular-nums">
                        {order ? formatInrFromPaise(order.amount_paise) : "INR"}
                      </span>
                    </p>
                    <p className="font-mono text-[11px] text-white/50">
                      Payment: {pay.razorpay_payment_id} · Order: {order?.razorpay_order_id}
                    </p>
                    <p className="text-[11px] text-white/50">
                      Status: <strong className="capitalize text-[#b9a9d6]">{pay.payment_status}</strong>
                      {pay.failure_reason ? ` · Reason: ${pay.failure_reason}` : ""}
                      {pay.refund_id ? ` · Refund ID: ${pay.refund_id}` : ""}
                    </p>
                  </div>

                  {pay.payment_status === "captured" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Refund reason..."
                        value={refundReasons[pay.id] ?? ""}
                        onChange={(e) =>
                          setRefundReasons((prev) => ({ ...prev, [pay.id]: e.target.value }))
                        }
                        className="h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setPendingConfirm({
                            type: "refund",
                            paymentId: pay.id,
                            itemTitle,
                            amountLabel: order ? formatInrFromPaise(order.amount_paise) : "INR",
                            reason: (refundReasons[pay.id] || "Admin-approved refund").trim(),
                          })
                        }
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose-300/35 px-3.5 py-2 text-xs text-rose-200 hover:bg-rose-300/10"
                      >
                        <RotateCcw size={12} /> Process refund
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
            {filteredPayments.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/15 p-6 text-xs text-white/45">
                No payment records match the selected filter.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "certificates" && (
        <div className="mt-8 space-y-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
            <section className="space-y-4">
              <h2 className="text-lg font-medium">
                Internship tasks, final evaluation &amp; completion approval ({applications.length})
              </h2>
              <div className="space-y-4">
                {applications.map((app) => {
                  const track = internships.find((i) => i.id === app.internship_id);
                  const tasks = track?.tasks ?? [];
                  const taskSubs = app.task_submissions ?? [];

                  return (
                    <article
                      key={app.id}
                      className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#f4f3ef]">
                            {app.applicant_name} ({app.applicant_email})
                          </p>
                          <p className="mt-1 text-white/55">{track?.title ?? "Internship Track"}</p>
                        </div>
                        <span
                          className={`capitalize font-medium ${
                            app.mentor_approved ? "text-emerald-300" : "text-[#b9a9d6]"
                          }`}
                        >
                          {app.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      {tasks.length > 0 && (
                        <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                            Assigned Task Submissions
                          </p>
                          {tasks.map((task) => {
                            const sub = taskSubs.find((s) => s.taskId === task.id);
                            const key = `${app.id}:${task.id}`;
                            return (
                              <div
                                key={task.id}
                                className="rounded-xl border border-white/10 bg-black/25 p-3.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-medium text-[#f4f3ef]">{task.title}</p>
                                  <span
                                    className={`capitalize ${
                                      sub?.status === "approved"
                                        ? "text-emerald-300"
                                        : sub?.status === "revision_required"
                                          ? "text-amber-300"
                                          : sub?.status === "submitted"
                                            ? "text-[#b9a9d6]"
                                            : "text-white/40"
                                    }`}
                                  >
                                    {sub ? sub.status.replaceAll("_", " ") : "Not submitted"}
                                  </span>
                                </div>
                                {sub && (
                                  <div className="mt-2 space-y-2">
                                    <a
                                      href={sub.submissionUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block font-mono text-[11px] text-[#b9a9d6] underline"
                                    >
                                      {sub.submissionUrl}
                                    </a>
                                    <p className="text-white/65">{sub.summary}</p>
                                    <div className="grid gap-2 pt-1 sm:grid-cols-2">
                                      <input
                                        type="text"
                                        placeholder="Mentor feedback..."
                                        value={taskFeedbacks[key] ?? sub.mentorFeedback ?? ""}
                                        onChange={(e) =>
                                          setTaskFeedbacks((prev) => ({
                                            ...prev,
                                            [key]: e.target.value,
                                          }))
                                        }
                                        className="h-8 rounded-lg border border-white/10 bg-[#151515] px-2.5 text-[11px] text-white"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Score label (e.g. Exceeds Expectations)"
                                        value={taskScores[key] ?? sub.scoreLabel ?? ""}
                                        onChange={(e) =>
                                          setTaskScores((prev) => ({
                                            ...prev,
                                            [key]: e.target.value,
                                          }))
                                        }
                                        className="h-8 rounded-lg border border-white/10 bg-[#151515] px-2.5 text-[11px] text-white"
                                      />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void handleEvaluateTask(app.id, task.id, "approved")}
                                        className="rounded-full bg-[#f4f3ef] px-3 py-1 text-[11px] font-medium text-[#111111]"
                                      >
                                        Approve task
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          void handleEvaluateTask(app.id, task.id, "revision_required")
                                        }
                                        className="rounded-full border border-amber-300/35 px-3 py-1 text-[11px] text-amber-200"
                                      >
                                        Request revision
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!app.mentor_approved ? (
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                          <input
                            type="text"
                            placeholder="Final grade / distinction label..."
                            value={finalScores[app.id] ?? ""}
                            onChange={(e) =>
                              setFinalScores((prev) => ({ ...prev, [app.id]: e.target.value }))
                            }
                            className="h-9 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleApproveInternship(app.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111]"
                          >
                            <ShieldCheck size={13} /> Approve final internship completion
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 text-emerald-300">
                          Final evaluation approved ({app.final_score_label || "Verified"})
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Create Internship Programme + Tasks */}
            <form
              onSubmit={handleCreateInternship}
              className="self-start rounded-2xl border border-white/10 bg-[#111111] p-6 text-xs"
            >
              <h2 className="flex items-center gap-2 text-base font-medium">
                <Plus size={15} className="text-[#b9a9d6]" /> Create internship programme
              </h2>
              <div className="mt-4 space-y-3">
                <label className="block text-white/60">
                  Programme title
                  <input
                    required
                    minLength={4}
                    value={newIntTitle}
                    onChange={(e) => setNewIntTitle(e.target.value)}
                    placeholder="e.g. Cloud Reliability Engineering Internship"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-white/60">
                    Track
                    <input
                      required
                      value={newIntTrack}
                      onChange={(e) => setNewIntTrack(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                    />
                  </label>
                  <label className="block text-white/60">
                    Duration (weeks)
                    <input
                      type="number"
                      min={1}
                      max={26}
                      value={newIntWeeks}
                      onChange={(e) => setNewIntWeeks(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                    />
                  </label>
                </div>
                <label className="block text-white/60">
                  Prerequisite course slug
                  <input
                    value={newIntCourseSlug}
                    onChange={(e) => setNewIntCourseSlug(e.target.value)}
                    placeholder="web-architecture-systems"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <label className="block text-white/60">
                  Description
                  <textarea
                    required
                    minLength={10}
                    rows={2}
                    value={newIntDesc}
                    onChange={(e) => setNewIntDesc(e.target.value)}
                    placeholder="Practical sprint focus and mentor expectations..."
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                  />
                </label>
                <label className="block text-white/60">
                  Initial assigned task title
                  <input
                    required
                    minLength={4}
                    value={newIntTaskTitle}
                    onChange={(e) => setNewIntTaskTitle(e.target.value)}
                    placeholder="e.g. Task 1: Load & Failover Benchmark"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <label className="block text-white/60">
                  Task brief &amp; deliverable expectation
                  <textarea
                    required
                    minLength={8}
                    rows={2}
                    value={newIntTaskBrief}
                    onChange={(e) => setNewIntTaskBrief(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                  />
                </label>
                <label className="block text-white/60">
                  Deadline label
                  <input
                    required
                    value={newIntTaskDeadline}
                    onChange={(e) => setNewIntTaskDeadline(e.target.value)}
                    placeholder="Week 2"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-[#f4f3ef] px-4 py-2.5 text-xs font-medium text-[#111111]"
                >
                  Publish internship track
                </button>
              </div>
            </form>
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Issued &amp; revoked certificates ({issuances.length})</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {issuances.map((cert) => (
                <article
                  key={cert.id}
                  className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] text-[#b9a9d6]">{cert.certificate_id}</p>
                      <p className="mt-1 text-sm font-medium text-[#f4f3ef]">
                        {cert.recipient_name} — {cert.achievement_title}
                      </p>
                      <p className="mt-1 text-white/45">
                        Status:{" "}
                        <strong className={cert.issuance_status === "revoked" ? "text-rose-300" : "text-emerald-300"}>
                          {cert.issuance_status}
                        </strong>
                      </p>
                      {cert.revocation_reason && (
                        <p className="mt-1 text-rose-200">Audit reason: {cert.revocation_reason}</p>
                      )}
                    </div>
                    <Link
                      href={`/verify/certificate/${encodeURIComponent(cert.certificate_id)}`}
                      className="text-white/60 underline underline-offset-4 hover:text-white"
                    >
                      Verify page
                    </Link>
                  </div>

                  {cert.issuance_status !== "revoked" && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      <input
                        type="text"
                        placeholder="Mandatory audit reason for revocation..."
                        value={revokeReasons[cert.certificate_id] ?? ""}
                        onChange={(e) =>
                          setRevokeReasons((prev) => ({
                            ...prev,
                            [cert.certificate_id]: e.target.value,
                          }))
                        }
                        className="h-9 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const reason = (revokeReasons[cert.certificate_id] || "").trim();
                          if (reason.length < 5) {
                            setError("Enter an audit reason (at least 5 characters) before revoking a certificate.");
                            return;
                          }
                          setError("");
                          setPendingConfirm({
                            type: "revoke",
                            certificateId: cert.certificate_id,
                            recipientName: cert.recipient_name,
                            reason,
                          });
                        }}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose-300/35 px-3.5 py-2 text-xs text-rose-200 hover:bg-rose-300/10"
                      >
                        <ShieldX size={13} /> Revoke
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "emails" && (
        <div className="mt-8 space-y-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-medium">
                  <Mail size={15} className="text-[#b9a9d6]" /> Admin Test Email Sender
                </h2>
                <span className="text-[11px] text-[#b9a9d6]">
                  Provider: {emailConfig?.provider ?? "console"} ·{" "}
                  {emailConfig?.testMode ? "TEST MODE ON" : "Live"}
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block text-xs text-white/60">
                  Test recipient email address
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="recipient@example.com"
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white"
                  />
                </label>

                <label className="flex items-center gap-2 text-xs text-white/60">
                  <input
                    type="checkbox"
                    checked={simulateEmailFailure}
                    onChange={(e) => setSimulateEmailFailure(e.target.checked)}
                  />
                  Simulate provider failure (tests retry &amp; failure logging)
                </label>

                <div className="space-y-2 border-t border-white/10 pt-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                    Send sample lifecycle email
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleTestEmail("payment_success", false)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111]"
                    >
                      <Send size={12} /> Send Payment Confirmation
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleTestEmail("certificate_issued", false)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-white/85 hover:border-white/35"
                    >
                      <Send size={12} /> Send Internship Certificate Email
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleTestEmail("certificate_ready", false)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-white/85 hover:border-white/35"
                    >
                      <Send size={12} /> Send Course Completion Email
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleTestEmail(selectedTemplateKey, true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#b9a9d6]/40 px-4 py-2 text-xs text-[#d8cbea]"
                  >
                    <Eye size={13} /> Preview selected template
                  </button>
                </div>

                {testPreview && (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
                    <p className="font-medium text-[#b9a9d6]">Subject: {testPreview.subject}</p>
                    <pre className="mt-2 whitespace-pre-wrap font-sans leading-5 text-white/70">
                      {testPreview.text}
                    </pre>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
              <h2 className="text-base font-medium">Configure email templates (8 events)</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-xs text-white/60">
                  Lifecycle template
                  <select
                    value={selectedTemplateKey}
                    onChange={(e) => setSelectedTemplateKey(e.target.value as EmailTemplateKey)}
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"
                  >
                    {templates.map((t) => (
                      <option key={t.template_key} value={t.template_key}>
                        {t.template_key}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-white/60">
                  Subject template
                  <input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white"
                  />
                </label>

                <label className="block text-xs text-white/60">
                  Body template
                  <textarea
                    rows={6}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
                  />
                </label>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSaveTemplate()}
                  className="rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111]"
                >
                  Save template
                </button>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <h2 className="text-base font-medium">Email delivery &amp; failure logs ({emailLogs.length})</h2>
            <div className="mt-4 space-y-2.5">
              {emailLogs.map((log) => (
                <article
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs"
                >
                  <div>
                    <p className="font-medium text-[#f4f3ef]">{log.subject}</p>
                    <p className="mt-1 text-[11px] text-white/50">
                      To: {log.recipient_email} · Template: {log.template_key} · Provider: {log.provider} · Attempts: {log.attempt_count}
                    </p>
                    {log.error_message && (
                      <p className="mt-1 text-[11px] text-rose-300">Error: {log.error_message}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                      log.delivery_status === "failed"
                        ? "border border-rose-400/30 text-rose-300"
                        : log.delivery_status === "sent"
                          ? "border border-emerald-400/30 text-emerald-300"
                          : "border border-[#b9a9d6]/30 text-[#d8cbea]"
                    }`}
                  >
                    {log.delivery_status}
                  </span>
                </article>
              ))}
              {emailLogs.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/15 p-5 text-xs text-white/45">
                  No email delivery logs recorded yet. Send a test email above to verify delivery and logging.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {pendingConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-400/35 bg-[#121212] p-6 text-[#f4f3ef] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rose-500/20 text-rose-300">
                  <AlertTriangle size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-rose-300">
                    Confirm Admin Action
                  </p>
                  <h3 id="admin-confirm-title" className="mt-1 text-lg font-medium tracking-[-0.03em]">
                    {pendingConfirm.type === "refund"
                      ? `Refund ${pendingConfirm.amountLabel}?`
                      : `Revoke certificate ${pendingConfirm.certificateId}?`}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cancel action"
                onClick={() => setPendingConfirm(null)}
                className="grid size-11 place-items-center rounded-full border border-white/10 text-white/65 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs text-white/75">
              {pendingConfirm.type === "refund" ? (
                <>
                  <p>
                    You are about to process a refund for{" "}
                    <strong className="text-white">{pendingConfirm.itemTitle}</strong>.
                  </p>
                  <p className="text-white/55">Reason: {pendingConfirm.reason}</p>
                </>
              ) : (
                <>
                  <p>
                    This immediately marks{" "}
                    <strong className="text-white">{pendingConfirm.certificateId}</strong>{" "}
                    ({pendingConfirm.recipientName}) as revoked on public verification pages.
                  </p>
                  <p className="text-white/55">Audit reason: {pendingConfirm.reason}</p>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingConfirm(null)}
                className="min-h-11 flex-1 rounded-full border border-white/15 px-4 py-2 text-xs text-white/85 hover:border-white/35"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const action = pendingConfirm;
                  setPendingConfirm(null);
                  if (action.type === "refund") {
                    await handleRefund(action.paymentId);
                  } else {
                    await handleRevokeCertificate(action.certificateId);
                  }
                }}
                className="min-h-11 flex-1 rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white hover:bg-rose-400 disabled:opacity-50"
              >
                {pendingConfirm.type === "refund" ? "Confirm Refund" : "Confirm Revocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
