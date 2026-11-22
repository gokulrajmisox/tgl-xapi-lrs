import Link from "next/link";
import { redirect } from "next/navigation";
import { isPrivilegedStaffEmail } from "@/lib/auth/access";
import { resolveCurrentActor } from "@/lib/certifications/store";

export const metadata = {
  title: "Admin: Payments, Certificates & Email — Touch Grass Later",
  description: "Manage INR certification prices, Razorpay orders/refunds, approvals, revocations, and test emails.",
};

export default async function AdminCertificationsPage() {
  const { user, configured } = await resolveCurrentActor();

  if (configured && !user) {
    redirect("/auth/login?next=/admin?section=payments");
  }

  if (configured && (!user || user.role !== "admin" || !isPrivilegedStaffEmail(user.email))) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="tgl-glass max-w-lg rounded-2xl p-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">TGL / Admin</p>
          <h1 className="mt-4 text-3xl font-medium tracking-[-0.06em]">
            Administrator claim required.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This account does not hold the Firebase Authentication server-verified claim{" "}
            <code className="text-[var(--accent)]">role=admin</code>.
          </p>
          <Link href="/learn" className="mt-6 inline-flex text-xs text-[var(--accent)] underline underline-offset-4">
            Return to My Learning
          </Link>
        </section>
      </main>
    );
  }

  redirect("/admin?section=payments");
}
