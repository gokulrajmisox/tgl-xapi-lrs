"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Compass, Menu, X } from "lucide-react";
import Magnet from "@/components/react-bits/Magnet";
import MenuOptionWheel from "@/components/react-bits/MenuOptionWheel";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { createClient } from "@/lib/supabase/client";

const primaryLinks = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/programmes" },
  { label: "My Learning", href: "/learn" },
  { label: "Certificates", href: "/certificates" },
  { label: "Profile", href: "/profile" },
];

const wheelDestinations = [
  {
    label: "Home",
    href: "/",
    summary: "Overview of Touch Grass Later's unified online learning and guided internship programmes.",
  },
  {
    label: "Explore",
    href: "/programmes",
    summary: "Single-fee internship-training programmes covering modules, projects, internship tasks, and included certificate.",
  },
  {
    label: "My Learning",
    href: "/learn",
    summary: "All enrolled programmes and internships in one Coursera-style workspace with step-by-step progression.",
  },
  {
    label: "Certificates",
    href: "/certificates",
    summary: "Check your eligibility and download your included QR-verified certificate (₹0 extra).",
  },
  {
    label: "Profile",
    href: "/profile",
    summary: "Manage your verified certificate display name, account details, and Light / Dark theme.",
  },
  {
    label: "Mentor Portal",
    href: "/mentor",
    summary: "Review student project submissions, evaluate internship sprint tasks, and respond to questions.",
  },
  {
    label: "Admin Console",
    href: "/admin",
    summary: "Manage bundled programmes, single INR pricing, internship approvals, payments, and test emails.",
  },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wheelIndex, setWheelIndex] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  const selectedDestination = wheelDestinations[wheelIndex] ?? wheelDestinations[0];

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const client = createClient();
    void client.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    if (typeof client.auth?.onAuthStateChange !== "function") return;
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="tgl-nav fixed inset-x-0 top-0 z-50 px-4 pt-3.5 md:px-8">
      <div className="tgl-glass-strong mx-auto flex max-w-[1440px] items-center justify-between gap-2 rounded-2xl px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5 md:px-6">
        <Magnet padding={48} magnetStrength={4} maxOffset={6}>
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 whitespace-nowrap sm:gap-3"
            aria-label="Touch Grass Later home"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-foreground/20 text-[10px] font-semibold tracking-[-0.08em] text-foreground">
              TG
            </span>
            <span className="text-[10px] font-semibold tracking-[0.11em] text-foreground sm:text-[11px] sm:tracking-[0.16em]">
              TOUCH GRASS LATER
            </span>
          </Link>
        </Magnet>

        <nav aria-label="Main navigation" className="hidden items-center gap-5 lg:gap-7 md:flex">
          {primaryLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Magnet key={link.href} padding={40} magnetStrength={4.5} maxOffset={5}>
                <Link
                  href={link.href}
                  className={`inline-flex min-h-10 shrink-0 items-center whitespace-nowrap px-1 text-[13px] transition-colors ${
                    active
                      ? "font-semibold text-accent"
                      : "text-foreground/75 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              </Magnet>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 md:flex">
          <ThemeSwitcher variant="compact" />
          <Link
            href={signedIn ? "/learn" : "/auth/login"}
            className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap px-2.5 py-2 text-xs font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            {signedIn ? "My Learning" : "Sign in"}
          </Link>
          <Magnet padding={64} magnetStrength={2.8} maxOffset={8} scale={1.03}>
            <Link
              href="/programmes"
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Explore <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </Magnet>
          <Magnet padding={48} magnetStrength={3.5} maxOffset={6}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu overlay" : "Open menu overlay"}
              aria-expanded={menuOpen}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              {menuOpen ? <X size={17} aria-hidden="true" /> : <Compass size={17} aria-hidden="true" />}
            </button>
          </Magnet>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <ThemeSwitcher variant="compact" />
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-foreground"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Interactive Menu Drawer */}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Interactive navigation menu"
          className="tgl-glass-strong mx-auto mt-2 grid max-w-[1440px] gap-6 rounded-3xl p-5 md:grid-cols-[1.05fr_.95fr] md:p-8"
        >
          {/* Left: Curved React Bits OptionWheel Menu */}
          <div className="tgl-subsurface flex flex-col justify-between rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                Menu Wheel · Scroll, drag or click
              </p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="grid size-10 place-items-center rounded-full border border-border text-foreground/75 hover:text-foreground md:hidden"
              >
                <X size={16} />
              </button>
            </div>

            <div className="my-2 h-[270px] w-full sm:h-[310px]">
              <MenuOptionWheel
                items={wheelDestinations.map((d) => d.label)}
                defaultSelected={wheelIndex}
                side="left"
                fontSize={1.8}
                spacing={1.45}
                curve={0.85}
                tilt={5.5}
                blur={1.2}
                fade={0.26}
                inset={16}
                onChange={(idx) => setWheelIndex(idx)}
                onActivate={(idx) => {
                  const target = wheelDestinations[idx];
                  if (target) {
                    setMenuOpen(false);
                    router.push(target.href);
                  }
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                {selectedDestination.summary}
              </p>
              <Magnet padding={55} magnetStrength={2.5} maxOffset={7}>
                <Link
                  href={selectedDestination.href}
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Open {selectedDestination.label}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </Magnet>
            </div>
          </div>

          {/* Right: Direct Links + Theme Mode */}
          <nav aria-label="Quick navigation links" className="flex flex-col justify-between gap-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Student Navigation
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {wheelDestinations.slice(0, 5).map((item, idx) => (
                  <Magnet key={item.href} padding={40} magnetStrength={4} maxOffset={5}>
                    <Link
                      href={item.href}
                      onMouseEnter={() => setWheelIndex(idx)}
                      onClick={() => setMenuOpen(false)}
                      className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-medium transition-colors ${
                        wheelIndex === idx
                          ? "border-accent/50 bg-accent/10 text-foreground"
                          : "border-border bg-background/50 text-foreground/80 hover:border-foreground/25 hover:text-foreground"
                      }`}
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  </Magnet>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-4">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Theme Appearance
                </p>
                <ThemeSwitcher variant="segmented" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Link
                  href={signedIn ? "/learn" : "/auth/login"}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-10 items-center justify-center rounded-xl border border-border text-foreground/85 hover:border-foreground/30"
                >
                  {signedIn ? "My Learning" : "Sign in"}
                </Link>
                <Link
                  href="/mentor"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-10 items-center justify-center rounded-xl border border-border text-foreground/75 hover:border-foreground/30"
                >
                  Mentor
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-10 items-center justify-center rounded-xl border border-border text-foreground/75 hover:border-foreground/30"
                >
                  Admin
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
