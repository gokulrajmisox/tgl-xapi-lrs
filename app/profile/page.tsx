import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { ProfileClient } from "@/components/profile-client";
import { resolveCurrentActor } from "@/lib/certifications/store";

export const metadata = {
  title: "Profile & Appearance — Touch Grass Later",
  description:
    "Manage your verified certificate display name, account details, and Light or Dark theme.",
};

export default async function ProfilePage() {
  const { user, configured } = await resolveCurrentActor();

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
        uid={user?.id ?? ""}
        initialName={user?.name ?? ""}
        email={user?.email ?? ""}
        role={user?.role ?? "student"}
        isSandbox={Boolean(user?.isSandbox)}
      />
    </RoleShell>
  );
}
