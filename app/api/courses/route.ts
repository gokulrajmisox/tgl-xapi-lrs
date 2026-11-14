import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCurrentActor } from "@/lib/certifications/store";
import {
  createAdminCourse,
  listCoursesCatalog,
  updateCourseAdminConfig,
} from "@/lib/courses/store";

const CreateCourseSchema = z.object({
  title: z.string().trim().min(4).max(160),
  subtitle: z.string().trim().min(10).max(320),
  category: z.enum(["Engineering", "Data & AI", "Infrastructure", "Product & design"]),
  level: z.string().trim().min(2).max(60).default("Applied"),
  pricePaise: z.number().int(),
  estimatedHours: z.number().int().min(1).max(120).default(12),
  mentorName: z.string().trim().min(2).max(80),
  mentorRole: z.string().trim().min(2).max(80).default("Lead Mentor"),
  skills: z.array(z.string().trim().min(1)).default([]),
  linkedInternshipSlug: z.string().trim().min(2).default("full-stack-product-engineering"),
  linkedInternshipTitle: z
    .string()
    .trim()
    .min(2)
    .default("Full-Stack Product Engineering Internship"),
  projectTitle: z.string().trim().min(4).max(140),
  projectSummary: z.string().trim().min(10).max(400),
});

const PatchCourseSchema = z.object({
  courseId: z.string().trim().min(2),
  pricePaise: z.number().int(),
  isPublished: z.boolean().optional(),
  subtitle: z.string().trim().max(320).optional(),
  projectTitle: z.string().trim().max(160).optional(),
  projectSummary: z.string().trim().max(400).optional(),
  internshipDurationWeeks: z.number().int().min(1).max(26).optional(),
  completionRequirements: z.array(z.string().trim().min(3).max(240)).optional(),
  newModuleTitle: z.string().trim().max(160).optional(),
  newModuleSummary: z.string().trim().max(400).optional(),
  newAnnouncementTitle: z.string().trim().max(160).optional(),
  newAnnouncementBody: z.string().trim().max(1000).optional(),
  mentorAuthorName: z.string().trim().max(80).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeUnpublished = searchParams.get("all") === "true";
  const actor = await resolveCurrentActor({
    allowSandboxAdmin: includeUnpublished,
  });
  const isAdmin = actor.user?.role === "admin";
  const courses = await listCoursesCatalog(
    actor.user?.id ?? null,
    includeUnpublished && isAdmin,
  );
  return NextResponse.json(
    { courses, user: actor.user },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const actor = await resolveCurrentActor({ allowSandboxAdmin: true });
  if (!actor.user || actor.user.role !== "admin") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const parsed = CreateCourseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid course payload." },
      { status: 400 },
    );
  }

  const res = await createAdminCourse(parsed.data);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }

  return NextResponse.json(
    { course: res.course },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  const actor = await resolveCurrentActor({ allowSandboxAdmin: true });
  if (!actor.user || actor.user.role !== "admin") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const parsed = PatchCourseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid course pricing update payload." }, { status: 400 });
  }

  const res = await updateCourseAdminConfig(parsed.data);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }

  return NextResponse.json(
    { course: res.course },
    { headers: { "Cache-Control": "no-store" } },
  );
}
