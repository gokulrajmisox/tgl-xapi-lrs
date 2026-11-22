import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Reset Password — Touch Grass Later",
  description:
    "Choose a new password for your Touch Grass Later student account using your verified reset link.",
};

export default function ResetPasswordPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24 text-foreground"><AuthForm mode="reset-password" /></main>;
}
