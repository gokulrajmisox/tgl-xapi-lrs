import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create Account — Touch Grass Later",
  description:
    "Create your Touch Grass Later student account to enrol in internship-training programmes and earn QR-verified completion certificates.",
};

export default function SignUpPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24 text-foreground"><AuthForm mode="sign-up" /></main>;
}
