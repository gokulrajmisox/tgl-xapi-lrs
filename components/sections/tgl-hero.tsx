"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Mesh } from "three";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import FluxLines from "@/components/react-bits/FluxLines";
import StrokeText from "@/components/react-bits/StrokeText";

function CoreObject() {
  const core = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  useFrame((state, delta) => {
    if (core.current) {
      core.current.rotation.x += delta * 0.12;
      core.current.rotation.y += delta * 0.18;
      core.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.08;
    }
    if (ring.current) {
      ring.current.rotation.x = 0.9 + Math.sin(state.clock.elapsedTime * 0.18) * 0.12;
      ring.current.rotation.y += delta * 0.1;
    }
  });
  return (
    <group>
      <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.24}>
        <mesh ref={core}>
          <icosahedronGeometry args={[1.28, 4]} />
          <MeshDistortMaterial color="#bcb7ca" roughness={0.16} metalness={0.88} distort={0.19} speed={1.4} clearcoat={1} clearcoatRoughness={0.12} />
        </mesh>
        <mesh ref={ring} rotation={[0.9, 0.2, -0.45]}>
          <torusGeometry args={[1.75, 0.025, 20, 180]} />
          <meshStandardMaterial color="#e2dfec" metalness={0.94} roughness={0.22} />
        </mesh>
        <mesh rotation={[0.2, 0.9, 0.8]}>
          <torusGeometry args={[1.95, 0.009, 12, 180]} />
          <meshStandardMaterial color="#8f899c" metalness={0.85} roughness={0.32} transparent opacity={0.7} />
        </mesh>
      </Float>
      <Sparkles count={45} scale={5.8} size={1.5} speed={0.18} opacity={0.42} color="#d9d3e7" />
    </group>
  );
}

function Scene() {
  return <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6.3], fov: 38 }} gl={{ antialias: true, alpha: true }}>
    <ambientLight intensity={0.75} />
    <directionalLight position={[4, 4, 5]} intensity={2.5} color="#fff7e8" />
    <pointLight position={[-3, -2, 1]} intensity={17} color="#a99bc6" />
    <Suspense fallback={null}><CoreObject /><Environment preset="studio" /></Suspense>
  </Canvas>;
}

export function TglHero() {
  return (
    <section id="home" className="relative isolate min-h-[790px] overflow-hidden bg-[#090909] text-[#f4f3ef] md:min-h-[860px]">
      <div className="pointer-events-none absolute inset-0 -z-20">
        <FluxLines
          colors={["#b9a9d6", "#7d6b9e", "#f4f3ef"]}
          opacity={0.58}
          speed={0.35}
          scale={1.4}
          turbulence={0.95}
          glow={1.85}
          lineWidth={1.15}
          flowDirection="down"
          mouseStrength={0.9}
          dpr={1.25}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#090909]/72 via-[#090909]/25 to-transparent" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_72%_42%,rgba(138,125,163,0.16),transparent_37%),radial-gradient(ellipse_at_12%_88%,rgba(80,77,91,0.12),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 180 180%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%22.82%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%22.6%22/%3E%3C/svg%3E')]" />
      <div className="mx-auto grid min-h-[790px] max-w-[1440px] items-center gap-2 px-6 pb-20 pt-32 md:min-h-[860px] md:grid-cols-[1.04fr_.96fr] md:px-12 md:pb-14 md:pt-28 lg:px-20">
        <div className="relative z-10 max-w-[720px]">
          <p className="mb-7 text-[10px] font-medium uppercase tracking-[0.24em] text-white/60">Project-based learning, built for what&apos;s next</p>
          <h1 className="max-w-[760px] text-[clamp(3.75rem,9.1vw,8.6rem)] font-medium leading-[0.86] tracking-[-0.085em]">
            Your potential<br />isn&apos;t{" "}
            <StrokeText
              text="finished."
              strokeColor="#b9a9d6"
              fillColor="#b9a9d6"
              strokeWidth={1.35}
              className="font-serif font-normal italic tracking-[-0.09em]"
            />
          </h1>
          <p className="mt-8 max-w-[460px] text-[15px] leading-7 text-white/65 md:text-base">Structured courses with real notes, curated YouTube lectures, applied projects, and mentor-reviewed internships.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/courses" className="group inline-flex items-center gap-6 rounded-full bg-[#f4f3ef] px-5 py-3.5 text-[13px] font-medium text-[#111] transition-all hover:bg-white">Browse courses <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
            <Link href="/explore" className="rounded-full border border-white/15 px-5 py-3.5 text-[13px] text-white/75 transition-colors hover:border-white/35 hover:text-white">Explore network</Link>
          </div>
          <div className="mt-16 flex items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-white/35"><span className="h-px w-10 bg-white/20" /> Learn. Build. Grow.</div>
        </div>
        <div className="relative mx-auto h-[350px] w-full max-w-[580px] md:h-[590px]">
          <div className="absolute inset-[12%] rounded-full bg-[#b9a9d6]/[0.07] blur-[70px]" />
          <Scene />
          <div className="absolute bottom-[12%] left-[2%] hidden rounded-2xl border border-white/[0.12] bg-white/[0.045] px-4 py-3 backdrop-blur-xl md:block"><p className="text-[9px] uppercase tracking-[0.18em] text-white/40">The TGL principle</p><p className="mt-1 text-xs text-white/80">Learn by making it real.</p></div>
          <div className="absolute right-[4%] top-[20%] hidden rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-white/50 backdrop-blur-xl md:block">Ideas in motion</div>
        </div>
      </div>
      <a href="#approach" className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/35" aria-label="Scroll to discover TGL"><ArrowDown size={14} className="animate-bounce" /></a>
    </section>
  );
}
