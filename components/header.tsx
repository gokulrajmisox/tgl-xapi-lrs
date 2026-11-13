"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";

const links = [
  { label: "Courses", href: "/courses" },
  { label: "Explore", href: "/explore" },
  { label: "Internships", href: "/internships" },
  { label: "Student", href: "/learn" },
  { label: "Mentor", href: "/mentor" },
  { label: "Admin", href: "/admin" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="tgl-nav fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 rounded-2xl border border-white/[0.11] bg-[#111111]/75 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.28)] backdrop-blur-2xl md:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-3 whitespace-nowrap" aria-label="Touch Grass Later home">
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/25 text-[10px] font-semibold tracking-[-0.08em] text-white">TG</span>
          <span className="text-[11px] font-semibold tracking-[0.17em] text-white">TOUCH GRASS LATER</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-5 lg:gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 whitespace-nowrap text-[13px] text-white/65 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link href="/auth/login" className="shrink-0 whitespace-nowrap px-3 py-2 text-xs text-white/75 transition-colors hover:text-white">
            Sign in
          </Link>
          <Link href="/courses" className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#f1f0ec] px-4 py-2.5 text-xs font-medium text-[#101010] transition-transform hover:-translate-y-0.5">
            Browse courses <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <button type="button" className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-white md:hidden" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {menuOpen && <nav aria-label="Mobile navigation" className="mx-auto mt-2 flex max-w-[1440px] flex-col gap-1 rounded-2xl border border-white/10 bg-[#151515]/95 p-3 shadow-xl backdrop-blur-2xl md:hidden">
        {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-white/75 hover:bg-white/[0.06]">{link.label}</Link>)}
        <Link href="/courses" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center justify-between rounded-xl bg-[#f1f0ec] px-4 py-3 text-sm font-medium text-[#101010]">Browse courses <ArrowUpRight size={16} /></Link>
        <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-white/75">Sign in</Link>
      </nav>}
    </header>
  );
}
