"use client";

import { useState } from "react";

type Status = "not_started" | "in_progress" | "completed";
export function ResourceProgressControl({
  resourceId,
  initialStatus = "not_started",
}: {
  resourceId: string;
  initialStatus?: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const changeStatus = async (next: Status) => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/learning-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_resource_status", resourceId, status: next }),
      });
      if (res.status === 401) {
        window.location.assign("/auth/login?next=/learning-hub");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Progress not saved. Sign in and try again.");
      } else {
        setStatus(next);
        setMessage("Progress saved.");
      }
    } catch {
      setMessage("Progress not saved. Sign in and try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`resource-status-${resourceId}`}>
        Your learning status
      </label>
      <select
        id={`resource-status-${resourceId}`}
        value={status}
        disabled={busy}
        onChange={(event) => void changeStatus(event.target.value as Status)}
        className="min-h-11 rounded-full border border-border bg-input px-4 text-xs text-foreground"
      >
        <option value="not_started">Not started</option>
        <option value="in_progress">In progress</option>
        <option value="completed">Completed</option>
      </select>
      {message && (
        <span role="status" className="text-xs text-[var(--accent)]">
          {message}
        </span>
      )}
    </div>
  );
}
