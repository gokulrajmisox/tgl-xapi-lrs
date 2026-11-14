"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "sign-up" | "forgot-password" | "reset-password";

export function AuthForm({ mode }: { mode: Mode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if ((mode === "sign-up" || mode === "reset-password") && password !== passwordAgain) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          if (authError.code === "email_not_confirmed") throw new Error("Please confirm your email address from the link we sent you.");
          if (authError.status === 429) throw new Error("Too many attempts. Please wait and try again.");
          throw new Error("Invalid email or password.");
        }
        router.push("/learn");
        router.refresh();
      } else if (mode === "sign-up") {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
            data: { display_name: name.trim() },
          },
        });
        if (authError) {
          if (authError.code === "weak_password") throw new Error("Choose a stronger password.");
          if (authError.code === "email_address_invalid") throw new Error("Enter a valid email address.");
          if (authError.status === 429) throw new Error("Too many attempts. Please wait and try again.");
          throw new Error("Unable to create your account. Please try again.");
        }
        router.push("/auth/sign-up-success");
      } else if (mode === "forgot-password") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (authError) throw new Error("We could not send a reset link just now. Please try again later.");
        setMessage("If an account exists for that email, a reset link will arrive shortly.");
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw new Error("The password could not be updated. Open a fresh reset link and try again.");
        router.push("/auth/login?updated=1");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "login" ? "Welcome back." : mode === "sign-up" ? "Start building." : mode === "forgot-password" ? "Reset your password." : "Choose a new password.";
  const description = mode === "login" ? "Pick up where your curiosity left off." : mode === "sign-up" ? "Create your TGL student account." : mode === "forgot-password" ? "We’ll send a secure reset link if an account matches." : "Use a strong password you haven’t used elsewhere.";
  const needsEmail = mode !== "reset-password";
  const needsPassword = mode === "login" || mode === "sign-up" || mode === "reset-password";

  return <section className="w-full max-w-[460px] rounded-[28px] border border-white/[0.12] bg-[#111]/80 p-7 shadow-[0_25px_90px_rgba(0,0,0,.4)] backdrop-blur-2xl sm:p-10">
    <Link href="/" className="text-[10px] font-semibold tracking-[0.2em] text-white/60">TOUCH GRASS LATER</Link>
    <p className="mt-12 text-[9px] uppercase tracking-[0.22em] text-white/40">Learn. Build. Grow.</p>
    <h1 className="mt-4 text-4xl font-medium tracking-[-0.07em]">{title}</h1>
    <p className="mt-3 text-sm leading-6 text-white/50">{description}</p>
    <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
      {mode === "sign-up" && <label className="flex flex-col gap-2 text-xs text-white/55">Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} className="h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#b9a9d6]/60" /></label>}
      {needsEmail && <label className="flex flex-col gap-2 text-xs text-white/55">Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#b9a9d6]/60" /></label>}
      {needsPassword && <label className="flex flex-col gap-2 text-xs text-white/55">{mode === "reset-password" ? "New password" : "Password"}<span className="relative"><input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 pr-12 text-sm text-white outline-none transition focus:border-[#b9a9d6]/60" /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/45" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>}
      {(mode === "sign-up" || mode === "reset-password") && <label className="flex flex-col gap-2 text-xs text-white/55">Confirm password<input type="password" autoComplete="new-password" value={passwordAgain} onChange={(event) => setPasswordAgain(event.target.value)} minLength={8} required className="h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#b9a9d6]/60" /></label>}
      {mode === "login" && <div className="-mt-1 text-right"><Link href="/auth/forgot-password" className="text-xs text-white/45 underline underline-offset-4 hover:text-white">Forgot password?</Link></div>}
      {error && <p role="alert" className="text-xs leading-5 text-rose-300">{error}</p>}{message && <p role="status" className="text-xs leading-5 text-[#c9bce0]">{message}</p>}
      <button type="submit" disabled={busy} className="mt-2 h-12 rounded-full bg-[#f4f3ef] text-sm font-medium text-[#111] transition hover:bg-white disabled:cursor-wait disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "sign-up" ? "Create account" : mode === "forgot-password" ? "Send reset link" : "Update password"}</button>
    </form>
    <div className="mt-6 text-center text-xs text-white/45">{mode === "login" ? <>New to TGL? <Link href="/auth/sign-up" className="text-white underline underline-offset-4">Create an account</Link></> : mode === "sign-up" ? <>Already registered? <Link href="/auth/login" className="text-white underline underline-offset-4">Sign in</Link></> : <Link href="/auth/login" className="text-white underline underline-offset-4">Back to sign in</Link>}</div>
    <p className="mt-8 border-t border-white/[0.08] pt-5 text-[11px] leading-5 text-white/50">Your enrolled courses, project submissions, mentor feedback, and internship progress stay saved to your student account.</p>
  </section>;
}
