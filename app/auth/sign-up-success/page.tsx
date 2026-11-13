import Link from "next/link";

export default function SignUpSuccessPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[#090909] px-5 py-24 text-[#f4f3ef]"><section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#111]/80 p-9 text-center"><p className="text-[10px] font-semibold tracking-[0.2em] text-white/55">TOUCH GRASS LATER</p><h1 className="mt-10 text-4xl font-medium tracking-[-0.07em]">Check your inbox.</h1><p className="mt-4 text-sm leading-6 text-white/50">If your email is eligible, Supabase will send a confirmation link. Confirm your address to sign in and save your learning progress.</p><Link href="/auth/login" className="mt-8 inline-flex rounded-full bg-[#f4f3ef] px-5 py-3 text-sm font-medium text-[#111]">Back to sign in</Link></section></main>;
}
