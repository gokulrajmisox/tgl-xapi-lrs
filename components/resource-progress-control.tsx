"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "not_started" | "in_progress" | "completed";
export function ResourceProgressControl({ resourceId, initialStatus = "not_started" }: { resourceId: string; initialStatus?: Status }) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const changeStatus = async (next: Status) => {
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.assign("/auth/login?next=/learning-hub"); return; }
    const completedAt = next === "completed" ? new Date().toISOString() : null;
    const { error } = await supabase.from("learning_resource_progress").upsert({ student_id: user.id, resource_id: resourceId, status: next, completed_at: completedAt, updated_at: new Date().toISOString() }, { onConflict: "student_id,resource_id" });
    if (error) setMessage("Progress not saved. Sign in and try again.");
    else {
      setStatus(next);
      setMessage("Progress saved.");
    }
    setBusy(false);
  };
  return <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`resource-status-${resourceId}`}>Your learning status</label><select id={`resource-status-${resourceId}`} value={status} disabled={busy} onChange={(event) => void changeStatus(event.target.value as Status)} className="min-h-11 rounded-full border border-border bg-input px-4 text-xs text-foreground"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>{message && <span role="status" className="text-xs text-[var(--accent)]">{message}</span>}</div>;
}
