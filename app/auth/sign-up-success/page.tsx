import Link from "next/link";

export default async function SignUpSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const requestedNext = params.next ?? "/learn";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/learn";
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24 text-foreground">
      <section className="tgl-glass-strong w-full max-w-lg rounded-[28px] p-9 text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">TOUCH GRASS LATER</p>
        <h1 className="mt-10 text-4xl font-semibold tracking-[-0.06em]">Check your inbox.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          If your email is eligible, Supabase will send a confirmation link. Confirm your address to sign in and save your learning progress.
        </p>
        <Link
          href={`/auth/login?next=${encodeURIComponent(next)}`}
          className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
