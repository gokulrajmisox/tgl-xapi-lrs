"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Circle, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Module = { id: string; title: string; description: string; sort_order: number; estimated_minutes: number | null };
type Progress = { module_id: string; status: "not_started" | "in_progress" | "completed"; completed_at: string | null };

export function LearningPathwayWorkspace({ pathId, modules, initialProgress, enrolled, signedIn }: { pathId: string; modules: Module[]; initialProgress: Progress[]; enrolled: boolean; signedIn: boolean }) {
  const [isEnrolled, setIsEnrolled] = useState(enrolled);
  const [progress, setProgress] = useState<Record<string, Progress>>(Object.fromEntries(initialProgress.map((item) => [item.module_id, item])));
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const completeCount = Object.values(progress).filter((item) => item.status === "completed").length;
  const percentage = modules.length ? Math.round((completeCount / modules.length) * 100) : 0;

  const enroll = async () => {
    setBusyId("enroll"); setMessage("");
    const client = createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.assign("/auth/login?next=/dashboard/learning"); return; }
    const { error } = await client.from("student_enrollments").insert({ student_id: user.id, learning_path_id: pathId });
    if (error && error.code !== "23505") setMessage("Could not enroll right now. Please try again.");
    else { setIsEnrolled(true); setMessage("You’re enrolled. Your progress will be saved to your account."); }
    setBusyId("");
  };

  const setModuleStatus = async (module: Module, status: "in_progress" | "completed") => {
    setBusyId(module.id); setMessage("");
    const client = createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.assign("/auth/login"); return; }
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    const { error } = await client.from("lesson_progress").upsert({ student_id: user.id, module_id: module.id, status, completed_at: completedAt, last_opened_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "student_id,module_id" });
    if (error) setMessage("Progress could not be saved. Make sure you’re enrolled in this pathway.");
    else {
      setProgress((current) => ({ ...current, [module.id]: { module_id: module.id, status, completed_at: completedAt } }));
      const recordResponse = await fetch("/api/xapi/native-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "module", id: module.id, status }) });
      if (!recordResponse.ok) setMessage("Progress saved. Its xAPI activity record could not be added this time.");
      else setMessage("Progress saved as a self-reported learning activity.");
    }
    setBusyId("");
  };

  return <div><div className="mb-8 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] uppercase tracking-[0.18em] text-white/40">Your progress</p>{isEnrolled ? <><p className="mt-2 text-2xl font-medium tracking-[-0.05em]">{percentage}% <span className="text-sm font-normal text-white/45">self-reported</span></p><div className="mt-3 h-1.5 w-full max-w-[360px] overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#b9a9d6] transition-all" style={{ width: `${percentage}%` }} /></div><p className="mt-2 text-[10px] text-white/35">{completeCount} of {modules.length} stages manually marked complete</p></> : <p className="mt-2 text-sm text-white/55">Enroll to save your stages and progress.</p>}</div>{!isEnrolled && <button type="button" onClick={enroll} disabled={busyId === "enroll"} className="rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111] disabled:opacity-50">{busyId === "enroll" ? "Saving…" : signedIn ? "Enroll in this path" : "Sign in to enroll"}</button>}</div>
    {message && <p role="status" className="mb-4 text-xs text-[#d1c4e4]">{message}</p>}
    <ol className="border-l border-white/10">{modules.map((module, index) => { const item = progress[module.id]; const status = item?.status ?? "not_started"; return <li key={module.id} className="relative pb-6 pl-7 last:pb-0"><span className={`absolute -left-[9px] top-1 grid size-[17px] place-items-center rounded-full border ${status === "completed" ? "border-[#b9a9d6] bg-[#b9a9d6] text-[#111]" : status === "in_progress" ? "border-[#b9a9d6] text-[#b9a9d6]" : "border-white/20 bg-[#090909] text-white/25"}`}>{status === "completed" ? <Check size={11} /> : status === "in_progress" ? <LoaderCircle size={11} /> : <Circle size={7} />}</span><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-[9px] text-white/35">STAGE {String(index + 1).padStart(2, "0")}{module.estimated_minutes ? ` · ${module.estimated_minutes} MIN` : ""}</p><h2 className="mt-2 text-base font-medium tracking-[-0.03em]">{module.title}</h2><p className="mt-1 max-w-xl text-xs leading-5 text-white/45">{module.description}</p><p className="mt-2 text-[9px] uppercase tracking-[0.12em] text-white/30">{status === "completed" ? "Self-reported complete" : status === "in_progress" ? "In progress" : "Not started"}</p></div>{isEnrolled && <div className="flex shrink-0 gap-2">{status === "not_started" && <button type="button" onClick={() => setModuleStatus(module, "in_progress")} disabled={busyId === module.id} className="rounded-full border border-white/15 px-3 py-2 text-[10px] text-white/65">Start</button>}{status !== "completed" && <button type="button" onClick={() => setModuleStatus(module, "completed")} disabled={busyId === module.id} className="rounded-full bg-white/[0.09] px-3 py-2 text-[10px] text-white/85 hover:bg-white/[0.14]">Mark complete</button>}{status === "completed" && <span className="self-center text-[10px] text-[#cbbce0]">Completed</span>}</div>}</div></li>; })}</ol>
    <div className="mt-10 flex flex-wrap gap-4 border-t border-white/10 pt-6"><Link href="/learning-hub" className="text-xs text-white/55 hover:text-white">All learning resources <ArrowUpRight size={12} className="ml-1 inline" /></Link><p className="text-[10px] text-white/35">External learning completion is not independently verified by TGL. Marking a stage complete is your own progress note.</p></div>
  </div>;
}
