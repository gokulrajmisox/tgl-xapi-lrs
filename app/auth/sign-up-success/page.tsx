import type { Metadata } from "next";
import Link from "next/link";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";

export const metadata: Metadata = {
  title: "Confirm Your Email — Touch Grass Later",
  description:
    "Check your inbox for your Firebase Authentication verification link before signing in to Touch Grass Later.",
};

export default async function SignUpSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeRedirectPath(params.next, "/learn");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24 text-foreground">
      <section className="tgl-glass-strong w-full max-w-lg rounded-[28px] p-9 text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">TOUCH GRASS LATER</p>
        <h1 className="mt-10 text-4xl font-semibold tracking-[-0.06em]">Check your inbox.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          We sent a Firebase Authentication verification link to your email address. Confirm your inbox to activate your account and save your programme progress.
        </p>
        <Link
          href={`/auth/login?next=${encodeURIComponent(next)}`}
          className="mt-8 inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
