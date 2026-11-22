"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutStudent } from "@/lib/firebase/client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const signOut = async () => {
    setBusy(true);
    try {
      await logoutStudent();
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void signOut()}
      className="text-left text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
