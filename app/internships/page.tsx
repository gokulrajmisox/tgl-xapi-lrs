import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { InternshipsWorkspace } from "@/components/internships-workspace";
import { InternshipCertificateSection } from "@/components/sections/internship-certificate-section";

export const metadata = {
  title: "Internships & INTERNSHIP CERTIFICATE — Touch Grass Later",
  description:
    "Complete mentor-reviewed practical internship sprints included in your Touch Grass Later Programme Enrolment, unlocking your QR-verified Internship Certificate at ₹0 extra fee.",
};

export default function InternshipsPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <section className="px-6 pb-20 pt-36 md:px-12 md:pt-48 lg:px-20">
          <div className="mx-auto max-w-[1280px]">
            <Link
              href="/"
              className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={13} aria-hidden="true" /> Back to home
            </Link>

            <div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1.2fr_.8fr] md:items-end md:pb-14">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  TGL Internships · Included in Programme Enrolment
                </p>
                <h1 className="mt-6 text-[clamp(3.2rem,8vw,7.4rem)] font-medium leading-[0.86] tracking-[-0.08em]">
                  Build real work.
                  <br />
                  <span className="font-serif font-normal italic text-[var(--accent)]">
                    Earn proof.
                  </span>
                </h1>
              </div>
              <p className="max-w-[430px] text-sm leading-7 text-muted-foreground">
                Every TGL Programme bundles course learning, practical project work, mentor-reviewed internship tasks, and an official{" "}
                <strong className="font-medium text-foreground">INTERNSHIP CERTIFICATE</strong>{" "}
                in one single fee—zero extra charges after verification.
              </p>
            </div>

            <div className="pt-12">
              <InternshipsWorkspace />
            </div>
          </div>
        </section>

        <InternshipCertificateSection />
      </main>
      <SiteFooter note="Internships & official QR-verified Internship Certificates are bundled inside your single Programme Enrolment (₹0 extra)." />
    </div>
  );
}
