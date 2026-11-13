"use client";

import { useState } from "react";
import { Copy, ShieldCheck, Unplug } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Device = { id: string; device_name: string; last_seen_at: string | null; consented_at: string; revoked_at: string | null };

export function CompanionControls({ initialDevices }: { initialDevices: Device[] }) {
  const [devices, setDevices] = useState(initialDevices);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const createCode = async () => {
    setBusy(true); setMessage(""); setCode("");
    try {
      const response = await fetch("/api/extension/pair-code", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create code.");
      setCode(result.code);
      setMessage("Use this one-time code in the TGL Learning Companion within five minutes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create a code.");
    } finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("browser_extension_devices").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) setMessage("Could not disconnect this device. Please retry.");
    else setDevices((current) => current.map((device) => device.id === id ? { ...device, revoked_at: new Date().toISOString() } : device));
    setBusy(false);
  };
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setMessage("Pairing code copied. It expires in five minutes."); }
    catch { setMessage("Select and copy the code manually."); }
  };

  return <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full border border-[#b9a9d6]/20 bg-[#b9a9d6]/10 text-[#cdbfe3]"><ShieldCheck size={16}/></span><div><p className="text-[9px] uppercase tracking-[0.18em] text-white/40">Privacy controls</p><h2 className="mt-1 text-lg font-medium tracking-[-0.04em]">Learning Companion</h2></div></div><p className="mt-4 text-xs leading-5 text-white/45">Optional active-time tracking. It only reports on TGL-enabled learning domains and never records page content. Activity time is not course completion.</p><button type="button" onClick={createCode} disabled={busy} className="mt-5 rounded-full bg-[#f4f3ef] px-4 py-2.5 text-xs font-medium text-[#111] disabled:opacity-50">{busy ? "Please wait…" : "Generate one-time pairing code"}</button>{code && <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><code className="truncate text-xs text-[#d7cbea]">{code}</code><button type="button" onClick={copyCode} className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-white/70" aria-label="Copy pairing code"><Copy size={14}/></button></div>}{message && <p role="status" className="mt-3 text-[10px] text-white/55">{message}</p>}
    <div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs font-medium text-white/75">Connected browsers</p>{devices.length ? <ul className="mt-3 flex flex-col gap-2">{devices.map((device) => <li key={device.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-3"><div><p className="text-xs text-white/75">{device.device_name}</p><p className="mt-1 text-[9px] text-white/35">{device.revoked_at ? "Disconnected" : device.last_seen_at ? `Last active ${new Date(device.last_seen_at).toLocaleString()}` : "Connected · no activity yet"}</p></div>{!device.revoked_at && <button type="button" disabled={busy} onClick={() => revoke(device.id)} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] text-white/60 hover:border-rose-300/30 hover:text-rose-200"><Unplug size={13}/> Disconnect</button>}</li>)}</ul> : <p className="mt-3 text-[10px] text-white/35">No browser is paired.</p>}</div>
  </section>;
}
