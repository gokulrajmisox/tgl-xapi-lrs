"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function TglScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal-on-scroll").forEach((element) => {
        gsap.fromTo(element, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: "power2.out", scrollTrigger: { trigger: element, start: "top 88%", once: true } });
      });
    });

    return () => {
      context.revert();
      lenis.destroy();
      gsap.ticker.remove(ticker);
    };
  }, []);
  return null;
}
