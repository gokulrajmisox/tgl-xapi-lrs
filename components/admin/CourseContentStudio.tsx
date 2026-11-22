"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Eye,
  FileText,
  Layers3,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { AdminCourseStudioPayload } from "@/lib/courses/admin-content";
import type {
  CourseAssignment,
  CourseLesson,
  CourseLessonAttachment,
  CourseModule,
  CourseQuiz,
  CourseQuizQuestion,
  CourseStructuredRubricItem,
} from "@/lib/courses/types";
import type { UnlockedCourseDetailResponse } from "@/lib/courses/store";
import { LessonStudyViewer } from "@/components/workspace/LessonStudyViewer";

type StudioTab = "modules" | "capstone" | "assessments";

function createDefaultLessonForm(): {
  lessonId?: string;
  title: string;
  lessonType: "note" | "video" | "project_milestone";
  durationLabel: string;
  summary: string;
  isDraft: boolean;
  skillsText: string;
  objectivesText: string;
  realWorldContext: string;
  noteHeading: string;
  noteBody: string;
  codeSnippet: string;
  takeaway: string;
  youtubeUrl: string;
  videoCreator: string;
  includeExercise: boolean;
  exerciseTitle: string;
  exerciseObjective: string;
  exerciseInstructionsText: string;
  exerciseStarterCode: string;
  exerciseExpectedOutput: string;
  exerciseHintsText: string;
  includeKnowledgeCheck: boolean;
  kcQuestion: string;
  kcOptions: [string, string, string];
  kcCorrectIndex: number;
  kcExplanation: string;
  resourceTitle: string;
  resourceProvider: string;
  resourceUrl: string;
  attachments: CourseLessonAttachment[];
} {
  return {
    title: "",
    lessonType: "note",
    durationLabel: "25 min read",
    summary: "",
    isDraft: true,
    skillsText: "",
    objectivesText: "",
    realWorldContext: "",
    noteHeading: "Core Architecture & Mechanics",
    noteBody: "",
    codeSnippet: "",
    takeaway: "",
    youtubeUrl: "",
    videoCreator: "",
    includeExercise: false,
    exerciseTitle: "",
    exerciseObjective: "",
    exerciseInstructionsText: "",
    exerciseStarterCode: "",
    exerciseExpectedOutput: "",
    exerciseHintsText: "",
    includeKnowledgeCheck: false,
    kcQuestion: "",
    kcOptions: ["", "", ""],
    kcCorrectIndex: 0,
    kcExplanation: "",
    resourceTitle: "",
    resourceProvider: "MDN / Official Docs",
    resourceUrl: "",
    attachments: [],
  };
}

