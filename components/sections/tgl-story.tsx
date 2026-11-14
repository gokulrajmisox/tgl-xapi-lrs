import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { enrichedPathways } from "@/lib/learning-graph";
import { InternshipCertificateSection } from "@/components/sections/internship-certificate-section";
import ScrollExpand from "@/components/react-bits/ScrollExpand";
import TextLoop from "@/components/react-bits/TextLoop";

export function TglStory() {
  return <>
    <section id="approach" className="bg-[#f4f3ef] px-6 py-24 text-[#111] md:px-12 md:py-36 lg:px-20">
      <div className="mx-auto grid max-w-[1280px] gap-12 md:grid-cols-[.72fr_1.28fr] md:gap-20">
        <div><p className="text-[10px] uppercase tracking-[0.22em] text-black/45">A different kind of learning</p><p className="mt-8 font-mono text-[11px] text-black/35">01 / THE APPROACH</p></div>
        <div><h2 className="max-w-[850px] text-[clamp(2.3rem,5.5vw,5.4rem)] font-medium leading-[0.96] tracking-[-0.075em]">Not another tutorial. <span className="font-serif font-normal italic text-[#827792]">A reason to build.</span></h2><p className="mt-8 max-w-[570px] text-[15px] leading-7 text-black/65">Every TGL Programme bundles everything into one single fee (₹499–₹1,999 INR): study notes and curated YouTube lessons, practical project build, mentor-reviewed internship tasks, and your official certificate included at ₹0 extra.</p><div className="mt-8 flex flex-wrap items-center gap-6"><Link href="/programmes" className="inline-flex min-h-11 items-center gap-3 text-sm font-medium underline underline-offset-4">Explore Programmes (₹499–₹1,999) <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/internships" className="inline-flex min-h-11 items-center gap-2 text-sm text-black/75 hover:text-black">View Included Internships <ArrowRight size={14} aria-hidden="true" /></Link></div></div>
      </div>
    </section>
    <section aria-label="Course curriculum highlights" className="border-y border-white/10 bg-[#0b0b0b] py-3 text-[#f4f3ef]">
      <div className="mx-auto max-w-[1440px]">
        <TextLoop
          text="WRITTEN NOTES · CURATED YOUTUBE · REAL PROJECTS · MENTOR FEEDBACK"
          shape="wave"
          speed={62}
          curviness={18}
          fontSize={28}
          fontWeight={700}
          letterSpacing={2}
          ribbon
          ribbonColor="#b9a9d6"
          color="#111111"
          ribbonWidth={64}
          edgeFade={0.4}
          pauseOnHover
          scrollBoost={0.45}
          className="h-36 sm:h-44 md:h-48"
        />
      </div>
    </section>
    <section id="studio-story" className="relative bg-[#090909] text-[#f4f3ef] overflow-x-clip">
      <ScrollExpand
        src="/tgl-studio-expand.jpg"
        alt="Touch Grass Later connected learning studio workspace"
        title="Built inside a real studio."
        scrollHint="Scroll to expand the studio view"
        useWindowScroll
        startWidth={48}
        startHeight={58}
        startRadius={24}
        mediaZoom={1.28}
        scrollDistance={0.85}
        holdDistance={0.25}
        overlayScrim={0.62}
      >
        <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-black/60 px-6 py-8 backdrop-blur-md sm:px-10 sm:py-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#b9a9d6]">
            02 / CONNECTED WORKSPACE
          </p>
          <h2 className="mt-3 text-[clamp(1.85rem,4.2vw,3.3rem)] font-medium leading-[0.98] tracking-[-0.04em] text-[#f4f3ef]">
            Every concept leads straight into shipped proof.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/85">
            Jump into any pathway graph, submit repository work directly to cohort mentors, and turn completed deliverables into verified portfolio records.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111111] transition-colors hover:bg-white whitespace-nowrap shrink-0"
            >
              Open connected network <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/pathways/web-development"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/45 px-5 py-3 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:border-white/60 whitespace-nowrap shrink-0"
            >
              Inspect Web Architecture map
            </Link>
          </div>
        </div>
      </ScrollExpand>
    </section>
    <section id="pathways" className="bg-[#0b0b0b] px-6 py-24 text-[#f4f3ef] md:px-12 md:py-32 lg:px-20">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-12 flex flex-col justify-between gap-7 md:mb-16 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Choose a direction</p><h2 className="mt-5 text-[clamp(2.7rem,6vw,5.6rem)] font-medium leading-[0.9] tracking-[-0.08em]">Start with<br /><span className="font-serif font-normal italic text-[#b9a9d6]">curiosity.</span></h2></div><Link href="/explore" className="group inline-flex items-center gap-3 self-start rounded-full border border-white/15 px-5 py-3 text-xs text-white/80 transition-colors hover:border-white/35 md:self-auto">Explore all pathways <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{enrichedPathways.slice(0, 6).map((pathway) => <Link key={pathway.number} href={`/pathways/${pathway.slug}`} className="group flex min-h-[180px] flex-col justify-between rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-6 transition-all hover:border-white/20 hover:bg-white/[0.05] md:p-7"><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-white/35">{pathway.number}</span><span className="text-[10px] text-white/35">{pathway.category}</span></div><div className="mt-7 flex items-end justify-between"><div><h3 className="text-xl font-medium tracking-[-0.05em]">{pathway.title}</h3><p className="mt-2 text-xs text-white/40">{pathway.skills.slice(0, 2).join(" · ")}</p></div><span className="grid size-8 place-items-center rounded-full border border-white/10 text-white/55 transition-all group-hover:border-white/30 group-hover:text-white"><ArrowUpRight size={15} /></span></div></Link>)}</div>
      </div>
    </section>
    <section id="projects" className="relative overflow-hidden bg-[#b9a9d6] px-6 py-24 text-[#111] md:px-12 md:py-32 lg:px-20"><div className="absolute -right-32 -top-40 size-[450px] rounded-full border border-black/[0.08]"/><div className="absolute -right-12 -top-20 size-[280px] rounded-full border border-black/[0.08]"/><div className="relative mx-auto max-w-[1280px]"><p className="text-[10px] uppercase tracking-[0.22em] text-black/50">Less watching. More making.</p><div className="mt-9 grid gap-9 md:grid-cols-[1.2fr_.8fr] md:items-end"><h2 className="max-w-[800px] text-[clamp(3rem,8vw,7.5rem)] font-medium leading-[0.84] tracking-[-0.09em]">Make learning<br />look like <span className="font-serif font-normal italic">you.</span></h2><div><p className="max-w-[380px] text-sm leading-6 text-black/60">Move freely between concepts, project briefs, peer work, and mentor reviews without waiting for linear unlocks.</p><Link href="/explore" className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#111] px-5 py-3.5 text-xs font-medium text-[#f4f3ef] transition-transform hover:-translate-y-0.5">Find your starting point <ArrowUpRight size={14} /></Link></div></div></div></section>
    <InternshipCertificateSection />
    <footer className="bg-[#090909] px-6 py-8 text-white/55 md:px-12 lg:px-20"><div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-4 border-t border-white/10 pt-6 text-[11px] sm:flex-row"><span className="font-semibold tracking-[0.16em] text-white/75">TOUCH GRASS LATER</span><span>Learn. Build. Grow.</span><span className="flex flex-wrap gap-3"><Link href="/programmes" className="hover:text-white">Programmes</Link> · <Link href="/explore" className="hover:text-white">Projects</Link> · <Link href="/internships" className="hover:text-white">Internships</Link> · <Link href="/certificates" className="hover:text-white">Certificates</Link> · <Link href="/learn" className="hover:text-white">My Home</Link> · <Link href="/mentor" className="hover:text-white">Mentor</Link> · <Link href="/admin" className="hover:text-white">Admin</Link></span></div></footer>
  </>;
}
