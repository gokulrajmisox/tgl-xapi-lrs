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
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="tgl-glass max-w-lg rounded-2xl p-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">TGL / Admin</p>
          <h1 className="mt-4 text-3xl font-medium tracking-[-0.06em]">
            Administrator claim required.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This account does not hold the server-managed Supabase app metadata claim{" "}
            <code className="text-[var(--accent)]">role=admin</code>.
          </p>
          <Link href="/" className="mt-6 inline-flex text-xs text-[var(--accent)] underline underline-offset-4">
            Return to TGL
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <AdminCertificationsPanel isSandbox={!configured} />
    </main>
  );
}
