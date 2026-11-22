"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Circle, LoaderCircle } from "lucide-react";

type Module = { id: string; title: string; description: string; sort_order: number; estimated_minutes: number | null };
type Progress = { module_id: string; status: "not_started" | "in_progress" | "completed"; completed_at: string | null };

export function LearningPathwayWorkspace({
  pathId,
  modules,
  initialProgress,
  enrolled,
  signedIn,
}: {
  pathId: string;
  modules: Module[];
  initialProgress: Progress[];
  enrolled: boolean;
  signedIn: boolean;
}) {
  const [isEnrolled, setIsEnrolled] = useState(enrolled);
  const [progress, setProgress] = useState<Record<string, Progress>>(
    Object.fromEntries(initialProgress.map((item) => [item.module_id, item])),
  );
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const completeCount = Object.values(progress).filter((item) => item.status === "completed").length;
  const percentage = modules.length ? Math.round((completeCount / modules.length) * 100) : 0;

  const enroll = async () => {
    setBusyId("enroll");
    setMessage("");
    try {
      const res = await fetch("/api/learning-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join_path", pathId }),
      });
      if (res.status === 401) {
        window.location.assign("/auth/login?next=/learning-hub");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not join right now. Please try again.");
      } else {
        setIsEnrolled(true);
        setMessage("You’re enrolled. Your progress will be saved to your account.");
      }
    } catch {
      setMessage("Could not join right now. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  const setModuleStatus = async (module: Module, status: "in_progress" | "completed") => {
    setBusyId(module.id);
    setMessage("");
    try {
      const res = await fetch("/api/learning-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_module_status", moduleId: module.id, status }),
      });
      if (res.status === 401) {
        window.location.assign("/auth/login?next=/learning-hub");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Progress could not be saved right now.");
      } else if (data.entry) {
        setProgress((current) => ({ ...current, [module.id]: data.entry }));
        setMessage("Progress saved to your account.");
      }
    } catch {
      setMessage("Progress could not be saved right now.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <div className="tgl-glass mb-8 flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Your progress</p>
          {isEnrolled ? (
            <>
              <p className="mt-2 text-2xl font-medium tracking-[-0.05em] tabular-nums text-foreground">
                {percentage}% <span className="text-sm font-normal text-muted-foreground">completed</span>
              </p>
              <div className="mt-3 h-1.5 w-full max-w-[360px] overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${percentage}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                {completeCount} of {modules.length} stages completed
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Join this learning path to save your lesson and project progress.
            </p>
          )}
        </div>
        {!isEnrolled && (
          <button
            type="button"
            onClick={() => void enroll()}
            disabled={busyId === "enroll"}
            className="min-h-11 rounded-full bg-primary px-5 py-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {busyId === "enroll" ? "Saving…" : signedIn ? "Join this path" : "Sign in to start"}
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="mb-4 text-xs text-[var(--accent)]">
          {message}
        </p>
      )}
      <ol className="border-l border-border">
        {modules.map((module, index) => {
          const item = progress[module.id];
          const status = item?.status ?? "not_started";
          return (
            <li key={module.id} className="relative pb-6 pl-7 last:pb-0">
              <span
                className={`absolute -left-[9px] top-1 grid size-[17px] place-items-center rounded-full border ${
                  status === "completed"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#111]"
                    : status === "in_progress"
                      ? "border-[var(--accent)] bg-background text-[var(--accent)]"
                      : "border-border bg-background text-muted-foreground/60"
                }`}
              >
                {status === "completed" ? (
                  <Check size={11} />
                ) : status === "in_progress" ? (
                  <LoaderCircle size={11} />
                ) : (
                  <Circle size={7} />
                )}
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    STAGE {String(index + 1).padStart(2, "0")}
                    {module.estimated_minutes ? ` · ${module.estimated_minutes} MIN` : ""}
                  </p>
                  <h2 className="mt-2 text-base font-medium tracking-[-0.03em] text-foreground">
                    {module.title}
                  </h2>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                    {module.description}
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                    {status === "completed" ? "Completed" : status === "in_progress" ? "In progress" : "Not started"}
                  </p>
                </div>
                {isEnrolled && (
                  <div className="flex shrink-0 gap-2">
                    {status === "not_started" && (
                      <button
                        type="button"
                        onClick={() => void setModuleStatus(module, "in_progress")}
                        disabled={busyId === module.id}
                        className="min-h-11 rounded-full border border-border px-4 py-2 text-xs text-foreground hover:border-foreground/35"
                      >
                        Start
                      </button>
                    )}
                    {status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => void setModuleStatus(module, "completed")}
                        disabled={busyId === module.id}
                        className="min-h-11 rounded-full bg-black/5 px-4 py-2 text-xs text-foreground hover:bg-black/10 dark:bg-white/[0.09] dark:hover:bg-white/[0.14]"
                      >
                        Mark complete
                      </button>
                    )}
                    {status === "completed" && (
                      <span className="self-center text-xs text-emerald-600 dark:text-emerald-300">
                        Completed
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-10 flex flex-wrap gap-4 border-t border-border pt-6">
        <Link href="/programmes" className="text-xs font-medium text-[var(--accent)] hover:underline">
          Explore Programmes <ArrowUpRight size={12} className="ml-1 inline" />
        </Link>
        <p className="text-xs text-muted-foreground">
          Your completed stages are saved automatically to your TGL student account.
        </p>
      </div>
    </div>
  );
}
