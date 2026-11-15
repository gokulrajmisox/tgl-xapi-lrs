"use client";

import Link from "next/link";
import { Award, CheckCircle2, Download, ExternalLink, Loader2, Lock } from "lucide-react";
import type { CertificateIssuanceRecord } from "@/lib/certifications/store";
import type { CertificateLifecycleState } from "@/lib/learning/progression";
import { CertificateDocument } from "@/components/certificate-document";

const CERT_STATE_LABEL: Record<
  CertificateLifecycleState,
  { label: string; tone: string }
> = {
  locked: {
    label: "Locked",
    tone: "bg-foreground/[0.06] text-muted-foreground",
  },
  eligible: {
    label: "Eligible · Ready to claim",
    tone: "bg-accent/12 text-accent",
  },
  generating: {
    label: "Generating...",
    tone: "bg-accent/12 text-accent",
  },
  issued: {
    label: "Issued · Ready to download",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  claimed: {
    label: "Claimed",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
};

export function WorkspaceCertificatePanel({
  certificateTitle,
  programmeTitle,
  studentName,
  joinedOn,
  completedOn,
  certificateState,
  lockReason,
  issuedCertificate,
  claiming,
  onClaimCertificate,
  onDownloadCertificate,
}: {
  certificateTitle: string;
  programmeTitle: string;
  studentName: string;
  joinedOn: string | null;
  completedOn: string | null;
  certificateState: CertificateLifecycleState;
  lockReason: string | null;
  issuedCertificate: CertificateIssuanceRecord | null;
  claiming: boolean;
  onClaimCertificate: () => Promise<void>;
  onDownloadCertificate: () => void;
}) {
  const effectiveState: CertificateLifecycleState = claiming
    ? "generating"
    : certificateState;
  const badge = CERT_STATE_LABEL[effectiveState];

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Pending completion";

  return (
    <div className="tgl-subsurface rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
            <Award size={13} aria-hidden="true" />
            Official Completion Certificate (Included · ₹0 extra)
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {certificateTitle}
          </h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${badge.tone}`}>
          {badge.label}
        </span>
      </div>

      {/* Metadata Strip: Verified Student Name, Joined On, Completed On, Authorized Signatory */}
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Recipient</p>
          <p className="mt-0.5 font-semibold text-foreground">{studentName || "Verified Learner"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Joined On</p>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">{formatDate(joinedOn)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Completed On</p>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">{formatDate(completedOn)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Authorized Signature</p>
          <p className="mt-0.5 font-semibold text-foreground">Gokulraj · TGL Portal</p>
        </div>
      </div>

      {effectiveState === "locked" && (
        <div className="mt-5 rounded-xl border border-border bg-card p-4 text-xs">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <Lock size={14} className="text-muted-foreground" aria-hidden="true" />
            Certificate Locked Until Completion
          </p>
          <p className="mt-1.5 leading-5 text-muted-foreground">
            {lockReason ??
              "Complete all modules, receive mentor approval on your practical project, and complete all internship sprint tasks to unlock your included certificate."}
          </p>
        </div>
      )}

      {(effectiveState === "eligible" || effectiveState === "generating") && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/35 bg-accent/10 p-4 text-xs">
          <div>
            <p className="font-semibold text-foreground">
              Congratulations! All completion criteria satisfied.
            </p>
            <p className="mt-1 text-muted-foreground">
              Generate your verified credential with QR verification link and downloadable PDF at ₹0 extra cost.
            </p>
          </div>
          <button
            type="button"
            disabled={claiming}
            onClick={() => void onClaimCertificate()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {claiming ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Generating...
              </>
            ) : (
              <>
                <Award size={14} aria-hidden="true" />
                Claim &amp; Generate Certificate
              </>
            )}
          </button>
        </div>
      )}

      {issuedCertificate &&
        (effectiveState === "issued" || effectiveState === "claimed") && (
          <div className="mt-6 space-y-4">
            <CertificateDocument
              data={{
                certificateId: issuedCertificate.certificate_id,
                recipientName: issuedCertificate.recipient_name,
                certificateTitle: certificateTitle,
                achievementTitle: programmeTitle,
                organization: "TGL Learning Portal",
                issuedAt: issuedCertificate.issued_at,
                status:
                  issuedCertificate.issuance_status === "revoked"
                    ? "revoked"
                    : "issued",
                revocationReason: issuedCertificate.revocation_reason,
              }}
              compact
              showActions={false}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`/api/certificates/${encodeURIComponent(issuedCertificate.certificate_id)}/pdf`}
                  download={`${issuedCertificate.certificate_id}.pdf`}
                  onClick={onDownloadCertificate}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground hover:opacity-90"
                >
                  <Download size={14} aria-hidden="true" />
                  {effectiveState === "claimed" ? "Download PDF Again" : "Download PDF Certificate"}
                </a>

                <Link
                  href={`/verify/certificate/${encodeURIComponent(issuedCertificate.certificate_id)}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground hover:border-foreground/30"
                >
                  Verify Public QR Link <ExternalLink size={13} aria-hidden="true" />
                </Link>
              </div>

              {effectiveState === "claimed" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Claimed to verified record
                </span>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
