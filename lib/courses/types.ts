export type LessonKind = "note" | "video" | "project_milestone";

export type CourseNoteSection = {
  heading: string;
  body: string;
  codeSnippet?: string;
  takeaway: string;
};

export type CourseResourceLink = {
  id: string;
  title: string;
  provider: string;
  url: string;
};

export type CourseKeyConcept = {
  term: string;
  definition: string;
};

export type CourseDiagramNode = {
  label: string;
  detail: string;
  role?: string;
};

export type CourseLessonDiagram = {
  title: string;
  caption: string;
  nodes: CourseDiagramNode[];
};

export type CoursePracticalExercise = {
  title: string;
  difficulty?: "Guided" | "Applied" | "Challenge";
  estimatedMinutes: number;
  objective: string;
  instructions: string[];
  starterCode?: string;
  sampleData?: string;
  expectedOutput: string;
  hints: string[];
  solutionOutline?: string;
};

export type CourseCommonMistake = {
  mistake: string;
  whyItHappens: string;
  fix: string;
};

export type CourseKnowledgeCheck = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type CourseLessonAttachment = {
  id: string;
  title: string;
  fileType: "pdf" | "dataset" | "starter";
  url: string;
  sizeLabel?: string;
};

export type CourseQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  questionType?: "conceptual" | "code" | "scenario";
};

export type CourseQuiz = {
  id: string;
  title: string;
  passingScorePercent: number;
  questions: CourseQuizQuestion[];
};

export type CourseAssignment = {
  id: string;
  title: string;
  prompt: string;
  deliverableHint: string;
  estimatedMinutes: number;
};

export type CourseLesson = {
  id: string;
  sortOrder: number;
  title: string;
  lessonType: LessonKind;
  durationLabel: string;
  summary: string;
  isDraft?: boolean;
  skills?: string[];
  learningObjectives?: string[];
  realWorldContext?: string;
  noteSections: CourseNoteSection[];
  keyConcepts?: CourseKeyConcept[];
  diagram?: CourseLessonDiagram;
  practicalExercise?: CoursePracticalExercise;
  commonMistakes?: CourseCommonMistake[];
  keyTakeaways?: string[];
  knowledgeCheck?: CourseKnowledgeCheck;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  videoCreator?: string;
  resources: CourseResourceLink[];
  attachments?: CourseLessonAttachment[];
};

export type CourseModule = {
  id: string;
  sortOrder: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  isDraft?: boolean;
  skills?: string[];
  learningOutcomes?: string[];
  lessons: CourseLesson[];
  moduleQuiz?: CourseQuiz;
};

export type CourseStructuredRubricItem = {
  criterion: string;
  weightPercent: number;
  expectation: string;
};

export type CourseProjectDefinition = {
  slug: string;
  title: string;
  summary: string;
  brief: string;
  estimatedHours: number;
  problemStatement?: string;
  useCase?: string;
  technologies?: string[];
  milestones: string[];
  deliverables: string[];
  rubric: string[];
  structuredRubric?: CourseStructuredRubricItem[];
  submissionInstructions?: string[];
  mentorName: string;
  mentorRole: string;
};

export type CourseDefinition = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: "Engineering" | "Data & AI" | "Infrastructure" | "Product & design";
  level: string;
  pricePaise: number;
  currency: "INR";
  estimatedHours: number;
  mentorName: string;
  mentorRole: string;
  prerequisites?: string[];
  outcomes: string[];
  includes: string[];
  linkedInternshipSlug: string;
  linkedInternshipTitle: string;
  internshipDurationWeeks?: number;
  completionRequirements?: string[];
  includedCertificateTitle?: string;
  internshipDisclosure: string;
  isPublished: boolean;
  contentStatus?: "draft" | "published";
  modules: CourseModule[];
  draftModules?: CourseModule[];
  project: CourseProjectDefinition;
};
