import type { CourseDefinition } from "./types";
import { SEED_COURSES_PART_1 } from "./catalog-seed-part1";
import { SEED_COURSES_PART_2 } from "./catalog-seed-part2";

export * from "./types";

export const DEFAULT_COMPLETION_REQUIREMENTS: string[] = [
  "Complete all programme learning modules and pass the graded assessment check",
  "Submit the practical capstone project and earn mentor approval",
  "Complete all assigned internship tasks and receive final mentor/admin approval",
];

export const SEED_COURSES: CourseDefinition[] = [
  ...SEED_COURSES_PART_1,
  ...SEED_COURSES_PART_2,
];
