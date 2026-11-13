import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { PathwaysBrowser } from "@/components/pathways-browser";
import { TglScroll } from "@/components/sections/tgl-scroll";

export default function LearningPathwaysPage() {
  return <main className="min-h-screen bg-[#090909] text-[#f4f3ef]"><TglScroll /><Header /><section className="px-6 pb-24 pt-36 md:px-12 md:pb-32 md:pt-48 lg:px-20"><div className="mx-auto max-w-[1280px]"><Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs text-white/45 transition-colors hover:text-white"><ArrowLeft size={13} /> Back to home</Link><div className="grid gap-8 border-b border-white/10 pb-10 md:grid-cols-[1.2fr_.8fr] md:items-end md:pb-14"><div><p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Learning pathways / 09 directions</p><h1 className="mt-6 text-[clamp(3.5rem,9vw,8rem)] font-medium leading-[0.83] tracking-[-0.09em]">Follow the<br /><span className="font-serif font-normal italic text-[#b9a9d6]">interesting.</span></h1></div><p className="max-w-[390px] text-sm leading-7 text-white/50">A place to begin, not a box to stay in. Explore core ideas, find a skill that pulls you in, and make your way toward a project of your own.</p></div><div className="pt-9"><PathwaysBrowser /></div></div></section><footer className="border-t border-white/10 px-6 py-7 text-center text-[10px] tracking-[0.1em] text-white/35 md:px-12">TOUCH GRASS LATER · LEARN. BUILD. GROW.</footer></main>;
}
