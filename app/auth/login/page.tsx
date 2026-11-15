import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24 text-foreground"><AuthForm mode="login" /></main>;
}
