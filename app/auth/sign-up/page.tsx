import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24 text-foreground"><AuthForm mode="sign-up" /></main>;
}
