import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { AdminCertificationsPanel } from "@/components/admin-certifications-panel";
import { isSupabaseConfigured, resolveCurrentActor } from "@/lib/certifications/store";

export const metadata = {
  title: "Admin: Payments, Certificates & Email — Touch Grass Later",
  description: "Manage INR certification prices, Razorpay orders/refunds, approvals, revocations, and test emails.",
};

export default async function AdminCertificationsPage() {
  const configured = isSupabaseConfigured();
  const { user } = await resolveCurrentActor({ allowSandboxAdmin: !configured });

  if (configured && !user) {
    redirect("/auth/login?next=/admin/certifications");
  }

  if (configured && user?.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-[#f4f3ef]">
        <section className="max-w-lg rounded-2xl border border-white/10 bg-white/[0.025] p-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">TGL / Admin</p>
          <h1 className="mt-4 text-3xl font-medium tracking-[-0.06em]">
            Administrator claim required.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/50">
            This account does not hold the server-managed Supabase app metadata claim{" "}
            <code className="text-[#cbbde0]">role=admin</code>.
          </p>
          <Link href="/" className="mt-6 inline-flex text-xs text-white/70 underline underline-offset-4">
            Return to TGL
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909]">
      <Header />
      <AdminCertificationsPanel isSandbox={!configured} />
    </main>
  );
}
