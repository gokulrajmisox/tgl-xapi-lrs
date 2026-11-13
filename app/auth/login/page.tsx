import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[#090909] px-5 py-24 text-[#f4f3ef]"><AuthForm mode="login" /></main>;
}
