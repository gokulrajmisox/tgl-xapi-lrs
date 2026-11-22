import type { Metadata } from "next";
import { Header } from "@/components/header";
import { TglHero } from "@/components/sections/tgl-hero";
import { TglStory } from "@/components/sections/tgl-story";
import { TglScroll } from "@/components/sections/tgl-scroll";

export const metadata: Metadata = {
  title: "Touch Grass Later — Unified Learning, Projects & Internships",
  description:
    "Discover bundled internship-training programmes (₹499–₹1,999 INR), build mentor-reviewed practical projects, complete internship tasks, and earn an official QR-verified certificate at ₹0 extra fee.",
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <TglScroll />
      <Header />
      <TglHero />
      <TglStory />
    </main>
  );
}
