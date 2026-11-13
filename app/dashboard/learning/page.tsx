import { redirect } from "next/navigation";

export const metadata = {
  title: "My Learning — Touch Grass Later",
  description:
    "Unified student dashboard tracking enrolled courses, project deliverables, internship tasks, payments, and verified certificates.",
};

export default function LearningDashboardPage() {
  redirect("/learn");
}
