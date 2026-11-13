import { Header } from "@/components/header";
import { TglHero } from "@/components/sections/tgl-hero";
import { TglStory } from "@/components/sections/tgl-story";
import { TglScroll } from "@/components/sections/tgl-scroll";

export default function Home() {
  return <main className="min-h-screen bg-[#090909]"><TglScroll /><Header /><TglHero /><TglStory /></main>;
}
