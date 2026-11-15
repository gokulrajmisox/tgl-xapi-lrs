import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { ProfileClient } from "@/components/profile-client";
import { isSupabaseConfigured, resolveCurrentActor } from "@/lib/certifications/store";

export const metadata = {
  title: "Profile & Appearance — Touch Grass Later",
  description:
    "Manage your verified certificate display name, account details, and Light or Dark theme.",
};

export default async function ProfilePage() {
  const configured = isSupabaseConfigured();
  const { user } = await resolveCurrentActor();

  if (configured && !user) {
    redirect("/auth/login?next=/profile");
  }

  return (
    <RoleShell
      role={user?.role === "admin" ? "admin" : "student"}
      title="Profile & Settings"
      subtitle="Verify your certificate name, inspect account permissions, and switch between Light Glassmorphism and Dark studio themes."
      primaryAction={{ label: "My Learning", href: "/learn" }}
    >
      <ProfileClient
        initialName={user?.name ?? "Aarav Sharma"}
        email={user?.email ?? "aarav.sharma@example.edu"}
        role={user?.role ?? "student"}
        isSandbox={!configured}
      />
    </RoleShell>
  );
}
