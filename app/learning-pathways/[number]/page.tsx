import { notFound, redirect } from "next/navigation";
import { findPathwayByParam } from "@/lib/learning-graph";

export default async function LegacyPathwayDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const pathway = findPathwayByParam(number);
  if (!pathway) notFound();
  redirect(`/pathways/${pathway.slug}`);
}
