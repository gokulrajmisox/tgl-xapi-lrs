import type { Metadata } from "next";
import { AuthActionClient } from "@/components/auth-action-client";

export const metadata: Metadata = {
  title: "Account Verification — Touch Grass Later",
  description:
    "Verify your student email address or complete a Firebase Authentication password reset for Touch Grass Later.",
};

export default function AuthActionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24 text-foreground">
      <AuthActionClient />
    </main>
  );
}
