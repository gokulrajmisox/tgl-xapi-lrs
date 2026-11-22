import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign In — Touch Grass Later",
  description:
    "Sign in to Touch Grass Later with Firebase Authentication (Email/Password or Google) to continue your enrolled programmes and internship sprints.",
};

export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24 text-foreground"><AuthForm mode="login" /></main>;
}
