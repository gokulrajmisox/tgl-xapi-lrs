"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Compass, Menu, X } from "lucide-react";
import Magnet from "@/components/react-bits/Magnet";
import MenuOptionWheel from "@/components/react-bits/MenuOptionWheel";

const primaryLinks = [
  { label: "Programmes", href: "/programmes" },
  { label: "Projects", href: "/explore" },
  { label: "Internships", href: "/internships" },
  { label: "My Home", href: "/learn" },
];

const wheelDestinations = [
  {
    label: "Programmes",
    href: "/programmes",
    summary: "Single-fee internship-training programmes covering course, project, internship, and included certificate.",
  },
  {
    label: "Projects",
    href: "/explore",
    summary: "Build real-world projects with step-by-step guides and mentor reviews.",
  },
  {
    label: "Internships",
    href: "/internships",
    summary: "Auto-activated with your Programme enrolment—complete sprint tasks with mentor review.",
  },
  {
    label: "My Home",
    href: "/learn",
    summary: "Track your 6-stage journey from Enrolled through Certificate Issued.",
  },
  {
    label: "Certificates",
    href: "/certificates",
    summary: "Check your eligibility and download your included QR-verified certificate (₹0 extra).",
  },
  {
    label: "Achievements",
    href: "/learn/portfolio",
    summary: "Review your approved project builds and verified portfolio proof.",
  },
  {
    label: "Mentor Portal",
    href: "/mentor",
    summary: "Review student project submissions and answer learner questions.",
  },
  {
    label: "Admin Console",
    href: "/admin",
    summary: "Manage bundled programmes, single INR pricing, internship approvals, payments, and test emails.",
  },
];

export function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wheelIndex, setWheelIndex] = useState(0);

  const selectedDestination = wheelDestinations[wheelIndex] ?? wheelDestinations[0];

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="tgl-nav fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 rounded-2xl border border-white/[0.11] bg-[#111111]/85 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.28)] backdrop-blur-2xl md:px-6">
        <Magnet padding={48} magnetStrength={4} maxOffset={6}>
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-3 whitespace-nowrap"
            aria-label="Touch Grass Later home"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/25 text-[10px] font-semibold tracking-[-0.08em] text-white">
              TG
            </span>
            <span className="text-[11px] font-semibold tracking-[0.17em] text-white">
              TOUCH GRASS LATER
            </span>
          </Link>
        </Magnet>

        <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:gap-8 md:flex">
          {primaryLinks.map((link) => (
            <Magnet key={link.href} padding={40} magnetStrength={4.5} maxOffset={5}>
              <Link
                href={link.href}
                className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap px-1 text-[13px] text-white/75 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            </Magnet>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 md:flex">
          <Link
            href="/auth/login"
            className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 py-2 text-xs text-white/80 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Magnet padding={64} magnetStrength={2.8} maxOffset={8} scale={1.03}>
            <Link
              href="/programmes"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#f1f0ec] px-5 py-2.5 text-xs font-medium text-[#101010] transition-colors hover:bg-white"
            >
              Explore Programmes <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </Magnet>
          <Magnet padding={48} magnetStrength={3.5} maxOffset={6}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu overlay" : "Open menu overlay"}
              aria-expanded={menuOpen}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/15 text-white/85 transition-colors hover:border-white/40 hover:text-white"
            >
              {menuOpen ? <X size={17} aria-hidden="true" /> : <Compass size={17} aria-hidden="true" />}
            </button>
          </Magnet>
        </div>

        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-white/15 text-white md:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      {/* Interactive Menu Drawer with React Bits OptionWheel + Magnet CTAs */}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Interactive navigation menu"
          className="mx-auto mt-2 grid max-w-[1440px] gap-6 rounded-3xl border border-white/15 bg-[#121214]/98 p-5 shadow-2xl backdrop-blur-2xl md:grid-cols-[1.05fr_.95fr] md:p-8"
        >
          {/* Left: Curved React Bits OptionWheel Menu */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0b0b0d] p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#b9a9d6]">
                Menu Wheel · Scroll, drag or click
              </p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="grid size-11 place-items-center rounded-full border border-white/15 text-white/75 hover:text-white md:hidden"
              >
                <X size={16} />
              </button>
            </div>

            <div className="my-2 h-[290px] w-full sm:h-[330px]">
              <MenuOptionWheel
                items={wheelDestinations.map((d) => d.label)}
                defaultSelected={wheelIndex}
                side="left"
                fontSize={1.85}
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="max-w-sm text-xs leading-5 text-white/65">
                {selectedDestination.summary}
              </p>
              <Magnet padding={55} magnetStrength={2.5} maxOffset={7}>
                <Link
                  href={selectedDestination.href}
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f1f0ec] px-5 py-2.5 text-xs font-medium text-[#101010] hover:bg-white whitespace-nowrap shrink-0"
                >
                  Open {selectedDestination.label}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </Magnet>
            </div>
          </div>

          {/* Right: Direct 1-Click Links for Immediate Accessibility */}
          <nav aria-label="Quick navigation links" className="flex flex-col justify-between gap-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                Student Journey
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {wheelDestinations.slice(0, 6).map((item, idx) => (
                  <Magnet key={item.href} padding={40} magnetStrength={4} maxOffset={5}>
                    <Link
                      href={item.href}
                      onMouseEnter={() => setWheelIndex(idx)}
                      onClick={() => setMenuOpen(false)}
                      className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-medium transition-colors ${
                        wheelIndex === idx
                          ? "border-[#b9a9d6]/50 bg-[#b9a9d6]/12 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  </Magnet>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <Magnet
                padding={60}
                magnetStrength={2.6}
                maxOffset={8}
                wrapperClassName="w-full"
                style={{ display: "block", width: "100%" }}
              >
                <Link
                  href="/programmes"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 w-full items-center justify-between rounded-full bg-[#f1f0ec] px-5 py-3 text-xs font-medium text-[#101010] hover:bg-white"
                >
                  <span>Explore Programmes</span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </Magnet>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Link
                  href="/auth/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-white/85 hover:border-white/30"
                >
                  Sign in
                </Link>
                <Link
                  href="/mentor"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-white/75 hover:border-white/30"
                >
                  Mentor
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-white/75 hover:border-white/30"
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
