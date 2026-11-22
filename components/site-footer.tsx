"use client";

import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { useFirebaseAuth } from "@/components/firebase-provider";

const publicFooterLinks = [
  { label: "Explore Programmes", href: "/programmes" },
  { label: "My Learning", href: "/learn" },
  { label: "Internships", href: "/internships" },
  { label: "Certificates", href: "/certificates" },
  { label: "Learning Hub", href: "/learning-hub" },
  { label: "Profile", href: "/profile" },
];

const staffFooterLinks = [
  { label: "Mentor Console", href: "/mentor" },
  { label: "Admin Console", href: "/admin" },
];

export function SiteFooter({ note }: { note?: string }) {
  const { isStaff } = useFirebaseAuth();
  const visibleLinks = isStaff
    ? [...publicFooterLinks, ...staffFooterLinks]
    : publicFooterLinks;

  return (
    <footer className="border-t border-border bg-background px-6 py-10 text-muted-foreground md:px-12 lg:px-20">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="space-y-3">
            <Link
              href="/"
              aria-label="Touch Grass Later home"
              className="inline-flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-foreground/20 text-[10px] font-semibold tracking-[-0.08em]">
                TG
              </span>
              <span className="text-xs font-semibold tracking-[0.16em]">
                TOUCH GRASS LATER
              </span>
            </Link>
            <p className="max-w-sm text-xs leading-5 text-muted-foreground">
              {note ??
                "Unified online learning, practical projects, guided internship tasks, and included QR-verified completion certificates."}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <a
                href="mailto:support@touchgrasslater.org"
                className="inline-flex min-h-9 items-center gap-1.5 text-foreground/80 transition-colors hover:text-accent"
              >
                <Mail size={13} aria-hidden="true" />
                <span>support@touchgrasslater.org</span>
              </a>
              <a
                href="tel:+918045681290"
                className="inline-flex min-h-9 items-center gap-1.5 font-mono tabular-nums text-foreground/80 transition-colors hover:text-accent"
              >
                <Phone size={13} aria-hidden="true" />
                <span>+91 80 4568 1290</span>
              </a>
            </div>
          </div>

          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-xs sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4"
          >
            {visibleLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-9 items-center text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-border pt-5 text-[11px] sm:flex-row sm:items-center">
          <p className="text-muted-foreground">
            © 2026 Touch Grass Later. All rights reserved.
          </p>
          <p className="text-muted-foreground">Learn. Build. Grow.</p>
        </div>
      </div>
    </footer>
  );
}
