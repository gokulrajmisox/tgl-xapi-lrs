"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  Compass,
  GraduationCap,
  Home,
  LayoutGrid,
  Menu,
  MessageSquare,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

export type AppRole = "student" | "mentor" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
};

const STUDENT_NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/programmes", icon: BookOpen },
  { label: "My Learning", href: "/learn", icon: GraduationCap },
  { label: "Certificates", href: "/certificates", icon: Award },
  { label: "Profile", href: "/profile", icon: User },
];

const MENTOR_NAV: NavItem[] = [
  { label: "Review Queue", href: "/mentor", icon: MessageSquare },
  { label: "Assigned Learners", href: "/mentor#learners", icon: Users },
  { label: "Explore Programmes", href: "/programmes", icon: BookOpen },
  { label: "Projects", href: "/explore", icon: Compass },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Admin Home", href: "/admin", icon: Shield },
  { label: "Programmes & Pricing", href: "/admin?section=courses", icon: BookOpen },
  { label: "Payments & Certs", href: "/admin?section=payments", icon: Award },
  { label: "Email Testing", href: "/admin?section=emails", icon: MessageSquare },
  { label: "Programme Catalog", href: "/programmes", icon: LayoutGrid },
];

export function RoleShell({
  role,
  title,
  subtitle,
  primaryAction,
  children,
}: {
  role: AppRole;
  title: string;
  subtitle?: string;
  primaryAction?: { label: string; href: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems =
    role === "mentor" ? MENTOR_NAV : role === "admin" ? ADMIN_NAV : STUDENT_NAV;

  const isActive = (href: string) => {
    const clean = href.split("#")[0].split("?")[0];
    if (clean === "/") return pathname === "/";
    if (clean === "/learn" && pathname === "/learn") return true;
    if (clean === "/mentor" && pathname === "/mentor") return true;
    if (clean === "/admin" && pathname === "/admin") return true;
    if (clean !== "/learn" && clean !== "/mentor" && clean !== "/admin") {
      return pathname === clean || pathname.startsWith(`${clean}/`);
    }
    return false;
  };

  const roleSwitchLinks: Array<{ id: AppRole; label: string; href: string }> = [
    { id: "student", label: "Student", href: "/learn" },
    { id: "mentor", label: "Mentor", href: "/mentor" },
    { id: "admin", label: "Admin", href: "/admin" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Persistent Role-Aware Sidebar */}
      <aside
        aria-label="Workspace navigation"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar px-4 pt-6 pb-8 backdrop-blur-xl lg:flex"
      >
        <div className="space-y-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 px-2 whitespace-nowrap"
            aria-label="Touch Grass Later home"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-foreground/20 text-[10px] font-semibold tracking-[-0.08em] text-foreground">
              TG
            </span>
            <span className="text-[11px] font-semibold tracking-[0.17em] text-foreground">
              TOUCH GRASS LATER
            </span>
          </Link>

          <div className="border-t border-sidebar-border pt-5">
            <p className="px-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Role workspace
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background/60 p-1">
              {roleSwitchLinks.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`shrink-0 whitespace-nowrap rounded-lg py-1.5 text-center text-[11px] font-medium transition-colors ${
                    role === item.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <nav aria-label={`${role} menu`} className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                  }`}
                >
                  <Icon
                    size={15}
                    className={active ? "text-accent" : "text-muted-foreground"}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-sidebar-border pt-4 text-xs">
          <div>
            <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Theme
            </p>
            <ThemeSwitcher variant="segmented" />
          </div>
          <div className="flex min-h-10 items-center justify-between px-2 py-1">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Mobile Compact Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-sidebar/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          <span className="grid size-7 place-items-center rounded-full border border-foreground/20 text-[10px] font-semibold">
            TG
          </span>
          <span className="text-[11px] font-semibold tracking-[0.15em]">TGL</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitcher variant="compact" />
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? "Close workspace menu" : "Open workspace menu"}
            aria-expanded={drawerOpen}
            className="grid size-10 place-items-center rounded-full border border-border text-foreground"
          >
            {drawerOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation drawer"
          className="tgl-glass-strong fixed inset-x-0 top-14 bottom-14 z-40 overflow-y-auto border-b border-border p-4 lg:hidden"
        >
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Switch role
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {roleSwitchLinks.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`rounded-xl border py-2.5 text-center text-xs font-medium ${
                  role === item.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/75"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-foreground/85 hover:bg-foreground/[0.05]"
                >
                  <Icon size={16} className="text-accent" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Appearance
            </p>
            <ThemeSwitcher variant="segmented" />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="lg:pl-64">
        <div className="hidden items-center justify-between gap-6 border-b border-border bg-background/60 px-8 py-5 backdrop-blur-md lg:flex">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className="shrink-0 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {primaryAction.label}
            </Link>
          )}
        </div>

        <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
          <div className="mb-6 lg:hidden">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {children}
        </main>
      </div>

      {/* Compact Mobile Bottom Nav Bar */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-4 border-t border-border bg-sidebar/95 backdrop-blur-xl lg:hidden"
      >
        <Link
          href={role === "mentor" ? "/mentor" : role === "admin" ? "/admin" : "/learn"}
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] text-foreground/80 hover:text-foreground"
        >
          <GraduationCap size={16} aria-hidden="true" />
          <span>{role === "student" ? "My Learning" : "Home"}</span>
        </Link>
        <Link
          href="/programmes"
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] text-foreground/80 hover:text-foreground"
        >
          <BookOpen size={16} aria-hidden="true" />
          <span>Explore</span>
        </Link>
        <Link
          href="/certificates"
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] text-foreground/80 hover:text-foreground"
        >
          <Award size={16} aria-hidden="true" />
          <span>Certificates</span>
        </Link>
        <Link
          href="/profile"
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] text-foreground/80 hover:text-foreground"
        >
          <User size={16} aria-hidden="true" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
