"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Palette, Shield, UserCheck } from "lucide-react";
import { useFirebaseAuth } from "@/components/firebase-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import {
  getFirebaseAuth,
  saveStudentAvatarClient,
  saveStudentDisplayNameClient,
} from "@/lib/firebase/client";
import { uploadProfileImageToStorage } from "@/lib/firebase/storage";

export function ProfileClient({
  uid,
  initialName,
  email,
  role,
  isSandbox,
}: {
  uid?: string;
  initialName: string;
  email: string;
  role: string;
  isSandbox: boolean;
}) {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useFirebaseAuth();
  const resolvedName = profile?.displayName || initialName || user?.displayName || "";
  const resolvedEmail = profile?.email || email || user?.email || "";
  const resolvedRole = profile?.role || role || "student";
  const resolvedUid = user?.uid || uid || "";

  const [fullName, setFullName] = useState(resolvedName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setFullName(resolvedName);
    setAvatarPreview(profile?.avatarUrl ?? null);
    setNotice("");
    setError("");
  }, [resolvedUid, resolvedName, profile?.avatarUrl]);

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
      const currentUser = getFirebaseAuth().currentUser;
      if (currentUser) {
        await saveStudentDisplayNameClient(trimmed);
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmed,
          ...(avatarPreview?.startsWith("https://") ? { avatarUrl: avatarPreview } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to save profile.");
        return;
      }
      setFullName(data.fullName ?? trimmed);
      setNotice("Verified profile name updated. All future and active certificate previews reflect this name.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    setNotice("");
    try {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) {
        setNotice("Sign in with Firebase Authentication to upload and persist a profile photo to Cloud Storage.");
        return;
      }
      const { downloadUrl } = await uploadProfileImageToStorage(file);
      setAvatarPreview(downloadUrl);
      await saveStudentAvatarClient(downloadUrl);
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim() || initialName, avatarUrl: downloadUrl }),
      });
      setNotice("Profile photo uploaded to Firebase Storage and synced to Firestore.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload profile photo.");
    } finally {
      setUploadingPhoto(false);
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
          <div className="tgl-subsurface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={fullName || "Learner avatar"}
                  referrerPolicy="no-referrer"
                  className="size-11 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-11 place-items-center rounded-full bg-accent/12 text-xs font-semibold text-accent">
                  {(fullName || "TG")
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join("") || "TG"}
                </span>
              )}
              <div>
                <p className="text-xs font-medium text-foreground">Profile photo (Firebase Storage)</p>
                <p className="text-[11px] text-muted-foreground">PNG, JPEG, or WebP up to 5 MB</p>
              </div>
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:border-foreground/30">
              <Camera size={14} aria-hidden="true" />
              <span>{uploadingPhoto ? "Uploading..." : "Upload photo"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void handlePhotoUpload(e)}
                disabled={uploadingPhoto}
                className="sr-only"
              />
            </label>
          </div>

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
              <p className="mt-1 break-all font-medium text-foreground">
                {authLoading && !resolvedEmail ? "Verifying session…" : resolvedEmail}
              </p>
            </div>
            <div className="tgl-subsurface rounded-2xl p-4 text-xs">
              <p className="text-muted-foreground">Portal role</p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-medium capitalize text-foreground">
                <Shield size={13} className="text-accent" aria-hidden="true" />
                {resolvedRole} {isSandbox ? "(Sandbox preview)" : ""}
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
