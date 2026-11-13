"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const signOut = async () => {
    setBusy(true);
    const { error } = await createClient().auth.signOut();
    if (!error) { router.push("/"); router.refresh(); }
    else setBusy(false);
  };
  return <button type="button" disabled={busy} onClick={signOut} className="text-left text-xs text-white/50 hover:text-white disabled:opacity-50">{busy ? "Signing out…" : "Sign out"}</button>;
}
