import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findPathwayByParam } from "@/lib/learning-graph";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  const pathway = findPathwayByParam(number);
  return {
    title: pathway
      ? `${pathway.title} — Touch Grass Later`
      : "Learning Pathway — Touch Grass Later",
    description:
      pathway?.description ??
      "Explore structured learning pathways and practical projects at Touch Grass Later.",
  };
}

export default async function LegacyPathwayDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const pathway = findPathwayByParam(number);
  if (!pathway) notFound();
  redirect(`/pathways/${pathway.slug}`);
}
