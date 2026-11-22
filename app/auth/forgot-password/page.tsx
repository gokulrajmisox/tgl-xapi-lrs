import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Forgot Password — Touch Grass Later",
  description:
    "Request a secure Firebase Authentication password reset email for your Touch Grass Later student account.",
};

export default function ForgotPasswordPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24 text-foreground"><AuthForm mode="forgot-password" /></main>;
}
