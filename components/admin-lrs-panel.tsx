"use client";

import { useState } from "react";
import { Copy, KeyRound, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

type Credential = { id: string; credential_name: string; credential_key: string; scopes: string[]; expires_at: string | null; revoked_at: string | null; created_at: string; last_used_at: string | null };
type Registration = { id: string; name: string; provider_type: string; source_identifier: string; description: string; enabled: boolean; scopes: string[]; allowed_origins: string[]; actor_mapping_policy: string; created_at: string; last_used_at: string | null; credentials: Credential[] };
type Unmatched = { id: string; registration_id: string; statement_id: string; actor_hash: string; actor_json: Record<string, unknown>; created_at: string };
const scopeOptions = ["statements.read", "statements.write", "statements.void", "documents.read", "documents.write", "agents.read", "activities.read"];

export function AdminLrsPanel({ initialRegistrations, initialUnmatched, endpoint }: { initialRegistrations: Registration[]; initialUnmatched: Unmatched[]; endpoint: string }) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [unmatched, setUnmatched] = useState(initialUnmatched);
  const [regScopes, setRegScopes] = useState(scopeOptions.filter((scope) => scope !== "statements.void"));
  const [credentialScopes, setCredentialScopes] = useState(scopeOptions.filter((scope) => scope !== "statements.void"));
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [secret, setSecret] = useState("");
  const [credentialKey, setCredentialKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [studentIds, setStudentIds] = useState<Record<string, string>>({});
  const [proofs, setProofs] = useState<Record<string, string>>({});

  const refresh = async () => {
    const [registrationsResponse, actorsResponse] = await Promise.all([fetch("/api/admin/lrs/registrations", { cache: "no-store" }), fetch("/api/admin/lrs/actors", { cache: "no-store" })]);
    const registrationsResult = await registrationsResponse.json();
    const actorsResult = await actorsResponse.json();
    if (registrationsResponse.ok) setRegistrations(registrationsResult.registrations ?? []);
    if (actorsResponse.ok) setUnmatched(actorsResult.unmatched ?? []);
  };
  const toggleRegistration = async (registration: Registration) => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/lrs/registrations/${registration.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !registration.enabled }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update provider.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unexpected error."); }
    finally { setBusy(false); }
  };
  const submitRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setSecret(""); setCredentialKey("");
    const form = new FormData(event.currentTarget);
    const allowedOrigins = String(form.get("allowedOrigins") ?? "").split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    try {
      const response = await fetch("/api/admin/lrs/registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), providerType: form.get("providerType"), sourceIdentifier: form.get("sourceIdentifier"), actorMappingPolicy: form.get("actorMappingPolicy"), description: form.get("description"), enabled, allowedOrigins, scopes: regScopes, credentialName: form.get("credentialName"), credentialScopes }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create provider.");
      setSecret(result.secret); setCredentialKey(result.credential.credential_key); await refresh(); (event.currentTarget as HTMLFormElement).reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unexpected error."); }
    finally { setBusy(false); }
  };
  const rotate = async (credential: Credential) => {
    if (!window.confirm(`Rotate “${credential.credential_name}”? The old credential will be revoked.`)) return;
    setBusy(true); setError(""); setSecret(""); setCredentialKey("");
    try {
      const response = await fetch(`/api/admin/lrs/credentials/${credential.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not rotate credential.");
      setSecret(result.secret); setCredentialKey(result.credential.credential_key); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unexpected error."); }
    finally { setBusy(false); }
  };
  const revoke = async (credential: Credential) => {
    if (!window.confirm(`Revoke “${credential.credential_name}”? This cannot be undone.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/lrs/credentials/${credential.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not revoke credential.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unexpected error."); }
    finally { setBusy(false); }
  };
  const mapActor = async (item: Unmatched) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/lrs/actors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registrationId: item.registration_id, userId: studentIds[item.id], actor: item.actor_json, verificationMethod: proofs[item.id] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not map actor.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unexpected error."); }
    finally { setBusy(false); }
  };
  const copySecret = async () => { await navigator.clipboard.writeText(`Basic ${btoa(`${credentialKey}:${secret}`)}`); setCopied(true); };

  return <div className="mx-auto max-w-[1180px] px-6 pb-24 pt-36 text-[#f4f3ef] md:px-12 md:pt-44">
    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">LRS / administration</p><h1 className="mt-5 text-5xl font-medium tracking-[-0.08em]">Connected learning<br/><span className="font-serif font-normal italic text-[#b9a9d6]">providers.</span></h1><p className="mt-5 max-w-2xl text-sm leading-6 text-white/50">Create scoped provider registrations and review unmatched xAPI actors. Credentials are shown once and never stored in plaintext.</p>
    {error && <p role="alert" className="mt-6 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-xs text-rose-200">{error}</p>}
    {secret && <section className="mt-7 rounded-2xl border border-amber-200/20 bg-amber-100/[0.04] p-5"><p className="flex items-center gap-2 text-xs font-medium text-amber-100"><KeyRound size={14}/> Copy this credential now</p><p className="mt-2 text-[10px] leading-5 text-white/50">It is shown once only. Configure the provider to send to {endpoint}; do not share it with students.</p><code className="mt-3 block break-all rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-[#d9cdee]">{`Basic ${btoa(`${credentialKey}:${secret}`)}`}</code><button type="button" onClick={copySecret} className="mt-3 flex items-center gap-2 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111]"><Copy size={13}/>{copied ? "Copied" : "Copy Basic header"}</button></section>}
    <section className="mt-10 grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><form onSubmit={submitRegistration} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><p className="text-[9px] uppercase tracking-[0.18em] text-white/40">New provider</p><div className="mt-5 grid gap-3"><label className="text-[10px] text-white/55">Provider name<input name="name" required maxLength={120} className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white" /></label><label className="text-[10px] text-white/55">Provider type<input name="providerType" required placeholder="LMS, course platform…" maxLength={80} className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white" /></label><label className="text-[10px] text-white/55">Authorized source identifier<input name="sourceIdentifier" required maxLength={256} placeholder="https://provider.example/lrs or urn:provider:source" className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white" /></label><label className="text-[10px] text-white/55">Actor mapping policy<select name="actorMappingPolicy" defaultValue="manual" className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"><option value="manual">Administrator review</option><option value="verified-link-only">One-time student challenge</option></select></label><label className="text-[10px] text-white/55">Description<textarea name="description" rows={2} maxLength={2000} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" /></label><label className="text-[10px] text-white/55">Allowed browser origins (one origin per line)<textarea name="allowedOrigins" rows={2} placeholder="https://lms.example.org" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" /></label></div><label className="mt-4 flex items-center gap-2 text-[10px] text-white/55"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Enable this registration immediately</label><div className="mt-5 grid gap-3 sm:grid-cols-2"><fieldset className="rounded-xl border border-white/10 p-3"><legend className="px-1 text-[10px] text-white/55">Provider scopes</legend>{scopeOptions.map((scope) => <label key={scope} className="mt-2 flex items-center gap-2 text-[9px] text-white/60"><input type="checkbox" checked={regScopes.includes(scope)} onChange={(event) => setRegScopes((current) => event.target.checked ? [...current, scope] : current.filter((item) => item !== scope))} />{scope}</label>)}</fieldset><fieldset className="rounded-xl border border-white/10 p-3"><legend className="px-1 text-[10px] text-white/55">Initial credential scopes</legend>{scopeOptions.map((scope) => <label key={scope} className="mt-2 flex items-center gap-2 text-[9px] text-white/60"><input type="checkbox" checked={credentialScopes.includes(scope)} onChange={(event) => setCredentialScopes((current) => event.target.checked ? [...current, scope] : current.filter((item) => item !== scope))} />{scope}</label>)}</fieldset></div><label className="mt-4 block text-[10px] text-white/55">Credential label<input name="credentialName" required defaultValue="Initial credential" className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white" /></label><button type="submit" disabled={busy} className="mt-5 w-full rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111] disabled:opacity-50">{busy ? "Working…" : "Create registration and credential"}</button></form>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[9px] uppercase tracking-[0.18em] text-white/40">Registered providers</p><h2 className="mt-1 text-lg font-medium tracking-[-0.04em]">Provider credentials</h2></div><button type="button" onClick={() => void refresh()} aria-label="Refresh providers" className="grid size-9 place-items-center rounded-full border border-white/10 text-white/60"><RefreshCw size={14}/></button></div><div className="mt-5 flex flex-col gap-3">{registrations.map((registration) => <article key={registration.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-medium">{registration.name}</h3><p className="mt-1 text-[10px] text-white/40">{registration.provider_type} · {registration.enabled ? "Enabled" : "Disabled"} · {registration.allowed_origins.length} CORS origin(s)</p><p className="mt-1 break-all font-mono text-[9px] text-white/30">Source: {registration.source_identifier}</p></div><button type="button" disabled={busy} onClick={() => void toggleRegistration(registration)} className={`rounded-full border px-2.5 py-1.5 text-[9px] ${registration.enabled ? "border-[#b9a9d6]/30 text-[#d3c7e5]" : "border-white/10 text-white/50"}`}>{registration.enabled ? "Disable provider" : "Enable provider"}</button></div><p className="mt-2 text-[9px] text-white/35">Scopes: {registration.scopes.join(", ")}</p><div className="mt-3 flex flex-col gap-2">{registration.credentials.map((credential) => <div key={credential.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.035] p-3"><div><p className="text-[10px] text-white/70">{credential.credential_name} · {credential.revoked_at ? "Revoked" : credential.expires_at && Date.parse(credential.expires_at) < Date.now() ? "Expired" : "Active"}</p><p className="mt-1 font-mono text-[9px] text-white/35">Key {credential.credential_key.slice(0, 10)}… · {credential.scopes.length} scope(s)</p></div>{!credential.revoked_at && <div className="flex gap-2"><button type="button" onClick={() => void rotate(credential)} className="rounded-full border border-white/10 px-3 py-2 text-[9px] text-white/55">Rotate</button><button type="button" onClick={() => void revoke(credential)} aria-label={`Revoke ${credential.credential_name}`} className="grid size-8 place-items-center rounded-full border border-white/10 text-white/50"><XCircle size={14}/></button></div>}</div>)}</div></article>)}{registrations.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-6 text-xs text-white/40">No provider registrations have been created.</p>}</div></section></section>
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#b9a9d6]"/><div><p className="text-[9px] uppercase tracking-[0.18em] text-white/40">Actor identity review</p><h2 className="mt-1 text-lg font-medium tracking-[-0.04em]">Unmatched statements</h2></div></div><p className="mt-2 text-xs leading-5 text-white/45">Statements are never attached to a student by name or email similarity. Map an actor only after verifying control through an authorized provider process.</p><div className="mt-5 flex flex-col gap-3">{unmatched.map((item) => <article key={item.id} className="grid gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 lg:grid-cols-[1fr_.8fr]"><div><p className="text-[10px] text-white/45">Statement {item.statement_id}</p><pre className="mt-2 overflow-auto rounded-lg bg-black/25 p-3 text-[9px] text-[#d4c8e6]">{JSON.stringify(item.actor_json, null, 2)}</pre></div><div className="flex flex-col gap-2"><label className="text-[10px] text-white/50">Verified TGL student UUID<input value={studentIds[item.id] ?? ""} onChange={(event) => setStudentIds((state) => ({ ...state, [item.id]: event.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white" /></label><label className="text-[10px] text-white/50">Verification method / evidence note<input value={proofs[item.id] ?? ""} onChange={(event) => setProofs((state) => ({ ...state, [item.id]: event.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white" /></label><button type="button" disabled={busy || !studentIds[item.id] || !proofs[item.id]} onClick={() => void mapActor(item)} className="mt-1 rounded-full border border-white/15 px-4 py-2 text-[10px] text-white/70 disabled:opacity-40">Verify and map actor</button></div></article>)}{unmatched.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-6 text-xs text-white/40">No unmatched xAPI statements.</p>}</div></section>
  </div>;
}
