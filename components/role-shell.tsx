"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  Briefcase,
  Compass,
  FolderGit2,
  Home,
  LayoutGrid,
  Menu,
  MessageSquare,
  Network,
  Shield,
  Users,
  X,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export type AppRole = "student" | "mentor" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
};

const STUDENT_NAV: NavItem[] = [
  { label: "My Learning", href: "/learn", icon: Home },
  { label: "Explore Programmes", href: "/programmes", icon: BookOpen },
  { label: "Projects", href: "/explore", icon: FolderGit2 },
  { label: "Internships", href: "/internships", icon: Briefcase },
  { label: "Certificates", href: "/certificates", icon: Award },
  { label: "Achievements", href: "/learn/portfolio", icon: Compass },
  { label: "Course Map", href: "/learn/map", icon: Network },
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
    if (clean === "/learn" && pathname === "/learn") return true;
    if (clean === "/mentor" && pathname === "/mentor") return true;
    if (clean === "/admin" && pathname === "/admin") return true;
    if (clean !== "/learn" && clean !== "/mentor" && clean !== "/admin") {
      return pathname.startsWith(clean);
    }
    return false;
  };

  const roleSwitchLinks: Array<{ id: AppRole; label: string; href: string }> = [
    { id: "student", label: "Student", href: "/learn" },
    { id: "mentor", label: "Mentor", href: "/mentor" },
    { id: "admin", label: "Admin", href: "/admin" },
  ];

  return (
    <div className="min-h-screen bg-[#090909] text-[#f4f3ef]">
      {/* Desktop Persistent Role-Aware Sidebar */}
      <aside
        aria-label="Workspace navigation"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-white/10 bg-[#0d0d0d] px-4 pt-6 pb-16 lg:flex"
      >
        <div className="space-y-6">
          <Link
            href="/"
            className="flex items-center gap-3 px-2 whitespace-nowrap shrink-0"
            aria-label="Touch Grass Later home"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/25 text-[10px] font-semibold tracking-[-0.08em] text-white">
              TG
            </span>
            <span className="text-[11px] font-semibold tracking-[0.17em] text-white">
              TOUCH GRASS LATER
            </span>
          </Link>

          <div className="border-t border-white/10 pt-5">
            <p className="px-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
              Role workspace
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
              {roleSwitchLinks.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`rounded-lg py-1.5 text-center text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    role === item.id
                      ? "bg-[#f4f3ef] text-[#111111]"
                      : "text-white/55 hover:text-white"
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
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? "bg-white/[0.08] text-[#f4f3ef]"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon
                    size={15}
                    className={active ? "text-[#b9a9d6]" : "text-white/45"}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-1 border-t border-white/10 pt-4 text-xs">
          <Link
            href={role === "mentor" ? "/mentor" : role === "admin" ? "/admin" : "/learn"}
            className="flex min-h-11 items-center rounded-xl px-3 py-2 text-white/80 hover:bg-white/[0.04] hover:text-white"
          >
            Dashboard
          </Link>
          <div className="flex min-h-11 items-center px-3 py-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Mobile Compact Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-[#0d0d0d]/95 px-4 backdrop-blur-md lg:hidden">
        <Link href="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <span className="grid size-7 place-items-center rounded-full border border-white/25 text-[10px] font-semibold">
            TG
          </span>
          <span className="text-[11px] font-semibold tracking-[0.15em]">TGL</span>
        </Link>
        <span className="text-xs font-medium capitalize text-[#b9a9d6]">
          {role} home
        </span>
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? "Close workspace menu" : "Open workspace menu"}
          aria-expanded={drawerOpen}
          className="grid size-11 place-items-center rounded-full border border-white/15 text-white"
        >
          {drawerOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation drawer"
          className="fixed inset-x-0 top-14 bottom-14 z-40 overflow-y-auto border-b border-white/10 bg-[#111111] p-4 lg:hidden"
        >
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
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
                    ? "border-[#f4f3ef] bg-[#f4f3ef] text-[#111111]"
                    : "border-white/10 text-white/70"
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
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/80 hover:bg-white/[0.06]"
                >
                  <Icon size={16} className="text-[#b9a9d6]" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <div className="lg:pl-64">
        <div className="hidden items-center justify-between gap-6 border-b border-white/10 px-8 py-5 lg:flex">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-medium tracking-[-0.03em] text-[#f4f3ef]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-white/45">{subtitle}</p>
            )}
          </div>
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className="rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] transition-colors hover:bg-white whitespace-nowrap shrink-0"
            >
              {primaryAction.label}
            </Link>
          )}
        </div>

        <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
          <div className="mb-6 lg:hidden">
            <h1 className="text-2xl font-medium tracking-[-0.04em]">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-white/50">{subtitle}</p>
            )}
          </div>
          {children}
        </main>
      </div>

      {/* Compact Mobile Bottom Nav Bar */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-4 border-t border-white/10 bg-[#0d0d0d]/95 backdrop-blur-md lg:hidden"
      >
        <Link
          href={role === "mentor" ? "/mentor" : role === "admin" ? "/admin" : "/learn"}
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] text-white/80 hover:text-white"
        >
          <Home size={16} aria-hidden="true" />
          <span>Home</span>
        </Link>
        <Link
          href="/programmes"
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] text-white/80 hover:text-white"
        >
          <BookOpen size={16} aria-hidden="true" />
          <span>Programmes</span>
        </Link>
        <Link
          href={role === "mentor" ? "/explore" : "/internships"}
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] text-white/80 hover:text-white"
        >
          <Briefcase size={16} aria-hidden="true" />
          <span>{role === "mentor" ? "Projects" : "Internships"}</span>
        </Link>
        <Link
          href="/certificates"
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] text-white/80 hover:text-white"
        >
          <Award size={16} aria-hidden="true" />
          <span>Certificates</span>
        </Link>
      </nav>
    </div>
  );
}
