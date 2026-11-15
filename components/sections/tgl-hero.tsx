"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Mesh } from "three";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useTheme } from "next-themes";
import FluxLines from "@/components/react-bits/FluxLines";
import Magnet from "@/components/react-bits/Magnet";
import StrokeText from "@/components/react-bits/StrokeText";

function CoreObject({ isDark }: { isDark: boolean }) {
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
          <MeshDistortMaterial
            color={isDark ? "#bcb7ca" : "#89b8ff"}
            roughness={0.16}
            metalness={0.85}
            distort={0.19}
            speed={1.4}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </mesh>
        <mesh ref={ring} rotation={[0.9, 0.2, -0.45]}>
          <torusGeometry args={[1.75, 0.025, 20, 180]} />
          <meshStandardMaterial
            color={isDark ? "#e2dfec" : "#007aff"}
            metalness={0.88}
            roughness={0.22}
          />
        </mesh>
        <mesh rotation={[0.2, 0.9, 0.8]}>
          <torusGeometry args={[1.95, 0.009, 12, 180]} />
          <meshStandardMaterial
            color={isDark ? "#8f899c" : "#5e5ce6"}
            metalness={0.82}
            roughness={0.32}
            transparent
            opacity={0.7}
          />
        </mesh>
      </Float>
      <Sparkles
        count={45}
        scale={5.8}
        size={1.5}
        speed={0.18}
        opacity={isDark ? 0.42 : 0.32}
        color={isDark ? "#d9d3e7" : "#007aff"}
      />
    </group>
  );
}

function Scene({ isDark }: { isDark: boolean }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6.3], fov: 38 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={isDark ? 0.75 : 1.05} />
      <directionalLight position={[4, 4, 5]} intensity={2.5} color="#fff7e8" />
      <pointLight position={[-3, -2, 1]} intensity={17} color={isDark ? "#a99bc6" : "#007aff"} />
      <Suspense fallback={null}>
        <CoreObject isDark={isDark} />
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  );
}

export function TglHero() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <section
      id="home"
      className="relative isolate min-h-[790px] overflow-hidden bg-background text-foreground md:min-h-[860px]"
    >
      <div className="pointer-events-none absolute inset-0 -z-20">
        {mounted && (
          <FluxLines
            colors={isDark ? ["#b9a9d6", "#8d79b3", "#f4f3ef"] : ["#007aff", "#5e5ce6", "#8ec5ff"]}
            opacity={isDark ? 0.78 : 0.34}
            speed={0.42}
            scale={1.45}
            turbulence={1.0}
            glow={isDark ? 2.15 : 1.15}
            lineWidth={1.3}
            flowDirection="down"
            mouseStrength={1.05}
            dpr={1.35}
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#f5f5f7]/80 via-[#f5f5f7]/35 to-transparent dark:from-[#090909]/85 dark:via-[#090909]/45 dark:to-transparent" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_72%_42%,rgba(0,122,255,0.10),transparent_40%),radial-gradient(ellipse_at_12%_88%,rgba(94,92,230,0.08),transparent_38%)] dark:bg-[radial-gradient(ellipse_at_72%_42%,rgba(138,125,163,0.16),transparent_37%),radial-gradient(ellipse_at_12%_88%,rgba(80,77,91,0.12),transparent_36%)]" />
      <div className="mx-auto grid min-h-[790px] max-w-[1440px] items-center gap-2 px-6 pb-20 pt-32 md:min-h-[860px] md:grid-cols-[1.04fr_.96fr] md:px-12 md:pb-14 md:pt-28 lg:px-20">
        <div className="relative z-10 max-w-[720px]">
          <p className="mb-7 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Project-based learning, built for what&apos;s next
          </p>
          <h1 className="max-w-[760px] text-[clamp(3.75rem,9.1vw,8.6rem)] font-medium leading-[0.86] tracking-[-0.085em]">
            Your potential<br />
            isn&apos;t{" "}
            <StrokeText
              text="finished."
              strokeColor="var(--accent)"
              fillColor="var(--accent)"
              strokeWidth={1.35}
              className="font-serif font-normal italic tracking-[-0.09em]"
            />
          </h1>
          <p className="mt-8 max-w-[490px] text-[15px] leading-7 text-muted-foreground md:text-base">
            Enrol in one bundled internship-training programme: study clear notes and curated videos, ship a real project, finish your mentor-reviewed internship, and claim your included certificate at ₹0 extra.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Magnet padding={65} magnetStrength={2.8} maxOffset={8} scale={1.03}>
              <Link
                href="/programmes"
                className="group inline-flex min-h-11 items-center gap-5 rounded-full bg-primary px-5 py-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Explore Programmes{" "}
                <ArrowUpRight
                  size={15}
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </Magnet>
            <Link
              href="/learn"
              className="tgl-glass inline-flex min-h-11 items-center rounded-full px-5 py-3 text-[13px] font-medium text-foreground transition-colors hover:border-foreground/30"
            >
              My Learning
            </Link>
          </div>
          <div className="mt-16 flex items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-10 bg-border" /> Learn. Build. Grow.
          </div>
        </div>
        <div className="relative mx-auto h-[350px] w-full max-w-[580px] md:h-[590px]">
          <div className="absolute inset-[12%] rounded-full bg-accent/10 blur-[70px]" />
          <Scene isDark={isDark} />
          <div className="tgl-glass absolute bottom-[12%] left-[2%] hidden rounded-2xl px-4 py-3 md:block">
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">The TGL principle</p>
            <p className="mt-1 text-xs font-medium text-foreground">Learn by making it real.</p>
          </div>
          <div className="tgl-glass absolute right-[4%] top-[20%] hidden rounded-full px-3.5 py-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground md:block">
            Ideas in motion
          </div>
        </div>
      </div>
      <a
        href="#approach"
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground"
        aria-label="Scroll to discover TGL"
      >
        <ArrowDown size={14} className="animate-bounce" />
      </a>
    </section>
  );
}
