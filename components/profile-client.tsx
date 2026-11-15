"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Palette, Shield, UserCheck } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { SignOutButton } from "@/components/sign-out-button";

export function ProfileClient({
  initialName,
  email,
  role,
  isSandbox,
}: {
  initialName: string;
  email: string;
  role: string;
  isSandbox: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      setError("Enter your full name (at least 2 characters) for certificates.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to save profile.");
        return;
      }
      setFullName(data.fullName ?? trimmed);
      setNotice("Verified profile name updated. All future and active certificate previews reflect this name.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section className="tgl-glass rounded-3xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
              Learner Identity
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-foreground">
              Verified profile &amp; certificate name
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Your verified full name appears directly on your official Internship Completion Certificate and public verification page.
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent/12 text-accent">
            <UserCheck size={18} aria-hidden="true" />
          </span>
        </div>

        <form onSubmit={handleSaveName} className="mt-6 space-y-4">
          <label className="block text-xs font-medium text-foreground">
            Verified full name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your legal or preferred certificate name"
              className="mt-2 h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm text-foreground outline-none transition-colors focus:border-accent"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="tgl-subsurface rounded-2xl p-4 text-xs">
              <p className="text-muted-foreground">Account email</p>
              <p className="mt-1 font-medium text-foreground">{email}</p>
            </div>
            <div className="tgl-subsurface rounded-2xl p-4 text-xs">
              <p className="text-muted-foreground">Portal role</p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-medium capitalize text-foreground">
                <Shield size={13} className="text-accent" aria-hidden="true" />
                {role} {isSandbox ? "(Sandbox preview)" : ""}
              </p>
            </div>
          </div>

          {notice && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-200"
            >
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{notice}</span>
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-200"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save profile name"}
            </button>
            <div className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-xs text-foreground">
              <SignOutButton />
            </div>
          </div>
        </form>
      </section>

      <aside className="space-y-6">
        <section className="tgl-glass rounded-3xl p-6 sm:p-7">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
            <Palette size={16} className="text-accent" aria-hidden="true" />
            <span>Appearance &amp; Theme</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Switch between the clean Apple-inspired Light Glassmorphism interface (default) and the classic Obsidian Dark studio theme. Your choice persists cleanly across reloads.
          </p>
          <div className="mt-4">
            <ThemeSwitcher variant="segmented" />
          </div>
        </section>
      </aside>
    </div>
  );
}
