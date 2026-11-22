"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GoogleIcon } from "@hugeicons/core-free-icons";
import {
  completePasswordReset,
  loginStudentWithEmail,
  logoutStudent,
  registerStudentWithEmail,
  requestPasswordReset,
  signInWithGooglePopup,
} from "@/lib/firebase/client";
import { useFirebaseAuth } from "@/components/firebase-provider";
import { mapOAuthErrorToMessage, sanitizeRedirectPath } from "@/lib/auth/redirects";

type Mode = "login" | "sign-up" | "forgot-password" | "reset-password";

export function AuthForm({ mode }: { mode: Mode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [safeNext, setSafeNext] = useState("/learn");
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSafeNext(sanitizeRedirectPath(params.get("next"), "/learn"));
    setOobCode(params.get("oobCode"));

    const oauthErr = params.get("error");
    const oauthErrDesc = params.get("error_description");
    const updatedFlag = params.get("updated");
    const verifiedFlag = params.get("verified");
    if (oauthErr) {
      setError(mapOAuthErrorToMessage(oauthErr, oauthErrDesc));
    } else if (verifiedFlag === "1" && mode === "login") {
      setMessage("Email verified. Sign in with your email and password or continue with Google.");
    } else if (updatedFlag === "1" && mode === "login") {
      setMessage("Password updated. Sign in with your new password.");
    }
  }, [mode]);

  const getSafeNext = () => {
    if (typeof window === "undefined") return safeNext;
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    return sanitizeRedirectPath(requestedNext, "/learn");
  };

  const handleSwitchSignOut = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await logoutStudent();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setMessage("");
    setGoogleBusy(true);

    try {
      await signInWithGooglePopup();
      const next = getSafeNext();
      router.push(next);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : mapOAuthErrorToMessage("oauth_config"),
      );
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if ((mode === "sign-up" || mode === "reset-password") && password !== passwordAgain) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const result = await loginStudentWithEmail(email, password);
        if (!result.emailVerified) {
          setMessage("Signed in. Check your inbox to verify your email for full certificate eligibility.");
        }
        const next = getSafeNext();
        router.push(next);
        router.refresh();
      } else if (mode === "sign-up") {
        await registerStudentWithEmail({
          email,
          password,
          fullName: name.trim(),
          continueUrl: `${window.location.origin}/auth/login?verified=1&next=${encodeURIComponent(getSafeNext())}`,
        });
        router.push(`/auth/sign-up-success?next=${encodeURIComponent(getSafeNext())}`);
      } else if (mode === "forgot-password") {
        await requestPasswordReset(email, `${window.location.origin}/auth/login?updated=1`);
        setMessage("If an account exists for that email, a Firebase password reset link will arrive shortly.");
      } else {
        await completePasswordReset({ oobCode, newPassword: password });
        router.push("/auth/login?updated=1");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "login"
      ? "Welcome back."
      : mode === "sign-up"
        ? "Start building."
        : mode === "forgot-password"
          ? "Reset your password."
          : "Choose a new password.";
  const description =
    mode === "login"
      ? "Pick up where your curiosity left off."
      : mode === "sign-up"
        ? "Create your TGL student account."
        : mode === "forgot-password"
          ? "We’ll send a secure reset link if an account matches."
          : "Use a strong password you haven’t used elsewhere.";
  const supportsGoogle = mode === "login" || mode === "sign-up";
  const needsEmail = mode !== "reset-password";
  const needsPassword = mode === "login" || mode === "sign-up" || mode === "reset-password";

  return (
    <section className="tgl-glass-strong w-full max-w-[460px] rounded-[28px] p-7 text-foreground sm:p-10">
      <Link
        href="/"
        className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        TOUCH GRASS LATER
      </Link>
      <p className="mt-10 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Learn. Build. Grow.
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>

      {!authLoading && user && (mode === "login" || mode === "sign-up") && (
        <div
          role="status"
          className="tgl-subsurface mt-6 rounded-2xl border border-border p-4 text-xs"
        >
          <p className="text-muted-foreground">
            Currently signed in as{" "}
            <strong className="font-medium text-foreground">{user.email}</strong>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={safeNext}
              className="inline-flex min-h-9 items-center rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Continue to workspace
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSwitchSignOut()}
              className="inline-flex min-h-9 items-center rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:border-foreground/30 disabled:opacity-50"
            >
              Sign out &amp; switch account
            </button>
          </div>
        </div>
      )}

      {supportsGoogle && (
        <div className="mt-8 space-y-5">
          <button
            type="button"
            disabled={busy || googleBusy}
            onClick={() => void handleGoogleAuth()}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-black/15 bg-white px-5 text-sm font-medium text-[#1f1f1f] shadow-xs transition hover:bg-[#f5f5f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-65 dark:border-white/20"
          >
            {googleBusy ? (
              <Loader2 size={18} className="animate-spin text-[#1f1f1f]" aria-hidden="true" />
            ) : (
              <HugeiconsIcon
                icon={GoogleIcon}
                size={18}
                strokeWidth={2}
                className="shrink-0 text-[#4285F4]"
                aria-hidden="true"
              />
            )}
            <span>{googleBusy ? "Connecting with Google…" : "Continue with Google"}</span>
          </button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form className={supportsGoogle ? "mt-5 flex flex-col gap-4" : "mt-8 flex flex-col gap-4"} onSubmit={handleSubmit}>
        {mode === "sign-up" && (
          <label className="flex flex-col gap-2 text-xs font-medium text-foreground">
            <span>
              Your name{" "}
              <span className="font-normal text-muted-foreground">
                optional for now — needed on certificates
              </span>
            </span>
            <input
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="h-12 rounded-xl border border-border bg-input px-4 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
        )}
        {needsEmail && (
          <label className="flex flex-col gap-2 text-xs font-medium text-foreground">
            Email address
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="h-12 rounded-xl border border-border bg-input px-4 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
        )}
        {needsPassword && (
          <label className="flex flex-col gap-2 text-xs font-medium text-foreground">
            {mode === "reset-password" ? "New password" : "Password"}
            <span className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                className="h-12 w-full rounded-xl border border-border bg-input px-4 pr-12 text-sm text-foreground outline-none transition focus:border-accent"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>
        )}
        {(mode === "sign-up" || mode === "reset-password") && (
          <label className="flex flex-col gap-2 text-xs font-medium text-foreground">
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={passwordAgain}
              onChange={(event) => setPasswordAgain(event.target.value)}
              minLength={8}
              required
              className="h-12 rounded-xl border border-border bg-input px-4 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
        )}
        {mode === "login" && (
          <div className="-mt-1 text-right">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs leading-5 text-rose-800 dark:text-rose-200"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-xl border border-accent/25 bg-accent/10 px-3.5 py-2.5 text-xs leading-5 text-foreground"
          >
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || googleBusy}
          className="mt-2 h-12 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : mode === "sign-up"
                ? "Create account"
                : mode === "forgot-password"
                  ? "Send reset link"
                  : "Update password"}
        </button>
      </form>
      <div className="mt-6 text-center text-xs text-muted-foreground">
        {mode === "login" ? (
          <>
            New to TGL?{" "}
            <Link
              href={`/auth/sign-up?next=${encodeURIComponent(safeNext)}`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Create an account
            </Link>
          </>
        ) : mode === "sign-up" ? (
          <>
            Already registered?{" "}
            <Link
              href={`/auth/login?next=${encodeURIComponent(safeNext)}`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign in
            </Link>
          </>
        ) : (
          <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        )}
      </div>
      <p className="mt-8 border-t border-border pt-5 text-[11px] leading-5 text-muted-foreground">
        Your enrolled programmes, project submissions, mentor feedback, and internship progress stay saved to your Firebase-authenticated TGL student account.
      </p>
    </section>
  );
}
