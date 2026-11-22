"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { verifyEmailActionCode } from "@/lib/firebase/client";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";

export function AuthActionClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "verified" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [safeNext, setSafeNext] = useState("/learn");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") ?? "";
    const oobCode = params.get("oobCode") ?? "";
    const next = sanitizeRedirectPath(params.get("continueUrl") ?? params.get("next"), "/learn");
    setSafeNext(next);

    if (mode === "resetPassword" && oobCode) {
      router.replace(
        `/auth/reset-password?oobCode=${encodeURIComponent(oobCode)}&next=${encodeURIComponent(next)}`,
      );
      return;
    }

    if (mode === "verifyEmail" && oobCode) {
      void verifyEmailActionCode(oobCode)
        .then(() => {
          setStatus("verified");
        })
        .catch((err) => {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "This verification link has expired. Request a new one from sign in.",
          );
          setStatus("error");
        });
      return;
    }

    setErrorMessage("Unsupported or missing Firebase verification action link.");
    setStatus("error");
  }, [router]);

  return (
    <section className="tgl-glass-strong w-full max-w-md rounded-[28px] p-8 text-center text-foreground">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
        TOUCH GRASS LATER
      </p>

      {status === "loading" && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-accent" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">
            Verifying your request...
          </h1>
          <p className="text-xs text-muted-foreground">
            Validating your Firebase Authentication action code.
          </p>
        </div>
      )}

      {status === "verified" && (
        <div role="status" className="mt-8 flex flex-col items-center gap-3">
          <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">
            Email verified.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Your email address is confirmed. You can now sign in and track your programmes, internship tasks, and certificates.
          </p>
          <Link
            href={`/auth/login?verified=1&next=${encodeURIComponent(safeNext)}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Continue to sign in
          </Link>
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="mt-8 flex flex-col items-center gap-3">
          <ShieldAlert size={28} className="text-rose-600 dark:text-rose-300" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">
            Link expired or invalid.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">{errorMessage}</p>
          <Link
            href={`/auth/login?next=${encodeURIComponent(safeNext)}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Return to sign in
          </Link>
        </div>
      )}
    </section>
  );
}
