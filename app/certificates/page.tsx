import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { CertificatesHub } from "@/components/certificates-hub";
import { InternshipCertificateSection } from "@/components/sections/internship-certificate-section";

export const metadata = {
  title: "Certificates & INTERNSHIP CERTIFICATE — Touch Grass Later",
  description:
    "Official QR-verified Internship Certificates included with every TGL Programme Enrolment at ₹0 additional certificate fee after verified completion.",
};

export default function CertificatesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="px-6 pb-20 pt-36 md:px-12 md:pt-48 lg:px-20">
        <div className="mx-auto max-w-[1280px]">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} /> Back to home
          </Link>

          <div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1.2fr_.8fr] md:items-end md:pb-14">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                TGL Credentials · Included with Programme Enrolment (₹0 extra)
              </p>
              <h1 className="mt-6 text-[clamp(3.2rem,8vw,7.4rem)] font-medium leading-[0.86] tracking-[-0.08em]">
                Verified
                <br />
                <span className="font-serif font-normal italic text-[var(--accent)]">
                  credentials.
                </span>
              </h1>
            </div>
            <p className="max-w-[440px] text-sm leading-7 text-muted-foreground">
              Your official QR-verified Internship Certificate is included at zero extra cost in your Programme Enrolment (₹499–₹1,999 INR). Eligibility is checked server-side—payment alone never creates a certificate.
            </p>
          </div>

          <div className="pt-12">
            <CertificatesHub />
          </div>
        </div>
      </section>

      <InternshipCertificateSection />

      <footer className="border-t border-border px-6 py-8 text-center text-[11px] text-muted-foreground">
        TOUCH GRASS LATER · ALL CERTIFICATES REQUIRE VERIFIED ELIGIBILITY
      </footer>
    </main>
  );
}
