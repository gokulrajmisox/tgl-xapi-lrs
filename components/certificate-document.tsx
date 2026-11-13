"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Printer, ShieldCheck, ShieldX } from "lucide-react";
import QRCode from "qrcode";

export type CertificatePreviewData = {
  certificateId: string;
  recipientName: string;
  certificateTitle: string;
  achievementTitle: string;
  organization?: string;
  issuedAt: string | null;
  status: "issued" | "revoked" | "preview";
  revocationReason?: string | null;
};

export function CertificateDocument({
  data,
  compact = false,
  showActions = true,
}: {
  data: CertificatePreviewData;
  compact?: boolean;
  showActions?: boolean;
}) {
  const [qrSvg, setQrSvg] = useState<string>("");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://touchgrasslater.org";
  const verifyPath = `/verify/certificate/${encodeURIComponent(data.certificateId)}`;
  const verificationUrl = `${origin}${verifyPath}`;

  useEffect(() => {
    let active = true;
    QRCode.toString(verificationUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: compact ? 88 : 112,
      color: { dark: "#111111", light: "#f4f3ef" },
    })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [verificationUrl, compact]);

  const formattedDate = data.issuedAt
    ? new Date(data.issuedAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Pending verification";

  const downloadHtml = () => {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${data.certificateTitle} — ${data.certificateId}</title>
  <style>
    body { margin: 0; padding: 48px; background: #090909; font-family: Georgia, serif; display: flex; justify-content: center; }
    .cert { width: 880px; background: #f4f3ef; color: #111; padding: 56px; border: 1px solid #d4d0c7; border-radius: 16px; }
    .kicker { font-family: system-ui, sans-serif; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #555; }
    .title { font-size: 38px; margin: 18px 0 8px; font-weight: 500; letter-spacing: -0.02em; }
    .name { font-size: 46px; font-style: italic; margin: 28px 0 12px; color: #111; border-bottom: 1px solid #c5bfd0; padding-bottom: 12px; }
    .body { font-family: system-ui, sans-serif; font-size: 15px; line-height: 1.7; color: #333; max-width: 620px; }
    .meta { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; font-family: system-ui, sans-serif; font-size: 12px; color: #444; }
    .mono { font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="kicker">TOUCH GRASS LATER · OFFICIAL CREDENTIAL</div>
    <h1 class="title">${data.certificateTitle}</h1>
    <p class="body">This credential confirms that</p>
    <div class="name">${data.recipientName}</div>
    <p class="body">has satisfied all completion, project submission, and authorized mentor review requirements for <strong>${data.achievementTitle}</strong>.</p>
    <div class="meta">
      <div>
        <div>Issued by: ${data.organization ?? "Touch Grass Later"}</div>
        <div>Issue date: ${formattedDate}</div>
        <div class="mono">Certificate ID: ${data.certificateId}</div>
        <div>Verify: ${verificationUrl}</div>
      </div>
      <div>${qrSvg}</div>
    </div>
  </div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.certificateId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <article
        aria-label={`${data.certificateTitle} preview for ${data.recipientName}`}
        className={`relative overflow-hidden rounded-2xl border border-[#d9d5cc] bg-[#f4f3ef] text-[#111111] ${
          compact ? "p-6" : "p-7 sm:p-10"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/55">
              {data.organization ?? "Touch Grass Later"}
            </p>
            <h3
              className={`mt-2 font-medium tracking-[-0.04em] text-[#111111] ${
                compact ? "text-xl" : "text-2xl sm:text-3xl"
              }`}
            >
              {data.certificateTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            {data.status === "revoked" ? (
              <span className="inline-flex items-center gap-1.5 text-rose-700">
                <ShieldX size={14} aria-hidden="true" /> Revoked
              </span>
            ) : data.status === "issued" ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck size={14} aria-hidden="true" /> Verified &amp; Active
              </span>
            ) : (
              <span className="text-black/55">Sample Preview</span>
            )}
          </div>
        </div>

        <div className={compact ? "py-5" : "py-7"}>
          <p className="text-xs text-black/55">Awarded to</p>
          <p
            className={`mt-2 font-serif italic tracking-[-0.03em] text-[#111111] ${
              compact ? "text-3xl" : "text-4xl sm:text-5xl"
            }`}
          >
            {data.recipientName}
          </p>
          <p className="mt-4 max-w-xl text-xs leading-6 text-black/70 sm:text-sm">
            For verified completion, evaluated project work, and authorized mentor approval in{" "}
            <strong className="font-semibold text-[#111111]">{data.achievementTitle}</strong>.
          </p>
          {data.status === "revoked" && data.revocationReason && (
            <p className="mt-3 text-xs font-medium text-rose-700">
              Revocation audit note: {data.revocationReason}
            </p>
          )}
        </div>

        <div className="flex flex-col justify-between gap-5 border-t border-black/10 pt-5 sm:flex-row sm:items-end">
          <div className="space-y-1 text-xs text-black/65">
            <p>
              Issue date: <span className="font-medium tabular-nums text-[#111111]">{formattedDate}</span>
            </p>
            <p>
              Certificate ID:{" "}
              <span className="font-mono text-[11px] font-medium tabular-nums text-[#111111]">
                {data.certificateId}
              </span>
            </p>
            <p className="truncate text-[11px] text-black/50">
              Verify: {verifyPath}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {qrSvg ? (
              <div
                aria-label={`QR verification code for ${data.certificateId}`}
                className="shrink-0 rounded-lg border border-black/10 bg-[#f4f3ef] p-1.5"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="grid size-20 place-items-center rounded-lg border border-black/10 text-[10px] text-black/45">
                QR
              </div>
            )}
          </div>
        </div>
      </article>

      {showActions && data.status !== "preview" && (
        <div className="flex flex-wrap items-center gap-3">
          {data.status === "issued" && (
            <>
              <button
                type="button"
                onClick={downloadHtml}
                className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] transition-colors hover:bg-white whitespace-nowrap shrink-0"
              >
                <Download size={14} aria-hidden="true" />
                Download certificate
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 transition-colors hover:border-white/35 hover:text-white whitespace-nowrap shrink-0"
              >
                <Printer size={14} aria-hidden="true" />
                Print / Save PDF
              </button>
            </>
          )}
          <Link
            href={verifyPath}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-[#b9a9d6] transition-colors hover:border-[#b9a9d6]/50 whitespace-nowrap shrink-0"
          >
            Public verification <ExternalLink size={13} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