export function CourseContentStudio({
  courseId,
  onClose,
  onStudioMutated,
}: {
  courseId: string;
  onClose: () => void;
  onStudioMutated: () => Promise<void>;
}) {
  const [studio, setStudio] = useState<AdminCourseStudioPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<StudioTab>("modules");

  // Module & Lesson selection
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [showNewModuleForm, setShowNewModuleForm] = useState(false);
  const [newModTitle, setNewModTitle] = useState("");
  const [newModSummary, setNewModSummary] = useState("");
  const [newModMinutes, setNewModMinutes] = useState("60");
  const [newModDraft, setNewModDraft] = useState(true);

  // Selected Module edit state
  const [modTitle, setModTitle] = useState("");
  const [modSummary, setModSummary] = useState("");
  const [modMinutes, setModMinutes] = useState("60");
  const [modIsDraft, setModIsDraft] = useState(false);
  const [modSkillsText, setModSkillsText] = useState("");
  const [modQuiz, setModQuiz] = useState<CourseQuiz | null>(null);

  // Lesson editor state
  const [editingLesson, setEditingLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState(createDefaultLessonForm);

  // Capstone & Prerequisites state
  const [prereqText, setPrereqText] = useState("");
  const [outcomesText, setOutcomesText] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [useCase, setUseCase] = useState("");
  const [techText, setTechText] = useState("");
  const [submissionInstText, setSubmissionInstText] = useState("");
  const [rubricRows, setRubricRows] = useState<CourseStructuredRubricItem[]>([]);

  // Final Quiz & Assignments state
  const [finalQuiz, setFinalQuiz] = useState<CourseQuiz | null>(null);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);

  // Preview as Student modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDetail, setPreviewDetail] = useState<UnlockedCourseDetailResponse | null>(
    null,
  );
  const [previewLessonId, setPreviewLessonId] = useState<string>("");

  const hydrateFromStudio = useCallback((payload: AdminCourseStudioPayload) => {
    setStudio(payload);
    setPrereqText((payload.course.prerequisites ?? []).join("\n"));
    setOutcomesText((payload.course.outcomes ?? []).join("\n"));
    setProblemStatement(payload.course.project.problemStatement ?? "");
    setUseCase(payload.course.project.useCase ?? "");
    setTechText((payload.course.project.technologies ?? []).join(", "));
    setSubmissionInstText((payload.course.project.submissionInstructions ?? []).join("\n"));
    setRubricRows(
      payload.course.project.structuredRubric?.length
        ? structuredClone(payload.course.project.structuredRubric)
        : payload.course.project.rubric.map((r) => ({
            criterion: r.slice(0, 40),
            weightPercent: Math.max(10, Math.round(100 / Math.max(1, payload.course.project.rubric.length))),
            expectation: r,
          })),
    );
    setFinalQuiz(structuredClone(payload.finalQuiz));
    setAssignments(structuredClone(payload.assignments));

    setSelectedModuleId((prev) => {
      const exists = payload.editableModules.some((m) => m.id === prev);
      const nextMod = exists
        ? payload.editableModules.find((m) => m.id === prev)!
        : payload.editableModules[0];
      if (nextMod) {
        setModTitle(nextMod.title);
        setModSummary(nextMod.summary);
        setModMinutes(String(nextMod.estimatedMinutes));
        setModIsDraft(Boolean(nextMod.isDraft));
        setModSkillsText((nextMod.skills ?? []).join(", "));
        setModQuiz(
          nextMod.moduleQuiz
            ? structuredClone(nextMod.moduleQuiz)
            : {
                id: `mquiz-${nextMod.id}`,
                title: `${nextMod.title} — Checkpoint Quiz`,
                passingScorePercent: 70,
                questions: [],
              },
        );
        return nextMod.id;
      }
      return "";
    });
  }, []);

  const loadStudio = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/courses?courseId=${encodeURIComponent(courseId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.studio) {
        setError(data.error ?? "Failed to load course studio.");
        return;
      }
      hydrateFromStudio(data.studio as AdminCourseStudioPayload);
    } finally {
      setLoading(false);
    }
  }, [courseId, hydrateFromStudio]);

  useEffect(() => {
    void loadStudio();
  }, [loadStudio]);

  useEffect(() => {
    if (!previewOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewOpen]);

  const selectModule = (mod: CourseModule) => {
    setSelectedModuleId(mod.id);
    setModTitle(mod.title);
    setModSummary(mod.summary);
    setModMinutes(String(mod.estimatedMinutes));
    setModIsDraft(Boolean(mod.isDraft));
    setModSkillsText((mod.skills ?? []).join(", "));
    setModQuiz(
      mod.moduleQuiz
        ? structuredClone(mod.moduleQuiz)
        : {
            id: `mquiz-${mod.id}`,
            title: `${mod.title} — Checkpoint Quiz`,
            passingScorePercent: 70,
            questions: [],
          },
    );
    setEditingLesson(false);
  };

  const runStudioMutation = async (
    payload: Record<string, unknown>,
    successMsg: string,
  ): Promise<boolean> => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Studio action failed.");
        return false;
      }
      if (data.studio) {
        hydrateFromStudio(data.studio as AdminCourseStudioPayload);
      }
      setNotice(successMsg);
      await onStudioMutated();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const openLessonEditor = (lesson?: CourseLesson) => {
    if (!lesson) {
      setLessonForm(createDefaultLessonForm());
      setEditingLesson(true);
      return;
    }
    const firstNote = lesson.noteSections[0];
    const firstRes = lesson.resources[0];
    setLessonForm({
      lessonId: lesson.id,
      title: lesson.title,
      lessonType: lesson.lessonType,
      durationLabel: lesson.durationLabel,
      summary: lesson.summary,
      isDraft: Boolean(lesson.isDraft),
      skillsText: (lesson.skills ?? []).join(", "),
      objectivesText: (lesson.learningObjectives ?? []).join("\n"),
      realWorldContext: lesson.realWorldContext ?? "",
      noteHeading: firstNote?.heading ?? "Core Explanation",
      noteBody: firstNote?.body ?? "",
      codeSnippet: firstNote?.codeSnippet ?? "",
      takeaway: firstNote?.takeaway ?? "",
      youtubeUrl: lesson.youtubeUrl ?? "",
      videoCreator: lesson.videoCreator ?? "",
      includeExercise: Boolean(lesson.practicalExercise),
      exerciseTitle: lesson.practicalExercise?.title ?? "",
      exerciseObjective: lesson.practicalExercise?.objective ?? "",
      exerciseInstructionsText: (lesson.practicalExercise?.instructions ?? []).join("\n"),
      exerciseStarterCode: lesson.practicalExercise?.starterCode ?? "",
      exerciseExpectedOutput: lesson.practicalExercise?.expectedOutput ?? "",
      exerciseHintsText: (lesson.practicalExercise?.hints ?? []).join("\n"),
      includeKnowledgeCheck: Boolean(lesson.knowledgeCheck),
      kcQuestion: lesson.knowledgeCheck?.question ?? "",
      kcOptions: [
        lesson.knowledgeCheck?.options[0] ?? "",
        lesson.knowledgeCheck?.options[1] ?? "",
        lesson.knowledgeCheck?.options[2] ?? "",
      ],
      kcCorrectIndex: lesson.knowledgeCheck?.correctIndex ?? 0,
      kcExplanation: lesson.knowledgeCheck?.explanation ?? "",
      resourceTitle: firstRes?.title ?? "",
      resourceProvider: firstRes?.provider ?? "Official Docs",
      resourceUrl: firstRes?.url ?? "",
      attachments: structuredClone(lesson.attachments ?? []),
    });
    setEditingLesson(true);
  };

  const handleAttachmentFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const fileType: CourseLessonAttachment["fileType"] =
      ext === "pdf" ? "pdf" : ext === "csv" || ext === "json" ? "dataset" : "starter";
    const kb = Math.max(1, Math.round(file.size / 1024));
    const entry: CourseLessonAttachment = {
      id: `att-${Date.now().toString(36)}`,
      title: file.name,
      fileType,
      url: `https://touchgrasslater.org/assets/syllabus/${encodeURIComponent(file.name)}`,
      sizeLabel: `${kb} KB`,
    };
    setLessonForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, entry],
    }));
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) return;

    const objectives = lessonForm.objectivesText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const instructions = lessonForm.exerciseInstructionsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const hints = lessonForm.exerciseHintsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const validResource =
      lessonForm.resourceTitle.trim() && lessonForm.resourceUrl.trim()
        ? [
            {
              id: `res-${Date.now().toString(36)}`,
              title: lessonForm.resourceTitle.trim(),
              provider: lessonForm.resourceProvider.trim() || "Official Docs",
              url: lessonForm.resourceUrl.trim(),
            },
          ]
        : [];

    const kcOptionsClean = lessonForm.kcOptions.map((o) => o.trim()).filter(Boolean);

    const ok = await runStudioMutation(
      {
        action: "upsert_lesson",
        courseId,
        moduleId: selectedModuleId,
        ...(lessonForm.lessonId ? { lessonId: lessonForm.lessonId } : {}),
        title: lessonForm.title,
        lessonType: lessonForm.lessonType,
        durationLabel: lessonForm.durationLabel,
        summary: lessonForm.summary,
        isDraft: lessonForm.isDraft,
        skills: lessonForm.skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        learningObjectives: objectives,
        realWorldContext: lessonForm.realWorldContext,
        noteHeading: lessonForm.noteHeading,
        noteBody: lessonForm.noteBody,
        codeSnippet: lessonForm.codeSnippet,
        takeaway: lessonForm.takeaway,
        youtubeUrl: lessonForm.youtubeUrl,
        videoCreator: lessonForm.videoCreator,
        ...(lessonForm.includeExercise && lessonForm.exerciseTitle.trim()
          ? {
              practicalExercise: {
                title: lessonForm.exerciseTitle.trim(),
                difficulty: "Applied",
                estimatedMinutes: 25,
                objective:
                  lessonForm.exerciseObjective.trim() ||
                  "Apply this concept in a focused implementation check.",
                instructions:
                  instructions.length > 0
                    ? instructions
                    : ["Implement the core behavior and verify edge cases cleanly."],
                ...(lessonForm.exerciseStarterCode.trim()
                  ? { starterCode: lessonForm.exerciseStarterCode }
                  : {}),
                expectedOutput:
                  lessonForm.exerciseExpectedOutput.trim() ||
                  "All verification assertions pass cleanly.",
                hints,
              },
            }
          : {}),
        ...(lessonForm.includeKnowledgeCheck &&
        lessonForm.kcQuestion.trim() &&
        kcOptionsClean.length >= 2
          ? {
              knowledgeCheck: {
                question: lessonForm.kcQuestion.trim(),
                options: kcOptionsClean,
                correctIndex: Math.min(lessonForm.kcCorrectIndex, kcOptionsClean.length - 1),
                explanation:
                  lessonForm.kcExplanation.trim() ||
                  "Review the core invariant explained in the lesson notes.",
              },
            }
          : {}),
        ...(validResource.length > 0 ? { resources: validResource } : {}),
        attachments: lessonForm.attachments,
      },
      lessonForm.lessonId
        ? "Lesson saved to course draft."
        : "New lesson added to draft curriculum.",
    );

    if (ok) {
      setEditingLesson(false);
    }
  };

  const handleOpenPreviewAsStudent = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/courses?courseId=${encodeURIComponent(courseId)}&mode=preview_student`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok || !data.preview || data.preview.locked) {
        setError(data.error ?? "Could not load student preview.");
        return;
      }
      const preview = data.preview as UnlockedCourseDetailResponse;
      setPreviewDetail(preview);
      setPreviewLessonId(preview.modules[0]?.lessons[0]?.id ?? "");
      setPreviewOpen(true);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !studio) {
    return (
      <div className="tgl-glass rounded-3xl p-6 text-xs text-muted-foreground">
        {error ? error : "Loading Course Content Studio..."}
      </div>
    );
  }

  const activeModule =
    studio.editableModules.find((m) => m.id === selectedModuleId) ??
    studio.editableModules[0];
  const hasDraftPending =
    studio.course.contentStatus === "draft" ||
    Boolean(studio.course.draftModules && studio.course.draftModules.length > 0);

  return (
    <section
      aria-label={`Course Content Studio for ${studio.course.title}`}
      className="tgl-glass rounded-3xl p-5 sm:p-7 text-xs"
    >
      {/* Top Studio Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Curriculum &amp; Draft Studio ·{" "}
            {hasDraftPending ? "Draft changes pending publish" : "Live / Published"}
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">
            {studio.course.title}
          </h3>
          <p className="mt-1 text-muted-foreground">
            Edits to modules and lessons are staged in a non-destructive Draft until you click{" "}
            <strong className="text-foreground">Publish Draft Changes</strong>. Enrolled learners keep existing progress uninterrupted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleOpenPreviewAsStudent()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium text-foreground hover:border-foreground/30"
          >
            <Eye size={13} aria-hidden="true" />
            Preview as Student
          </button>

          {hasDraftPending && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runStudioMutation(
                    { action: "publish_draft", courseId },
                    "Draft curriculum published live to students!",
                  )
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 font-medium text-white hover:opacity-95"
              >
                <Rocket size={13} aria-hidden="true" />
                Publish Draft Changes
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runStudioMutation(
                    { action: "discard_draft", courseId },
                    "Draft changes discarded; restored published syllabus.",
                  )
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Discard Draft
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Course Content Studio"
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground"
          >
            <X size={13} aria-hidden="true" />
            Close
          </button>
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 font-medium text-emerald-800 dark:text-emerald-200"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-medium text-rose-800 dark:text-rose-200"
        >
          {error}
        </p>
      )}

      {/* Studio Sub-tabs */}
      <div
        role="tablist"
        aria-label="Course studio sections"
        className="mt-5 flex flex-wrap gap-2 border-b border-border pb-4"
      >
        {[
          { id: "modules" as const, label: `Modules & Lessons (${studio.editableModules.length})` },
          { id: "capstone" as const, label: "Prerequisites & Capstone Rubric" },
          { id: "assessments" as const, label: "Final Quiz & Practice Assignments" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`min-h-9 rounded-full px-4 py-1.5 font-medium transition-colors ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MODULES & LESSONS */}
      {activeTab === "modules" && (
        <div className="mt-5 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Module Sidebar */}
          <div className="tgl-subsurface self-start space-y-3 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <Layers3 size={14} className="text-accent" aria-hidden="true" />
                Curriculum Modules
              </p>
              <button
                type="button"
                onClick={() => setShowNewModuleForm((v) => !v)}
                className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
              >
                <Plus size={12} aria-hidden="true" /> Add Module
              </button>
            </div>

            {showNewModuleForm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runStudioMutation(
                    {
                      action: "upsert_module",
                      courseId,
                      title: newModTitle,
                      summary: newModSummary,
                      estimatedMinutes: Number(newModMinutes) || 45,
                      isDraft: newModDraft,
                    },
                    "New module added to draft.",
                  ).then((ok) => {
                    if (ok) {
                      setNewModTitle("");
                      setNewModSummary("");
                      setShowNewModuleForm(false);
                    }
                  });
                }}
                className="space-y-2 rounded-xl border border-border bg-card p-3"
              >
                <input
                  required
                  minLength={3}
                  placeholder="Module title"
                  value={newModTitle}
                  onChange={(e) => setNewModTitle(e.target.value)}
                  className="h-8 w-full rounded-lg border border-border bg-input px-2.5 text-foreground"
                />
                <textarea
                  required
                  minLength={5}
                  rows={2}
                  placeholder="Module summary..."
                  value={newModSummary}
                  onChange={(e) => setNewModSummary(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-foreground"
                />
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={newModMinutes}
                    onChange={(e) => setNewModMinutes(e.target.value)}
                    className="h-8 w-20 rounded-lg border border-border bg-input px-2 text-foreground tabular-nums"
                  />
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={newModDraft}
                      onChange={(e) => setNewModDraft(e.target.checked)}
                    />
                    Draft only
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-full bg-accent px-3 py-1 font-medium text-accent-foreground"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            <ul className="space-y-2">
              {studio.editableModules.map((mod, idx) => {
                const selected = activeModule?.id === mod.id;
                return (
                  <li
                    key={mod.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      selected
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectModule(mod)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-semibold text-accent">
                          0{mod.sortOrder} · {mod.lessons.length} lessons
                        </span>
                        {mod.isDraft && (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-300">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-semibold text-foreground">{mod.title}</p>
                    </button>

                    <div className="mt-2 flex items-center justify-end gap-1 border-t border-border pt-2">
                      <button
                        type="button"
                        disabled={idx === 0 || busy}
                        aria-label={`Move ${mod.title} up`}
                        onClick={() =>
                          void runStudioMutation(
                            {
                              action: "reorder_modules",
                              courseId,
                              moduleId: mod.id,
                              direction: "up",
                            },
                            "Module moved up in draft.",
                          )
                        }
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-35"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === studio.editableModules.length - 1 || busy}
                        aria-label={`Move ${mod.title} down`}
                        onClick={() =>
                          void runStudioMutation(
                            {
                              action: "reorder_modules",
                              courseId,
                              moduleId: mod.id,
                              direction: "down",
                            },
                            "Module moved down in draft.",
                          )
                        }
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-35"
                      >
                        <ArrowDown size={12} />
                      </button>
                      {studio.editableModules.length > 1 && (
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`Delete ${mod.title}`}
                          onClick={() =>
                            void runStudioMutation(
                              { action: "delete_module", courseId, moduleId: mod.id },
                              "Module removed from draft.",
                            )
                          }
                          className="rounded-md p-1 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right Pane: Selected Module & Lessons */}
          {activeModule && (
            <div className="space-y-6">
              {/* Module Details & Module Quiz */}
              <div className="tgl-subsurface rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Edit Module 0{activeModule.sortOrder}
                  </h4>
                  <label className="inline-flex items-center gap-2 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={modIsDraft}
                      onChange={(e) => setModIsDraft(e.target.checked)}
                    />
                    Keep entire module in Draft (hidden from students)
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <label className="block text-muted-foreground">
                    Module Title
                    <input
                      value={modTitle}
                      onChange={(e) => setModTitle(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                    />
                  </label>
                  <label className="block text-muted-foreground">
                    Est. Minutes
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={modMinutes}
                      onChange={(e) => setModMinutes(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground tabular-nums"
                    />
                  </label>
                </div>
                <label className="block text-muted-foreground">
                  Module Summary
                  <textarea
                    rows={2}
                    value={modSummary}
                    onChange={(e) => setModSummary(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground"
                  />
                </label>
                <label className="block text-muted-foreground">
                  Associated Skills (comma separated — powers the Student Skill Constellation)
                  <input
                    value={modSkillsText}
                    onChange={(e) => setModSkillsText(e.target.value)}
                    placeholder="e.g. Python Streaming Generators, UTC Normalization"
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                  />
                </label>

                {/* Module Checkpoint Quiz Inline Editor */}
                {modQuiz && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">
                        Module Checkpoint Quiz ({modQuiz.questions.length} questions)
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setModQuiz((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  questions: [
                                    ...prev.questions,
                                    {
                                      id: `mq-${Date.now().toString(36)}`,
                                      prompt: "What architectural invariant applies here?",
                                      options: [
                                        "Server-authoritative validation",
                                        "Client-only trust",
                                        "Unchecked retries",
                                      ],
                                      correctIndex: 0,
                                      explanation: "Always enforce core contracts server-side.",
                                      questionType: "conceptual",
                                    },
                                  ],
                                }
                              : prev,
                          )
                        }
                        className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                      >
                        <Plus size={12} /> Add Question
                      </button>
                    </div>
                    {modQuiz.questions.map((q, qIdx) => (
                      <div key={q.id} className="space-y-2 rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-accent">
                            Question {qIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setModQuiz((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      questions: prev.questions.filter((x) => x.id !== q.id),
                                    }
                                  : prev,
                              )
                            }
                            className="text-rose-600 hover:underline dark:text-rose-300"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          value={q.prompt}
                          onChange={(e) =>
                            setModQuiz((prev) => {
                              if (!prev) return prev;
                              const next = [...prev.questions];
                              next[qIdx] = { ...q, prompt: e.target.value };
                              return { ...prev, questions: next };
                            })
                          }
                          className="h-8 w-full rounded-lg border border-border bg-input px-2.5 text-foreground"
                        />
                        <div className="grid gap-1.5 sm:grid-cols-3">
                          {q.options.map((opt, oIdx) => (
                            <input
                              key={oIdx}
                              value={opt}
                              onChange={(e) =>
                                setModQuiz((prev) => {
                                  if (!prev) return prev;
                                  const nextQ = { ...q, options: [...q.options] };
                                  nextQ.options[oIdx] = e.target.value;
                                  const nextList = [...prev.questions];
                                  nextList[qIdx] = nextQ;
                                  return { ...prev, questions: nextList };
                                })
                              }
                              className="h-8 rounded-lg border border-border bg-input px-2 text-foreground"
                            />
                          ))}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                          <label className="block text-muted-foreground">
                            Correct Option
                            <select
                              value={q.correctIndex}
                              onChange={(e) =>
                                setModQuiz((prev) => {
                                  if (!prev) return prev;
                                  const next = [...prev.questions];
                                  next[qIdx] = { ...q, correctIndex: Number(e.target.value) };
                                  return { ...prev, questions: next };
                                })
                              }
                              className="mt-1 h-8 w-full rounded-lg border border-border bg-input px-2 text-foreground"
                            >
                              {q.options.map((_, oIdx) => (
                                <option key={oIdx} value={oIdx}>
                                  Option {oIdx + 1}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-muted-foreground">
                            Explanation
                            <input
                              value={q.explanation}
                              onChange={(e) =>
                                setModQuiz((prev) => {
                                  if (!prev) return prev;
                                  const next = [...prev.questions];
                                  next[qIdx] = { ...q, explanation: e.target.value };
                                  return { ...prev, questions: next };
                                })
                              }
                              className="mt-1 h-8 w-full rounded-lg border border-border bg-input px-2 text-foreground"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runStudioMutation(
                      {
                        action: "upsert_module",
                        courseId,
                        moduleId: activeModule.id,
                        title: modTitle,
                        summary: modSummary,
                        estimatedMinutes: Number(modMinutes) || 45,
                        isDraft: modIsDraft,
                        skills: modSkillsText
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                        ...(modQuiz && modQuiz.questions.length > 0
                          ? { moduleQuiz: modQuiz }
                          : {}),
                      },
                      "Module & module quiz saved to draft.",
                    )
                  }
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground"
                >
                  <Save size={13} aria-hidden="true" />
                  Save Module &amp; Quiz to Draft
                </button>
              </div>

              {/* Lessons List inside Module */}
              <div className="tgl-subsurface rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <BookOpen size={14} className="text-accent" aria-hidden="true" />
                    Lessons in Module 0{activeModule.sortOrder} ({activeModule.lessons.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => openLessonEditor()}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 font-medium text-accent-foreground"
                  >
                    <Plus size={13} aria-hidden="true" />
                    Add Lesson
                  </button>
                </div>

                <ul className="space-y-2.5">
                  {activeModule.lessons.map((les, lIdx) => (
                    <li
                      key={les.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-accent">
                          0{lIdx + 1} · {les.lessonType} · {les.durationLabel}
                          {les.isDraft ? " · Draft only" : " · Live"}
                          {les.practicalExercise ? " · Includes Exercise" : ""}
                          {les.knowledgeCheck ? " · Includes Check" : ""}
                        </p>
                        <p className="mt-0.5 font-semibold text-foreground">{les.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-muted-foreground">{les.summary}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={lIdx === 0 || busy}
                          aria-label={`Move ${les.title} up`}
                          onClick={() =>
                            void runStudioMutation(
                              {
                                action: "reorder_lessons",
                                courseId,
                                moduleId: activeModule.id,
                                lessonId: les.id,
                                direction: "up",
                              },
                              "Lesson moved up in draft.",
                            )
                          }
                          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-35"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={lIdx === activeModule.lessons.length - 1 || busy}
                          aria-label={`Move ${les.title} down`}
                          onClick={() =>
                            void runStudioMutation(
                              {
                                action: "reorder_lessons",
                                courseId,
                                moduleId: activeModule.id,
                                lessonId: les.id,
                                direction: "down",
                              },
                              "Lesson moved down in draft.",
                            )
                          }
                          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-35"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openLessonEditor(les)}
                          className="rounded-full border border-border px-3 py-1 font-medium text-foreground hover:border-foreground/30"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`Delete ${les.title}`}
                          onClick={() =>
                            void runStudioMutation(
                              {
                                action: "delete_lesson",
                                courseId,
                                moduleId: activeModule.id,
                                lessonId: les.id,
                              },
                              "Lesson removed from draft.",
                            )
                          }
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lesson Rich Editor Form */}
              {editingLesson && (
                <form
                  onSubmit={(e) => void handleSaveLesson(e)}
                  className="tgl-subsurface rounded-2xl border border-accent/35 p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-base font-semibold text-foreground">
                      {lessonForm.lessonId ? "Edit Lesson Content" : "Create New Lesson"}
                    </h4>
                    <label className="inline-flex items-center gap-2 text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={lessonForm.isDraft}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, isDraft: e.target.checked }))
                        }
                      />
                      Save as Draft (visible only in Student Preview until Published)
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-muted-foreground sm:col-span-2">
                      Lesson Title
                      <input
                        required
                        minLength={3}
                        value={lessonForm.title}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, title: e.target.value }))
                        }
                        placeholder="e.g. Idempotency Keys & Safe Payment Retries"
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-muted-foreground">
                        Type
                        <select
                          value={lessonForm.lessonType}
                          onChange={(e) =>
                            setLessonForm((p) => ({
                              ...p,
                              lessonType: e.target.value as "note" | "video" | "project_milestone",
                            }))
                          }
                          className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-2 text-foreground"
                        >
                          <option value="note">Study Notes</option>
                          <option value="video">Video Lecture</option>
                          <option value="project_milestone">Milestone</option>
                        </select>
                      </label>
                      <label className="block text-muted-foreground">
                        Duration
                        <input
                          required
                          value={lessonForm.durationLabel}
                          onChange={(e) =>
                            setLessonForm((p) => ({ ...p, durationLabel: e.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-2 text-foreground"
                        />
                      </label>
                    </div>
                  </div>

                  <label className="block text-muted-foreground">
                    Lesson Summary
                    <input
                      required
                      minLength={5}
                      value={lessonForm.summary}
                      onChange={(e) =>
                        setLessonForm((p) => ({ ...p, summary: e.target.value }))
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                    />
                  </label>

                  <label className="block text-muted-foreground">
                    Skills Taught in This Lesson (comma separated — updates Skill Constellation)
                    <input
                      value={lessonForm.skillsText}
                      onChange={(e) =>
                        setLessonForm((p) => ({ ...p, skillsText: e.target.value }))
                      }
                      placeholder="e.g. Timing-Safe HMAC SHA-256, Replay Protection"
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-muted-foreground">
                      Learning Objectives (one per line)
                      <textarea
                        rows={3}
                        value={lessonForm.objectivesText}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, objectivesText: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground"
                      />
                    </label>
                    <label className="block text-muted-foreground">
                      Real-World Engineering Context
                      <textarea
                        rows={3}
                        value={lessonForm.realWorldContext}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, realWorldContext: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-muted-foreground">
                      Core Explanation Heading
                      <input
                        value={lessonForm.noteHeading}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, noteHeading: e.target.value }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                      />
                    </label>
                    <label className="block text-muted-foreground">
                      Key Takeaway
                      <input
                        value={lessonForm.takeaway}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, takeaway: e.target.value }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                      />
                    </label>
                  </div>

                  <label className="block text-muted-foreground">
                    Detailed Study Explanation
                    <textarea
                      rows={4}
                      value={lessonForm.noteBody}
                      onChange={(e) =>
                        setLessonForm((p) => ({ ...p, noteBody: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground"
                    />
                  </label>

                  <label className="block text-muted-foreground">
                    Code Snippet Example (optional)
                    <textarea
                      rows={3}
                      value={lessonForm.codeSnippet}
                      onChange={(e) =>
                        setLessonForm((p) => ({ ...p, codeSnippet: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-foreground"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-muted-foreground">
                      YouTube Lecture URL (optional)
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={lessonForm.youtubeUrl}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, youtubeUrl: e.target.value }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                      />
                    </label>
                    <label className="block text-muted-foreground">
                      Educator / Creator Attribution
                      <input
                        value={lessonForm.videoCreator}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, videoCreator: e.target.value }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                      />
                    </label>
                  </div>

                  {/* Practical Exercise Toggle */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <label className="inline-flex items-center gap-2 font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={lessonForm.includeExercise}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, includeExercise: e.target.checked }))
                        }
                      />
                      Include Hands-On Practical Exercise
                    </label>

                    {lessonForm.includeExercise && (
                      <div className="space-y-2.5 pt-2">
                        <input
                          placeholder="Exercise Title"
                          value={lessonForm.exerciseTitle}
                          onChange={(e) =>
                            setLessonForm((p) => ({ ...p, exerciseTitle: e.target.value }))
                          }
                          className="h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                        />
                        <input
                          placeholder="Objective"
                          value={lessonForm.exerciseObjective}
                          onChange={(e) =>
                            setLessonForm((p) => ({ ...p, exerciseObjective: e.target.value }))
                          }
                          className="h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                        />
                        <textarea
                          rows={2}
                          placeholder="Step-by-step instructions (one per line)"
                          value={lessonForm.exerciseInstructionsText}
                          onChange={(e) =>
                            setLessonForm((p) => ({
                              ...p,
                              exerciseInstructionsText: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground"
                        />
                        <textarea
                          rows={2}
                          placeholder="Starter code snippet (optional)"
                          value={lessonForm.exerciseStarterCode}
                          onChange={(e) =>
                            setLessonForm((p) => ({ ...p, exerciseStarterCode: e.target.value }))
                          }
                          className="w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-foreground"
                        />
                        <input
                          placeholder="Expected verification output"
                          value={lessonForm.exerciseExpectedOutput}
                          onChange={(e) =>
                            setLessonForm((p) => ({
                              ...p,
                              exerciseExpectedOutput: e.target.value,
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                        />
                      </div>
                    )}
                  </div>

                  {/* Knowledge Check Toggle */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <label className="inline-flex items-center gap-2 font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={lessonForm.includeKnowledgeCheck}
                        onChange={(e) =>
                          setLessonForm((p) => ({
                            ...p,
                            includeKnowledgeCheck: e.target.checked,
                          }))
                        }
                      />
                      Include Quick In-Lesson Knowledge Check
                    </label>
                    {lessonForm.includeKnowledgeCheck && (
                      <div className="space-y-2 pt-2">
                        <input
                          placeholder="Knowledge check question"
                          value={lessonForm.kcQuestion}
                          onChange={(e) =>
                            setLessonForm((p) => ({ ...p, kcQuestion: e.target.value }))
                          }
                          className="h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                        />
                        <div className="grid gap-2 sm:grid-cols-3">
                          {lessonForm.kcOptions.map((opt, idx) => (
                            <input
                              key={idx}
                              placeholder={`Option ${idx + 1}`}
                              value={opt}
                              onChange={(e) =>
                                setLessonForm((p) => {
                                  const next: [string, string, string] = [...p.kcOptions] as [
                                    string,
                                    string,
                                    string,
                                  ];
                                  next[idx] = e.target.value;
                                  return { ...p, kcOptions: next };
                                })
                              }
                              className="h-8 rounded-lg border border-border bg-input px-2.5 text-foreground"
                            />
                          ))}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                          <select
                            value={lessonForm.kcCorrectIndex}
                            onChange={(e) =>
                              setLessonForm((p) => ({
                                ...p,
                                kcCorrectIndex: Number(e.target.value),
                              }))
                            }
                            className="h-8 rounded-lg border border-border bg-input px-2 text-foreground"
                          >
                            <option value={0}>Correct: Option 1</option>
                            <option value={1}>Correct: Option 2</option>
                            <option value={2}>Correct: Option 3</option>
                          </select>
                          <input
                            placeholder="Explanation shown after answering"
                            value={lessonForm.kcExplanation}
                            onChange={(e) =>
                              setLessonForm((p) => ({ ...p, kcExplanation: e.target.value }))
                            }
                            className="h-8 rounded-lg border border-border bg-input px-2.5 text-foreground"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Verified Resource & Attachments */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <p className="font-semibold text-foreground">
                      Verified Documentation &amp; File Attachments (PDF / Starter Pack)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        placeholder="Doc link title"
                        value={lessonForm.resourceTitle}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, resourceTitle: e.target.value }))
                        }
                        className="h-8 rounded-lg border border-border bg-input px-2.5 text-foreground"
                      />
                      <input
                        placeholder="Provider (e.g. MDN Docs)"
                        value={lessonForm.resourceProvider}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, resourceProvider: e.target.value }))
                        }
                        className="h-8 rounded-lg border border-border bg-input px-2.5 text-foreground"
                      />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={lessonForm.resourceUrl}
                        onChange={(e) =>
                          setLessonForm((p) => ({ ...p, resourceUrl: e.target.value }))
                        }
                        className="h-8 rounded-lg border border-border bg-input px-2.5 text-foreground"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5 font-medium text-foreground hover:border-foreground/30">
                        <FileText size={13} className="text-accent" aria-hidden="true" />
                        Attach PDF / Starter File
                        <input
                          type="file"
                          accept=".pdf,.md,.txt,.csv,.json,.zip"
                          onChange={handleAttachmentFilePick}
                          className="sr-only"
                        />
                      </label>
                      {lessonForm.attachments.map((att) => (
                        <span
                          key={att.id}
                          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                        >
                          {att.title} ({att.sizeLabel ?? att.fileType})
                          <button
                            type="button"
                            onClick={() =>
                              setLessonForm((p) => ({
                                ...p,
                                attachments: p.attachments.filter((x) => x.id !== att.id),
                              }))
                            }
                            aria-label={`Remove attachment ${att.title}`}
                            className="text-rose-600 dark:text-rose-300"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground"
                    >
                      <Save size={13} aria-hidden="true" />
                      Save Lesson to Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingLesson(false)}
                      className="inline-flex min-h-10 items-center rounded-full border border-border px-4 py-2 text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PREREQUISITES & CAPSTONE RUBRIC */}
      {activeTab === "capstone" && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="tgl-subsurface block rounded-2xl p-4 text-muted-foreground">
              <span className="font-semibold text-foreground">
                Prerequisites (one requirement per line)
              </span>
              <textarea
                rows={4}
                value={prereqText}
                onChange={(e) => setPrereqText(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground"
              />
            </label>
            <label className="tgl-subsurface block rounded-2xl p-4 text-muted-foreground">
              <span className="font-semibold text-foreground">
                Learning Outcomes (one per line)
              </span>
              <textarea
                rows={4}
                value={outcomesText}
                onChange={(e) => setOutcomesText(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground"
              />
            </label>
          </div>

          <div className="tgl-subsurface rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              Capstone Project Brief &amp; Weighted Grading Rubric
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-muted-foreground">
                Problem Statement
                <textarea
                  rows={3}
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                />
              </label>
              <label className="block text-muted-foreground">
                Industry Use Case
                <textarea
                  rows={3}
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-muted-foreground">
                Required Technologies (comma separated)
                <input
                  value={techText}
                  onChange={(e) => setTechText(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-input px-3 text-foreground"
                />
              </label>
              <label className="block text-muted-foreground">
                Submission Instructions (one per line)
                <textarea
                  rows={2}
                  value={submissionInstText}
                  onChange={(e) => setSubmissionInstText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                />
              </label>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">Structured Evaluation Rubric</p>
                <button
                  type="button"
                  onClick={() =>
                    setRubricRows((prev) => [
                      ...prev,
                      {
                        criterion: "Architecture & Testing",
                        weightPercent: 20,
                        expectation: "Core failure modes verified cleanly.",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  <Plus size={12} /> Add Criterion
                </button>
              </div>
              {rubricRows.map((row, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[1fr_90px_1.5fr_auto]"
                >
                  <input
                    value={row.criterion}
                    onChange={(e) =>
                      setRubricRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, criterion: e.target.value } : r)),
                      )
                    }
                    className="h-8 rounded-lg border border-border bg-input px-2.5 text-foreground"
                  />
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={row.weightPercent}
                    onChange={(e) =>
                      setRubricRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, weightPercent: Number(e.target.value) || 10 } : r,
                        ),
                      )
                    }
                    className="h-8 rounded-lg border border-border bg-input px-2 text-foreground tabular-nums"
                  />
                  <input
                    value={row.expectation}
                    onChange={(e) =>
                      setRubricRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, expectation: e.target.value } : r,
                        ),
                      )
                    }
                    className="h-8 rounded-lg border border-border bg-input px-2.5 text-foreground"
                  />
                  <button
                    type="button"
                    aria-label={`Remove criterion ${row.criterion}`}
                    onClick={() =>
                      setRubricRows((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runStudioMutation(
                  {
                    action: "update_meta",
                    courseId,
                    prerequisites: prereqText
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                    outcomes: outcomesText
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                    project: {
                      problemStatement: problemStatement.trim(),
                      useCase: useCase.trim(),
                      technologies: techText
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                      submissionInstructions: submissionInstText
                        .split(/\r?\n/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                      structuredRubric: rubricRows,
                      rubric: rubricRows.map(
                        (r) => `${r.criterion} (${r.weightPercent}%): ${r.expectation}`,
                      ),
                    },
                  },
                  "Prerequisites, outcomes, and capstone rubric saved.",
                )
              }
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground"
            >
              <Save size={13} aria-hidden="true" />
              Save Prerequisites &amp; Rubric
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: FINAL QUIZ & PRACTICE ASSIGNMENTS */}
      {activeTab === "assessments" && finalQuiz && (
        <div className="mt-5 space-y-6">
          <div className="tgl-subsurface rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">
                Final Programme Quiz ({finalQuiz.questions.length} questions)
              </h4>
              <button
                type="button"
                onClick={() =>
                  setFinalQuiz((prev) =>
                    prev
                      ? {
                          ...prev,
                          questions: [
                            ...prev.questions,
                            {
                              id: `fq-${Date.now().toString(36)}`,
                              prompt: "Scenario assessment question prompt",
                              options: ["Option A", "Option B", "Option C"],
                              correctIndex: 0,
                              explanation: "Explain the trade-off clearly.",
                              questionType: "scenario",
                            },
                          ],
                        }
                      : prev,
                  )
                }
                className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
              >
                <Plus size={12} /> Add Question
              </button>
            </div>

            {finalQuiz.questions.map((q: CourseQuizQuestion, idx: number) => (
              <div key={q.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-accent">
                    Question {idx + 1} ({q.id})
                  </span>
                  {finalQuiz.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFinalQuiz((prev) =>
                          prev
                            ? {
                                ...prev,
                                questions: prev.questions.filter((x) => x.id !== q.id),
                              }
                            : prev,
                        )
                      }
                      className="text-rose-600 hover:underline dark:text-rose-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  value={q.prompt}
                  onChange={(e) =>
                    setFinalQuiz((prev) => {
                      if (!prev) return prev;
                      const list = [...prev.questions];
                      list[idx] = { ...q, prompt: e.target.value };
                      return { ...prev, questions: list };
                    })
                  }
                  className="h-9 w-full rounded-lg border border-border bg-input px-3 text-foreground"
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  {q.options.map((opt, oIdx) => (
                    <input
                      key={oIdx}
                      value={opt}
                      onChange={(e) =>
                        setFinalQuiz((prev) => {
                          if (!prev) return prev;
                          const opts = [...q.options];
                          opts[oIdx] = e.target.value;
                          const list = [...prev.questions];
                          list[idx] = { ...q, options: opts };
                          return { ...prev, questions: list };
                        })
                      }
                      className="h-8 rounded-lg border border-border bg-input px-2.5 text-foreground"
                    />
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <select
                    value={q.correctIndex}
                    onChange={(e) =>
                      setFinalQuiz((prev) => {
                        if (!prev) return prev;
                        const list = [...prev.questions];
                        list[idx] = { ...q, correctIndex: Number(e.target.value) };
                        return { ...prev, questions: list };
                      })
                    }
                    className="h-8 rounded-lg border border-border bg-input px-2 text-foreground"
                  >
                    {q.options.map((_, oIdx) => (
                      <option key={oIdx} value={oIdx}>
                        Correct: Option {oIdx + 1}
                      </option>
                    ))}
                  </select>
                  <input
                    value={q.explanation}
                    onChange={(e) =>
                      setFinalQuiz((prev) => {
                        if (!prev) return prev;
                        const list = [...prev.questions];
                        list[idx] = { ...q, explanation: e.target.value };
                        return { ...prev, questions: list };
                      })
                    }
                    className="h-8 rounded-lg border border-border bg-input px-2.5 text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="tgl-subsurface rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">
                Applied Practice Assignments ({assignments.length})
              </h4>
              <button
                type="button"
                onClick={() =>
                  setAssignments((prev) => [
                    ...prev,
                    {
                      id: `asgn-${Date.now().toString(36)}`,
                      title: "New Applied Practice Assignment",
                      prompt: "Describe the design trade-offs and test strategy cleanly.",
                      deliverableHint: "PR URL + engineering summary",
                      estimatedMinutes: 35,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
              >
                <Plus size={12} /> Add Assignment
              </button>
            </div>

            {assignments.map((a, idx) => (
              <div key={a.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
                <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
                  <input
                    value={a.title}
                    onChange={(e) =>
                      setAssignments((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                      )
                    }
                    className="h-8 rounded-lg border border-border bg-input px-2.5 font-medium text-foreground"
                  />
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={a.estimatedMinutes}
                    onChange={(e) =>
                      setAssignments((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? { ...x, estimatedMinutes: Number(e.target.value) || 30 }
                            : x,
                        ),
                      )
                    }
                    className="h-8 rounded-lg border border-border bg-input px-2 text-foreground tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAssignments((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-rose-600 hover:underline dark:text-rose-300"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={a.prompt}
                  onChange={(e) =>
                    setAssignments((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, prompt: e.target.value } : x)),
                    )
                  }
                  className="w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-foreground"
                />
                <input
                  value={a.deliverableHint}
                  onChange={(e) =>
                    setAssignments((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, deliverableHint: e.target.value } : x,
                      ),
                    )
                  }
                  className="h-8 w-full rounded-lg border border-border bg-input px-2.5 text-foreground"
                />
              </div>
            ))}

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runStudioMutation(
                  {
                    action: "upsert_extras",
                    courseId,
                    finalQuiz,
                    assignments,
                  },
                  "Final quiz & applied practice assignments updated.",
                )
              }
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground"
            >
              <Save size={13} aria-hidden="true" />
              Save Assessments &amp; Assignments
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW AS STUDENT MODAL */}
      {previewOpen && previewDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Preview curriculum as enrolled student"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
        >
          <div className="tgl-glass-strong flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                  Student Workspace Preview · Includes Staged Draft Lessons
                </p>
                <h4 className="mt-0.5 text-lg font-semibold text-foreground">
                  {previewDetail.course.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground"
              >
                <X size={13} aria-hidden="true" /> Close Preview
              </button>
            </div>

            <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[260px_1fr]">
              <aside className="tgl-subsurface self-start space-y-4 rounded-2xl p-4">
                {previewDetail.modules.map((mod) => (
                  <div key={mod.id} className="space-y-1.5">
                    <p className="text-xs font-semibold text-accent">
                      0{mod.sortOrder}. {mod.title}
                      {mod.isDraft ? " (Draft)" : ""}
                    </p>
                    <ul className="space-y-1">
                      {mod.lessons.map((les) => (
                        <li key={les.id}>
                          <button
                            type="button"
                            onClick={() => setPreviewLessonId(les.id)}
                            className={`w-full rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                              previewLessonId === les.id
                                ? "bg-accent font-medium text-accent-foreground"
                                : "text-foreground/80 hover:bg-foreground/[0.05]"
                            }`}
                          >
                            {les.title}
                            {les.isDraft ? " (Draft)" : ""}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </aside>

              <div className="min-w-0">
                {(() => {
                  const all = previewDetail.modules.flatMap((m) => m.lessons);
                  const current = all.find((l) => l.id === previewLessonId) ?? all[0];
                  if (!current) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Add a lesson to preview student study mode.
                      </p>
                    );
                  }
                  return (
                    <LessonStudyViewer
                      lesson={current}
                      lessonStatus="in_progress"
                      busyLesson={false}
                      canGoPrev={false}
                      canGoNext={false}
                      allLessonsDone={false}
                      onToggleLessonComplete={() => {}}
                      onToggleExerciseComplete={() => {}}
                      onSubmitKnowledgeCheck={() => {}}
                      onPrevLesson={() => {}}
                      onNextLesson={() => {}}
                      onContinueToQuiz={() => {}}
                      readOnlyPreview
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
