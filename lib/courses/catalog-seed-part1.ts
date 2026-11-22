import type { CourseDefinition } from "./types";

export const SEED_COURSES_PART_1: CourseDefinition[] = [
  {
    id: "course-web-architecture",
    slug: "web-architecture-systems",
    title: "Full Stack Web Architecture Internship Programme",
    subtitle:
      "Design accessible interfaces, typed server boundaries, and production payment trust flows with Next.js and PostgreSQL — bundled with an 8-week guided internship and included completion certificate.",
    category: "Engineering",
    level: "Foundations → Production",
    pricePaise: 129900,
    currency: "INR",
    estimatedHours: 18,
    mentorName: "Kabir Malhotra",
    mentorRole: "Principal Frontend Architect",
    prerequisites: [
      "Basic familiarity with HTML, CSS flexbox/grid, and modern JavaScript (ES6 modules, async/await)",
      "Understanding of HTTP request/response cycles (GET, POST, status codes 200/400/401/403)",
      "Node.js 20+ and Git installed locally for running practical exercises",
    ],
    outcomes: [
      "Structure App Router layouts separating server-only secrets from interactive client leaves",
      "Build WCAG AA keyboard-navigable dashboards, forms, and live status regions",
      "Validate API inputs with Zod schemas and enforce authoritative server-computed prices",
      "Verify transactional state transitions with unit tests before shipping capstone releases",
    ],
    includes: [
      "4 structured learning modules with deep architecture notes, diagrams & curated lectures",
      "Hands-on coding exercises, per-module quizzes & graded architecture assessment",
      "8-week Full-Stack Product Engineering Internship track with 2 mentor-reviewed tasks",
      "Official Internship Completion Certificate included (₹0 extra after approval)",
    ],
    linkedInternshipSlug: "full-stack-product-engineering",
    linkedInternshipTitle: "Full-Stack Product Engineering Internship",
    internshipDurationWeeks: 8,
    includedCertificateTitle: "Full-Stack Product Engineering Internship Completion Certificate",
    completionRequirements: [
      "Complete all Web Architecture modules, hands-on exercises & pass the graded check",
      "Submit Accessible Learning Portfolio & pass Kabir Malhotra's rubric evaluation",
      "Finish both 8-week Full-Stack Product Engineering internship tasks and earn final approval",
    ],
    internshipDisclosure:
      "One single Programme Enrolment fee unlocks all learning modules, notes, curated videos, exercises, practical project review, the 8-week Full-Stack Product Engineering Internship, and your official completion certificate at ₹0 extra once approved. Completing a TGL studio internship does not guarantee external employer placement.",
    isPublished: true,
    contentStatus: "published",
    modules: [
      {
        id: "mod-web-1",
        sortOrder: 1,
        title: "Accessible DOM Semantics & Layout Contracts",
        summary:
          "Build clear visual hierarchy, responsive landmarks, keyboard focus management, and reduced-motion discipline across desktop and mobile viewports.",
        estimatedMinutes: 95,
        learningOutcomes: [
          "Structure pages with semantic landmarks (<header>, <nav>, <main>, <section>) for assistive navigation",
          "Replace clickable generic <div> elements with native <button> and <Link> controls",
          "Guard CSS/JS animations with prefers-reduced-motion media checks",
        ],
        lessons: [
          {
            id: "les-web-1-note",
            sortOrder: 1,
            title: "Landmarks, Focus Flow & Reduced Motion",
            lessonType: "note",
            durationLabel: "25 min read",
            summary:
              "Why native interactive elements and predictable focus order outperform generic clickable divs.",
            learningObjectives: [
              "Distinguish landmark regions from visual wrapper containers",
              "Implement keyboard-reachable disclosure buttons with accurate ARIA state",
              "Respect system reduced-motion preferences without breaking functional feedback",
            ],
            realWorldContext:
              "Enterprise SaaS and edtech portals lose 12–18% of task completions when keyboard focus disappears inside custom clickable cards or fixed headers trap scroll views on mobile.",
            noteSections: [
              {
                heading: "Semantic Landmarks Before Styling",
                body: "Screen-reader and keyboard users navigate modern apps using header, nav, main, section, and button elements rather than visual proximity alone. Every interactive card action must be reachable via Tab and announce dynamic visibility changes through aria-expanded or aria-live regions.",
                codeSnippet: `<button\n  type="button"\n  aria-expanded={open}\n  aria-controls="syllabus-panel"\n  onClick={() => setOpen((v) => !v)}\n  className="rounded-full px-4 py-2 text-xs font-medium focus-visible:ring-2"\n>\n  Toggle syllabus details\n</button>`,
                takeaway:
                  "Use native <button> and <Link> primitives first; add ARIA attributes only to describe dynamic state.",
              },
              {
                heading: "Optical Hierarchy & Reduced Motion",
                body: "Respect prefers-reduced-motion in every animated hero or interactive control so users sensitive to motion receive crisp state transitions without disorienting parallax or continuous loops.",
                codeSnippet: `const prefersReduced = typeof window !== "undefined" &&\n  window.matchMedia("(prefers-reduced-motion: reduce)").matches;\n\nif (!prefersReduced) {\n  element.scrollIntoView({ behavior: "smooth", block: "start" });\n} else {\n  element.scrollIntoView({ behavior: "auto", block: "start" });\n}`,
                takeaway:
                  "Always guard animation timelines and smooth scroll behavior with reduced-motion checks.",
              },
            ],
            keyConcepts: [
              {
                term: "Semantic Landmark",
                definition:
                  "HTML elements (<main>, <nav>, <header>, <aside>) that expose document structure directly to assistive technologies.",
              },
              {
                term: "Focus Ring (:focus-visible)",
                definition:
                  "CSS pseudo-class that renders high-contrast outlines specifically for keyboard navigation without distracting mouse clicks.",
              },
              {
                term: "Live Region (aria-live)",
                definition:
                  "An attribute instructing screen readers to announce asynchronous status updates such as form errors or saved progress.",
              },
            ],
            diagram: {
              title: "Semantic Accessibility Tree Resolution",
              caption:
                "How browser layout parses DOM landmarks into keyboard focus order and screen-reader announcements.",
              nodes: [
                { role: "1. Document", label: "<header> & <nav>", detail: "Top-level navigation landmarks" },
                { role: "2. Focus Flow", label: "<main> Interactive Controls", detail: "Native <button> / <a> tab order" },
                { role: "3. Feedback", label: "aria-expanded & role='status'", detail: "Dynamic state announcements" },
              ],
            },
            practicalExercise: {
              title: "Refactor a Clickable Div Card into a Keyboard-Accessible Disclosure",
              difficulty: "Guided",
              estimatedMinutes: 20,
              objective:
                "Eliminate an inaccessible <div onClick> pattern and wire proper ARIA disclosure semantics with visible focus rings.",
              instructions: [
                "Inspect the starter JSX snippet containing an inaccessible <div onClick> accordion.",
                "Replace the trigger container with a semantic <button type='button'> element.",
                "Bind aria-expanded={isOpen} and aria-controls pointing to the expanded content container ID.",
                "Verify Tab + Enter/Space toggles the panel cleanly without adding manual keyDown hacks.",
              ],
              starterCode: `export function CourseModuleCard({ title, summary }: { title: string; summary: string }) {\n  const [isOpen, setIsOpen] = useState(false);\n  return (\n    <div className="card">\n      <div onClick={() => setIsOpen(!isOpen)} className="header">{title}</div>\n      {isOpen && <p>{summary}</p>}\n    </div>\n  );\n}`,
              expectedOutput:
                "Screen reader announces 'Toggle Module, button, collapsed/expanded' and keyboard Tab -> Enter toggles visibility.",
              hints: [
                "Native <button> handles both Enter and Spacebar automatically — you do not need custom onKeyDown listeners.",
                "Use useId() or a deterministic string ID for aria-controls.",
              ],
              solutionOutline:
                "Wrap {title} inside <button type='button' aria-expanded={isOpen} aria-controls={panelId} onClick={() => setIsOpen((v) => !v)}> and give the paragraph container id={panelId}.",
            },
            commonMistakes: [
              {
                mistake: "Nesting interactive buttons inside a clickable parent card",
                whyItHappens: "Developers add onClick to an outer card wrapper while keeping action buttons inside.",
                fix: "Keep cards static containers and attach click/link handlers strictly to discrete inner buttons or links.",
              },
              {
                mistake: "Removing browser outline with outline-none without replacement",
                whyItHappens: "Attempt to match minimalist aesthetics by clearing default browser rings.",
                fix: "Always pair outline-none with focus-visible:ring-2 focus-visible:ring-accent.",
              },
            ],
            keyTakeaways: [
              "Semantic HTML landmarks give keyboard and assistive technology users instant orientation.",
              "Native <button> and <Link> controls provide built-in Enter/Space/focus semantics for free.",
              "Honor prefers-reduced-motion before running programmatic transitions or animations.",
            ],
            knowledgeCheck: {
              question: "Which pattern guarantees both keyboard Enter/Space support and accessible state announcements for an expandable syllabus panel?",
              options: [
                "A <div role='button' onClick={toggle}> without tabIndex",
                "A native <button type='button' aria-expanded={open}> toggling the panel",
                "An <a> tag without an href attribute",
              ],
              correctIndex: 1,
              explanation:
                "A native <button> natively supports Tab focus, Enter, and Spacebar activation, while aria-expanded informs screen readers whether the controlled region is open.",
            },
            resources: [
              {
                id: "res-web-mdn",
                title: "MDN: Keyboard-navigable JavaScript widgets",
                provider: "MDN Web Docs",
                url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets",
              },
              {
                id: "res-web-aria-patterns",
                title: "W3C WAI-ARIA Authoring Practices Guide",
                provider: "W3C",
                url: "https://www.w3.org/WAI/ARIA/apg/patterns/",
              },
            ],
          },
          {
            id: "les-web-1-video",
            sortOrder: 2,
            title: "Curated Lecture: React Rendering & Component Mental Model",
            lessonType: "video",
            durationLabel: "32 min watch",
            summary:
              "Curated external lecture explaining declarative state boundaries, server vs client splits, and re-render discipline.",
            learningObjectives: [
              "Keep stateful 'use client' directives pushed down to interactive leaf components",
              "Avoid unnecessary derived state in useEffect hooks",
            ],
            realWorldContext:
              "Large Next.js dashboards turn sluggish when top-level page wrappers become client components and every keystroke re-renders static curriculum trees.",
            noteSections: [
              {
                heading: "Watch Focus Guide: State Ownership",
                body: "Pay close attention to how state ownership stays at the lowest shared ancestor while static presentation markup remains pure Server Components.",
                codeSnippet: `// Good: Server Component fetches data & passes primitive props\nexport default async function ProgrammePage({ params }) {\n  const detail = await loadCourse(params.slug);\n  return <WorkspaceClient initialDetail={detail} />;\n}`,
                takeaway: "Keep Server Components pure and move 'use client' strictly to interactive leaf controls.",
              },
            ],
            keyConcepts: [
              {
                term: "Client Boundary ('use client')",
                definition: "Directs Next.js to bundle that module and its imports for browser hydration.",
              },
              {
                term: "Derived State",
                definition: "Values computed directly during render from existing props/state instead of redundant state variables.",
              },
            ],
            practicalExercise: {
              title: "Trace & Eliminate Redundant useEffect Derived State",
              difficulty: "Guided",
              estimatedMinutes: 15,
              objective: "Convert a two-pass useEffect filter calculation into a single synchronous render computation.",
              instructions: [
                "Review the sample component storing filteredLessons inside useState + useEffect.",
                "Remove the extra useState and useEffect pair and compute filteredLessons with useMemo directly from query + lessons.",
              ],
              starterCode: `const [filtered, setFiltered] = useState(lessons);\nuseEffect(() => {\n  setFiltered(lessons.filter((l) => l.title.includes(query)));\n}, [lessons, query]);`,
              expectedOutput: "Zero extra render cycle per keystroke and no stale intermediate flash.",
              hints: ["Compute derived arrays directly during render or wrap expensive filters in useMemo."],
              solutionOutline: "const filtered = useMemo(() => lessons.filter((l) => l.title.includes(query)), [lessons, query]);",
            },
            commonMistakes: [
              {
                mistake: "Marking root layout.tsx with 'use client'",
                whyItHappens: "Adding one small interactive button directly in the layout file.",
                fix: "Extract the interactive widget (e.g. theme switcher) into its own small client file and import it into Server layout.",
              },
            ],
            keyTakeaways: [
              "Derive state synchronously during render whenever values depend solely on existing state/props.",
              "Keep server-only secrets, DB queries, and heavy markdown data out of client bundles.",
            ],
            knowledgeCheck: {
              question: "When should a component be marked with 'use client' in Next.js App Router?",
              options: [
                "On every component in the /components directory",
                "Only when the component uses browser APIs, React hooks, or event handlers",
                "Whenever it accepts TypeScript props",
              ],
              correctIndex: 1,
              explanation:
                "Only components requiring hooks, event listeners, or browser globals need 'use client'. Keeping the rest as Server Components reduces client JS.",
            },
            youtubeVideoId: "hQAHSlTtcmY",
            youtubeUrl: "https://www.youtube.com/watch?v=hQAHSlTtcmY",
            videoCreator: "Web Dev Simplified (YouTube)",
            resources: [
              {
                id: "res-web-react-state",
                title: "React Docs: Managing State cleanly",
                provider: "React.dev",
                url: "https://react.dev/learn/managing-state",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-web-1",
          title: "Module 1 Check: Semantics, Focus & Component Boundaries",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-web-1-q1",
              questionType: "conceptual",
              prompt: "Why should static metadata tags (e.g. course hours, mentor name) avoid button-like pill styling?",
              options: [
                "CSS border-radius slows down GPU compositing",
                "Users scan bordered fills as clickable controls; quiet typography keeps primary CTAs unambiguous",
                "HTML does not allow border styling on span elements",
              ],
              correctIndex: 1,
              explanation:
                "Distinguishing static metadata with clean typography reserves visual prominence exclusively for interactive buttons and filters.",
            },
            {
              id: "mq-web-1-q2",
              questionType: "code",
              prompt: "Which change fixes an unexpected double render when filtering a list by search query?",
              options: [
                "Move the filter into useEffect without a dependency array",
                "Derive the filtered array synchronously during render or inside useMemo",
                "Wrap the entire application in 'use client'",
              ],
              correctIndex: 1,
              explanation:
                "Synchronously deriving filtered values removes the redundant post-paint useEffect state update.",
            },
            {
              id: "mq-web-1-q3",
              questionType: "scenario",
              prompt: "A user reports Tab skips over a custom expandable module header entirely. What is the direct fix?",
              options: [
                "Replace the clickable <div> with a native <button type='button'> element",
                "Increase CSS z-index on the module card",
                "Add hover:cursor-pointer to the <div>",
              ],
              correctIndex: 0,
              explanation:
                "Generic <div> elements are excluded from tab order and keyboard activation; native <button> solves both automatically.",
            },
          ],
        },
      },
      {
        id: "mod-web-2",
        sortOrder: 2,
        title: "Typed Server Boundaries & Enrollment Gating",
        summary:
          "Enforce entitlement checks inside Next.js Route Handlers, validate request contracts with Zod, and sanitize locked payloads before serialization.",
        estimatedMinutes: 110,
        learningOutcomes: [
          "Reject untrusted request payloads early with strict Zod schemas",
          "Enforce database-backed entitlement checks on API mutations and GET loaders",
          "Strip paid course notes, video IDs, exercises, and quiz answers on locked responses",
        ],
        lessons: [
          {
            id: "les-web-2-note",
            sortOrder: 1,
            title: "Never Trust Client State for Paid Access",
            lessonType: "note",
            durationLabel: "30 min read",
            summary:
              "Architecting database-backed entitlement gates, Zod validation, and sanitized preview DTOs.",
            learningObjectives: [
              "Design separate locked vs unlocked response DTO shapes on the server",
              "Validate incoming mutation requests with Zod safeParse()",
              "Compute checkout totals strictly from database product rows rather than client request amounts",
            ],
            realWorldContext:
              "Attackers routinely inspect DevTools Network payloads or modify POST JSON bodies. If your server returns full lesson text and hides it via CSS, or reads pricePaise from the browser body, paid paywalls can be bypassed in seconds.",
            noteSections: [
              {
                heading: "Sanitizing Locked Payloads on the Server",
                body: "Hiding a locked note in CSS does not protect paid curriculum. The server loader must query active course_enrollments for the authenticated actor and strip notes, video IDs, practical exercises, knowledge checks, and submission forms from the JSON payload whenever enrollment is absent.",
                codeSnippet: `if (!isEnrolled) {\n  return {\n    locked: true,\n    syllabusModules: course.modules.map(({ id, title, summary, lessons }) => ({\n      id, title, summary,\n      lessons: lessons.map((l) => ({ id: l.id, title: l.title, durationLabel: l.durationLabel }))\n    }))\n  };\n}`,
                takeaway:
                  "Zero paid note text, exercise answers, or video identifiers should cross the network before verified checkout.",
              },
              {
                heading: "Input Schema Validation at API Entrypoints",
                body: "Validate every incoming POST/PATCH body with Zod before querying the database or gateway. Reject malformed inputs immediately with HTTP 400 and structured issue details.",
                codeSnippet: `const ProgressSchema = z.object({\n  lessonId: z.string().trim().min(2),\n  status: z.enum(["not_started", "in_progress", "completed"]),\n});\nconst parsed = ProgressSchema.safeParse(await req.json().catch(() => null));\nif (!parsed.success) {\n  return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });\n}`,
                takeaway: "Validate untrusted JSON once at the edge of every Route Handler.",
              },
            ],
            keyConcepts: [
              {
                term: "DTO Sanitization",
                definition:
                  "Constructing explicit response objects containing only the fields an authenticated role is authorized to receive.",
              },
              {
                term: "Server-Authoritative Pricing",
                definition:
                  "Looking up the official INR paise fee on the server using courseId instead of trusting client-sent amounts.",
              },
            ],
            diagram: {
              title: "Entitlement-Gated API Request Lifecycle",
              caption: "Every course payload branches strictly on verified server session + enrollment status.",
              nodes: [
                { role: "1. Identity", label: "resolveCurrentActor()", detail: "Verify Supabase JWT cookie" },
                { role: "2. Schema", label: "Zod safeParse()", detail: "Reject invalid inputs (400)" },
                { role: "3. Gate", label: "course_enrollments", detail: "Check status = 'active'" },
                { role: "4. Response", label: "Locked vs Unlocked DTO", detail: "Strip secrets if unenrolled" },
              ],
            },
            practicalExercise: {
              title: "Build a Strict Locked-Syllabus Sanitizer Function",
              difficulty: "Applied",
              estimatedMinutes: 25,
              objective:
                "Ensure an unenrolled user receives module/lesson titles and durations without leaking noteSections, youtubeVideoId, or quiz answers.",
              instructions: [
                "Inspect a full CourseDefinition object containing nested modules, lessons, and module quizzes.",
                "Write a pure TypeScript function sanitizeCourseForVisitor(course) returning only public metadata and { id, title, durationLabel, lessonType } per lesson.",
                "Write an assertion checking JSON.stringify(result) never contains 'youtubeVideoId' or 'correctIndex'.",
              ],
              starterCode: `export function sanitizeCourseForVisitor(course: CourseDefinition) {\n  // Return safe public summary + stripped syllabusModules\n}`,
              expectedOutput: "Serialized visitor payload has zero matches for noteSections, youtubeVideoId, or correctIndex.",
              hints: [
                "Explicitly whitelist allowed keys rather than spreading `...lesson` and deleting keys.",
              ],
              solutionOutline:
                "Map modules to explicit `{ id, sortOrder, title, summary, estimatedMinutes, lessons: m.lessons.map(({ id, sortOrder, title, lessonType, durationLabel }) => ({ id, sortOrder, title, lessonType, durationLabel })) }`.",
            },
            commonMistakes: [
              {
                mistake: "Returning `{ ...course, locked: true }` from an API route",
                whyItHappens: "Object spread leaks nested `modules[].lessons[].noteSections` in the network response.",
                fix: "Construct locked DTOs with an explicit allowlist of public preview fields.",
              },
            ],
            keyTakeaways: [
              "Always resolve user identity and active enrollments on the server before returning course materials.",
              "Validate API payloads with Zod and return HTTP 400/401/403 explicitly.",
              "Use strict allowlist mapping rather than object spread when building visitor DTOs.",
            ],
            knowledgeCheck: {
              question: "What HTTP status code should POST /api/courses/[slug]/progress return when a signed-in student is not yet enrolled in that programme?",
              options: ["200 OK with empty data", "403 Forbidden explaining enrollment is required", "500 Internal Server Error"],
              correctIndex: 1,
              explanation: "Authenticated users lacking entitlement to a specific paid resource must receive 403 Forbidden.",
            },
            resources: [
              {
                id: "res-web-next",
                title: "Next.js App Router Route Handlers",
                provider: "Next.js Docs",
                url: "https://nextjs.org/docs/app/building-your-application/routing/route-handlers",
              },
              {
                id: "res-web-zod",
                title: "Zod Schema Validation Documentation",
                provider: "Zod.dev",
                url: "https://zod.dev/",
              },
            ],
          },
          {
            id: "les-web-2-video",
            sortOrder: 2,
            title: "Curated Lecture: Next.js Architecture & App Router",
            lessonType: "video",
            durationLabel: "15 min watch",
            summary: "Concise visual walkthrough of server-first routing, caching, and API boundaries.",
            learningObjectives: [
              "Configure dynamic server routes with Cache-Control: no-store for instant post-payment unlocks",
              "Differentiate static marketing routes from per-user workspace routes",
            ],
            realWorldContext:
              "If an enrollment API response is cached by an edge proxy, a student who just completed Razorpay checkout can refresh and still see a locked screen.",
            noteSections: [
              {
                heading: "Cache Hygiene on Transactional Endpoints",
                body: "Verify every paid route and order endpoint disables stale CDN caching with Cache-Control: no-store so newly verified enrollments appear immediately.",
                codeSnippet: `return NextResponse.json(payload, {\n  headers: { "Cache-Control": "no-store" },\n});`,
                takeaway: "Use no-store headers on order, verification, and enrollment-gated API responses.",
              },
            ],
            keyConcepts: [
              {
                term: "Cache-Control: no-store",
                definition: "HTTP response directive preventing browsers and CDNs from storing user-specific private payloads.",
              },
              {
                term: "Router Revalidation",
                definition: "Refreshing Next.js Server Component caches via `router.refresh()` immediately after checkout or progress mutations.",
              },
            ],
            practicalExercise: {
              title: "Audit API Cache Headers on Transactional Routes",
              difficulty: "Guided",
              estimatedMinutes: 15,
              objective: "Verify that user-specific endpoints emit no-store headers.",
              instructions: [
                "Inspect `/api/courses/[slug]` and `/api/courses/[slug]/progress` response headers.",
                "Confirm `Cache-Control: no-store` is returned on both GET and POST handlers.",
              ],
              expectedOutput: "Both endpoints set Cache-Control: no-store so stale locked states never persist after checkout.",
              hints: ["Check NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })."],
            },
            commonMistakes: [
              {
                mistake: "Caching personalized GET endpoints in production",
                whyItHappens: "Static optimization defaults or shared proxy caches.",
                fix: "Set Cache-Control: no-store on all authenticated user workspace endpoints.",
              },
            ],
            keyTakeaways: [
              "Always opt authenticated entitlement endpoints out of shared caching.",
              "Refresh server router state (`router.refresh()`) after mutation responses complete.",
            ],
            knowledgeCheck: {
              question: "Why should POST /api/verify-payment and GET /api/courses/[slug] include Cache-Control: no-store?",
              options: [
                "To make Tailwind CSS compile faster",
                "To prevent stale locked responses from being served right after a student finishes checkout",
                "To enable WebSocket HMR updates",
              ],
              correctIndex: 1,
              explanation: "no-store guarantees fresh entitlement checks immediately after checkout verification.",
            },
            youtubeVideoId: "Sklc_fQBmcs",
            youtubeUrl: "https://www.youtube.com/watch?v=Sklc_fQBmcs",
            videoCreator: "Fireship (YouTube)",
            resources: [
              {
                id: "res-web-rsc",
                title: "Next.js Server and Client Components",
                provider: "Next.js Docs",
                url: "https://nextjs.org/docs/app/getting-started/server-and-client-components",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-web-2",
          title: "Module 2 Check: Server Boundaries & Paywall Security",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-web-2-q1",
              questionType: "conceptual",
              prompt: "Where must a course's INR checkout price be resolved before creating a payment order?",
              options: [
                "From a hidden form <input> submitted by the browser",
                "From the server's authoritative course record looked up via courseId",
                "From localStorage cart state",
              ],
              correctIndex: 1,
              explanation: "Resolving prices server-side prevents request interception from tampering with checkout amounts.",
            },
            {
              id: "mq-web-2-q2",
              questionType: "code",
              prompt: "Why does returning `{ ...course, locked: true }` create an information leak?",
              options: [
                "It increases bundle font size",
                "JavaScript object spread copies nested notes, video IDs, and quiz structures into the visitor JSON response",
                "TypeScript disallows spreading interfaces",
              ],
              correctIndex: 1,
              explanation: "Always construct a whitelist-only locked DTO so unpaid materials never reach unauthenticated clients.",
            },
            {
              id: "mq-web-2-q3",
              questionType: "scenario",
              prompt: "A student completes payment and clicks Return to Course, yet sees stale locked content until a hard refresh. What likely went wrong?",
              options: [
                "Missing Cache-Control: no-store and router.refresh() after verification",
                "Too many flexbox columns",
                "Using integer paise instead of floats",
              ],
              correctIndex: 0,
              explanation: "Combining no-store responses with router.refresh() ensures Next.js fetches fresh server state immediately.",
            },
          ],
        },
      },
      {
        id: "mod-web-3",
        sortOrder: 3,
        title: "Real-World Capstone Project & Verification Discipline",
        summary:
          "Apply accessible layouts, typed API validation, automated node:test checks, and verifiable submission proof in a mentor-reviewed build.",
        estimatedMinutes: 120,
        learningOutcomes: [
          "Write fast deterministic Node unit tests verifying 401/403 authorization boundaries",
          "Prepare reproducible README guides, screenshots, and clean project rubric evidence",
        ],
        lessons: [
          {
            id: "les-web-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Accessible Learning & Verification Workspace",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary:
              "Review project milestones, evaluation rubric weights, automated test expectations, and submit your GitHub repository.",
            learningObjectives: [
              "Plan capstone milestones linking accessible frontend controls with server-verified persistence",
              "Verify every error state (400, 401, 403) using repeatable unit tests",
            ],
            realWorldContext:
              "Engineering mentors evaluate pull requests not only on happy-path screenshots, but on whether unauthorized actors are blocked and mobile layouts stay clean.",
            noteSections: [
              {
                heading: "Submission & Verification Expectations",
                body: "Include a clear README with exact local setup commands, automated unit tests covering server authorization boundaries, and verification screenshots showing keyboard navigation focus rings at both 1440px and 390px.",
                codeSnippet: `test("blocks unenrolled progress mutation with 403", async () => {\n  const res = await updateCourseLessonProgress({\n    userId: anonStudentId,\n    courseSlug: "web-architecture-systems",\n    lessonId: "les-web-1-note",\n    status: "completed",\n  });\n  assert.equal(res.statusCode, 403);\n});`,
                takeaway:
                  "Mentor feedback evaluates boundary security, accessibility semantics, and reproducible tests.",
              },
            ],
            keyConcepts: [
              {
                term: "Boundary Test",
                definition: "Automated check proving unauthorized, unauthenticated, or malformed inputs fail safely with 4xx codes.",
              },
              {
                term: "Rubric Traceability",
                definition: "Mapping each grading rubric weight directly to files, routes, and reproducible verification commands.",
              },
            ],
            diagram: {
              title: "Capstone Review & Internship Unlock Flow",
              caption: "How verified module progress leads to mentor-reviewed project sign-off and internship sprint tasks.",
              nodes: [
                { role: "1. Learn", label: "Modules + Quiz", detail: "Master semantics & server checks" },
                { role: "2. Build", label: "GitHub Capstone", detail: "Implement & write tests" },
                { role: "3. Review", label: "Mentor Rubric Audit", detail: "100-pt weighted critique" },
                { role: "4. Advance", label: "Internship Sprints", detail: "Real deliverables + certificate" },
              ],
            },
            practicalExercise: {
              title: "Draft Your Capstone Architecture Checklist Before Coding",
              difficulty: "Applied",
              estimatedMinutes: 20,
              objective: "Map each rubric criterion to concrete files and test assertions in your project repository.",
              instructions: [
                "List your public/private routes and note which require active enrollment.",
                "Specify 3 unit test cases you will run with node:test.",
                "Define your mobile (390px) responsive check before starting implementation.",
              ],
              expectedOutput: "Written architecture & test checklist ready to attach to your capstone README.",
              hints: ["Pair every requirement from the rubric directly with one verifiable test or screenshot."],
            },
            commonMistakes: [
              {
                mistake: "Submitting a GitHub repository without setup instructions or test logs",
                whyItHappens: "Rushing submission before writing a README and verifying a clean run.",
                fix: "Run `npm run build` and `npx tsx --test` locally and include the commands in your README.",
              },
            ],
            keyTakeaways: [
              "Always pair UI polish with server-enforced entitlement tests.",
              "Document reproducible test commands for your mentor reviewer.",
            ],
            knowledgeCheck: {
              question: "Which evidence makes a capstone project review quickest for a mentor to approve?",
              options: [
                "Only a screenshot of the homepage",
                "Public repo, clear README, passing boundary unit tests, and mobile + desktop verification notes",
                "Client-side console logs",
              ],
              correctIndex: 1,
              explanation: "Complete reproducible setup instructions and boundary tests let mentors verify correctness rapidly.",
            },
            resources: [
              {
                id: "res-web-http",
                title: "MDN HTTP Response Status Codes Reference",
                provider: "MDN Web Docs",
                url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-web-3",
          title: "Module 3 Check: Capstone Quality & Verification",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-web-3-q1",
              questionType: "conceptual",
              prompt: "Which aspect carries the highest security risk in a student capstone submission?",
              options: [
                "Slightly wider card padding",
                "Allowing unauthenticated or unenrolled requests to write progress records",
                "Using tabular numerals in progress badges",
              ],
              correctIndex: 1,
              explanation: "Broken server authorization allows any caller to forge progress and unlock downstream stages.",
            },
            {
              id: "mq-web-3-q2",
              questionType: "scenario",
              prompt: "If your mentor marks a project 'revision_required' due to mobile horizontal overflow, what should you inspect?",
              options: [
                "Unwrapped pre/code blocks or fixed-width containers exceeding 390px viewport width",
                "Your PostgreSQL connection string",
                "Node.js package lockfile",
              ],
              correctIndex: 0,
              explanation: "Adding `overflow-x-auto` and `min-w-0` on flex/grid children resolves 390px horizontal overflow cleanly.",
            },
          ],
        },
      },
    ],
    project: {
      slug: "accessible-learning-portfolio",
      title: "Accessible Learning Portfolio & Verification Workspace",
      summary:
        "Create an accessible React & Next.js project workspace that enforces server-side validation and clean milestone tracking.",
      brief:
        "Design and ship an interactive full-stack workspace with keyboard-navigable controls, strict Zod server validation, and database-backed progress persistence. Connects frontend polish directly to backend trust boundaries.",
      estimatedHours: 10,
      problemStatement:
        "Students building web portfolios often rely purely on static mock UIs or client-side flags, leaving API mutations unvalidated and keyboard users stranded without focus management.",
      useCase:
        "A real-world cohort workspace where learners mark module progress, validate payloads through typed Next.js Route Handlers, and verify entitlement boundaries automatically.",
      technologies: ["Next.js App Router", "TypeScript", "Tailwind CSS", "Zod", "Node Test Runner"],
      milestones: [
        "Build accessible landmarks, keyboard-reachable tabs, and high-contrast focus states",
        "Implement typed Next.js API route verifying ownership before writing progress",
        "Write automated Node/TSX tests proving unauthorized writes return 401/403",
      ],
      deliverables: [
        "Public GitHub repository with clear setup instructions",
        "Automated test run output verifying API boundary checks",
        "Short architecture reflection summarizing trade-offs",
      ],
      rubric: [
        "Zero keyboard traps and valid semantic button/link usage",
        "Server-derived authorization with zero hardcoded client secrets",
        "Clean error, loading, and empty states",
      ],
      structuredRubric: [
        {
          criterion: "Accessible Semantics & Responsive Craft",
          weightPercent: 35,
          expectation: "Semantic landmarks, Tab/Enter parity, WCAG AA contrast, zero overflow at 390px & 1440px.",
        },
        {
          criterion: "Typed Server Boundaries & Entitlement Safety",
          weightPercent: 40,
          expectation: "Zod input checks, server-computed access gates, 401/403 on unauthorized mutations.",
        },
        {
          criterion: "Automated Verification & Documentation",
          weightPercent: 25,
          expectation: "Repeatable node:test boundary tests and clear setup README.",
        },
      ],
      submissionInstructions: [
        "Push your implementation to a public GitHub repository with a clear README.",
        "Include output of passing unit tests covering 401/403/400 API boundaries.",
        "Submit the repository URL, optional live deployment URL, and a concise technical reflection.",
      ],
      mentorName: "Kabir Malhotra",
      mentorRole: "Principal Frontend Architect",
    },
  },
  {
    id: "course-python-systems",
    slug: "python-systems-cli",
    title: "Python Systems & CLI Internship Programme",
    subtitle:
      "Write deterministic Python data pipelines, defensive parsers, and fast contract tests — bundled with practical project mentorship and an included internship certificate.",
    category: "Engineering",
    level: "Core → Systems",
    pricePaise: 79900,
    currency: "INR",
    estimatedHours: 12,
    mentorName: "Ananya Rao",
    mentorRole: "Staff Systems Engineer",
    prerequisites: [
      "Core Python 3.10+ syntax (functions, loops, dictionaries, exceptions, file context managers)",
      "Basic comfort running commands in a terminal (bash/zsh/PowerShell)",
    ],
    outcomes: [
      "Stream large JSONL and CSV event logs with constant memory overhead using generators",
      "Use Python type hints, dataclasses, and strict validation contracts",
      "Normalize ISO-8601 timestamps to UTC deterministically and isolate malformed lines",
      "Ship testable CLI utilities (`main(argv)`) with clean non-zero exit codes",
    ],
    includes: [
      "3 practical learning modules with engineering notes, flow diagrams, labs & curated lectures",
      "Hands-on Python exercises, module quizzes & 1 applied CLI Telemetry Analyzer project",
      "Included Full-Stack Product Engineering Internship participation & task reviews",
      "Official Internship Completion Certificate included (₹0 extra after approval)",
    ],
    linkedInternshipSlug: "full-stack-product-engineering",
    linkedInternshipTitle: "Full-Stack Product Engineering Internship",
    internshipDurationWeeks: 8,
    includedCertificateTitle: "Python Systems & Engineering Internship Completion Certificate",
    completionRequirements: [
      "Complete all 3 Python Systems modules, exercises & pass the systems reliability quiz",
      "Build and earn mentor approval on CLI Telemetry Analyzer",
      "Complete all linked internship deliverables and receive final mentor approval",
    ],
    internshipDisclosure:
      "One single Programme Enrolment price covers all notes, video lessons, practical labs, project review, internship participation, and your completion certificate at ₹0 extra once approved. Studio projects do not constitute external job placement guarantees.",
    isPublished: true,
    contentStatus: "published",
    modules: [
      {
        id: "mod-py-1",
        sortOrder: 1,
        title: "Streaming Generators & Typed Records",
        summary: "Process arbitrary-sized log files safely using Python iterators and strict schema dataclasses.",
        estimatedMinutes: 85,
        learningOutcomes: [
          "Explain O(1) memory streaming vs loading lists via readlines()/json.load()",
          "Model validated log events using frozen @dataclass records and explicit error objects",
        ],
        lessons: [
          {
            id: "les-py-1-note",
            sortOrder: 1,
            title: "Bounded Memory Parsing with Generators",
            lessonType: "note",
            durationLabel: "20 min read",
            summary: "Avoid loading entire datasets into RAM when summarizing sequential event streams.",
            learningObjectives: [
              "Use `yield` inside file context managers to process gigabyte-scale logs line by line",
              "Isolate malformed JSONL rows into structured warnings instead of crashing pipelines",
            ],
            realWorldContext:
              "Production log analyzers often crash in containers with 512MB RAM limits when scripts call `file.readlines()` on multi-gigabyte telemetry dumps.",
            noteSections: [
              {
                heading: "Line-by-Line Lazy Iteration",
                body: "Opening files lazily and yielding validated dataclasses keeps resident memory flat even across multi-gigabyte archives. Each line is parsed, validated, and immediately yielded to downstream aggregators.",
                codeSnippet: `from dataclasses import dataclass\nfrom pathlib import Path\nfrom typing import Iterator\nimport json\n\n@dataclass(frozen=True)\nclass EventRow:\n    line_no: int\n    service: str\n    status_code: int\n\ndef iter_records(path: Path) -> Iterator[EventRow]:\n    with path.open("r", encoding="utf-8") as handle:\n        for line_no, raw in enumerate(handle, start=1):\n            stripped = raw.strip()\n            if not stripped:\n                continue\n            payload = json.loads(stripped)\n            yield EventRow(\n                line_no=line_no,\n                service=str(payload["service"]),\n                status_code=int(payload["status_code"]),\n            )`,
                takeaway:
                  "Separate parsing errors into structured warnings instead of crashing mid-stream.",
              },
              {
                heading: "Structured Warning Accounting",
                body: "Instead of letting a single corrupted log line abort an entire nightly summary, catch JSONDecodeError or KeyError per row and increment a `skipped_rows` counter alongside line numbers.",
                takeaway: "Every resilient ETL script outputs both metrics and skipped-line diagnostics.",
              },
            ],
            keyConcepts: [
              {
                term: "Generator (Iterator)",
                definition: "A Python function using `yield` that produces one item at a time on demand without storing the full list in RAM.",
              },
              {
                term: "Frozen Dataclass",
                definition: "`@dataclass(frozen=True)` creates immutable typed record objects preventing accidental mutation downstream.",
              },
            ],
            diagram: {
              title: "Constant-Memory JSONL Streaming Pipeline",
              caption: "Each line flows from file descriptor -> validator -> aggregator without full-file buffering.",
              nodes: [
                { role: "1. Input", label: "Path.open() Stream", detail: "Reads 1 line buffer at a time" },
                { role: "2. Validate", label: "parse_event(raw)", detail: "Valid EventRow or Warning" },
                { role: "3. Aggregate", label: "Counters / UTC Buckets", detail: "In-memory daily summary only" },
              ],
            },
            practicalExercise: {
              title: "Stream & Count Status Codes Without readlines()",
              difficulty: "Guided",
              estimatedMinutes: 20,
              objective: "Implement a lazy generator parser that skips blank or corrupted JSONL rows cleanly.",
              instructions: [
                "Copy the sample JSONL lines below containing valid rows, a blank line, and a malformed JSON line.",
                "Write `iter_safe_events(lines)` returning valid `(EventRow | ParseWarning)` values.",
                "Verify total valid count = 2 and warning count = 1 without raising an unhandled exception.",
              ],
              sampleData: `{"service": "checkout", "status_code": 200}\n\n{corrupt_json\n{"service": "auth", "status_code": 401}`,
              expectedOutput: "Processed 2 valid events, skipped 1 malformed row at line 3.",
              hints: ["Use `enumerate(lines, start=1)` so error diagnostics report exact 1-based line numbers."],
            },
            commonMistakes: [
              {
                mistake: "Calling `[json.loads(line) for line in handle]` inside a helper",
                whyItHappens: "List comprehensions materialize the entire dataset in memory before returning.",
                fix: "Replace brackets `[...]` with generator parentheses `(...)` or `yield` inside a function.",
              },
            ],
            keyTakeaways: [
              "Generators keep peak RAM flat regardless of log file size.",
              "Typed `@dataclass(frozen=True)` records catch schema mismatches early.",
              "Isolate corrupt lines with explicit line-number warnings.",
            ],
            knowledgeCheck: {
              question: "Why is `for line in handle:` paired with `yield` preferred over `handle.readlines()` for 4GB log files?",
              options: [
                "`readlines()` converts keys to lowercase automatically",
                "`readlines()` loads all lines into RAM at once, whereas iterating `handle` with `yield` keeps memory O(1)",
                "`yield` runs multi-threaded automatically",
              ],
              correctIndex: 1,
              explanation: "Lazy file iteration processes one line at a time so huge files never trigger out-of-memory kills.",
            },
            resources: [
              {
                id: "res-py-pathlib",
                title: "Python Docs: pathlib Path objects",
                provider: "Python.org",
                url: "https://docs.python.org/3/library/pathlib.html",
              },
              {
                id: "res-py-dataclasses",
                title: "Python Docs: dataclasses",
                provider: "Python.org",
                url: "https://docs.python.org/3/library/dataclasses.html",
              },
            ],
          },
          {
            id: "les-py-1-video",
            sortOrder: 2,
            title: "Curated Lecture: Modern Python Type & Runtime Overview",
            lessonType: "video",
            durationLabel: "18 min watch",
            summary: "Curated overview of Python idioms, generators, type annotations, and clean module structure.",
            learningObjectives: [
              "Distinguish generator expressions from eager list comprehensions",
              "Apply explicit return annotations on data transformation helpers",
            ],
            realWorldContext: "Clear type signatures allow teammates and static analyzers to spot None/Optional bugs before running batch jobs.",
            noteSections: [
              {
                heading: "Key Video Notes",
                body: "Compare list comprehensions vs. generator expressions when feeding downstream aggregation steps such as `sum()`, `Counter()`, or file writers.",
                takeaway: "Prefer generators for single-pass pipelines.",
              },
            ],
            keyConcepts: [
              {
                term: "Generator Expression",
                definition: "Lazy expression `(transform(x) for x in items)` evaluated element-by-element.",
              },
              {
                term: "Iterable Type Hint",
                definition: "`collections.abc.Iterable[T]` annotation allowing lists, tuples, or lazy generators interchangeably.",
              },
            ],
            practicalExercise: {
              title: "Add Type Hints & Generator Sum to an Existing Helper",
              difficulty: "Guided",
              estimatedMinutes: 10,
              objective: "Convert an untyped list-allocating calculation into a typed generator expression.",
              instructions: [
                "Rewrite `sum([x['bytes'] for x in rows])` to avoid intermediate list allocation.",
                "Add parameter and return type annotations (`-> int`).",
              ],
              starterCode: `def total_bytes(rows):\n    return sum([r["bytes"] for r in rows])`,
              expectedOutput: "`def total_bytes(rows: Iterable[dict[str, int]]) -> int: return sum(r['bytes'] for r in rows)`",
              hints: ["Simply remove the square brackets inside `sum(...)`."],
            },
            commonMistakes: [
              {
                mistake: "Consuming a generator twice expecting the second loop to replay elements",
                whyItHappens: "Generators exhaust on their first full pass.",
                fix: "Compute multiple metrics inside a single `for item in stream:` pass.",
              },
            ],
            keyTakeaways: [
              "Generators are single-pass streams — aggregate all counters in one pass.",
              "Annotate function parameters and return types consistently.",
            ],
            knowledgeCheck: {
              question: "What happens if you iterate over a Python generator variable a second time?",
              options: [
                "It resets to the beginning automatically",
                "It yields zero items because the iterator is already exhausted",
                "It re-opens the source file automatically",
              ],
              correctIndex: 1,
              explanation: "Generators maintain a cursor and exhaust after one traversal; accumulate multiple counters in a single pass.",
            },
            youtubeVideoId: "x7X9w_GIm1s",
            youtubeUrl: "https://www.youtube.com/watch?v=x7X9w_GIm1s",
            videoCreator: "Fireship (YouTube)",
            resources: [
              {
                id: "res-py-json",
                title: "Python Docs: json — JSON encoder and decoder",
                provider: "Python.org",
                url: "https://docs.python.org/3/library/json.html",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-py-1",
          title: "Module 1 Check: Streaming & Typed Records",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-py-1-q1",
              questionType: "conceptual",
              prompt: "Why wrap parsed log events in `@dataclass(frozen=True)` instead of raw nested dicts?",
              options: [
                "Dictionaries cannot hold integers",
                "Frozen dataclasses enforce consistent field names, types, and immutability across the pipeline",
                "Dataclasses run faster than C extensions",
              ],
              correctIndex: 1,
              explanation: "Immutable typed dataclasses make schema contracts explicit and catch misspelled keys immediately.",
            },
            {
              id: "mq-py-1-q2",
              questionType: "code",
              prompt: "How should a streaming parser handle a malformed JSON line at line 42 of 1,000,000?",
              options: [
                "Record a structured warning with line number 42 and continue yielding valid lines",
                "Silently ignore it with bare `except: pass` and no counter",
                "Crash the whole CLI without printing the line number",
              ],
              correctIndex: 0,
              explanation: "Tracking line numbers and warning counts preserves data integrity without losing 999,999 valid records.",
            },
            {
              id: "mq-py-1-q3",
              questionType: "scenario",
              prompt: "Your script computes both `total_errors` and `total_bytes` from one generator stream, but `total_bytes` prints 0. Why?",
              options: [
                "The first `sum()` loop exhausted the single-pass generator before the second loop ran",
                "Python `sum()` clears dictionaries",
                "UTF-8 encoding skips numbers",
              ],
              correctIndex: 0,
              explanation: "Accumulate both totals inside one single loop over the generator.",
            },
          ],
        },
      },
      {
        id: "mod-py-2",
        sortOrder: 2,
        title: "Boundary Testing, UTC Normalization & Deterministic CLIs",
        summary: "Test malformed payloads, mixed timezone offsets, and CLI exit codes cleanly.",
        estimatedMinutes: 90,
        learningOutcomes: [
          "Write testable `main(argv: list[str] | None = None) -> int` CLI entrypoints",
          "Normalize mixed ISO-8601 offsets (`+05:30`, `Z`) cleanly into UTC dates",
        ],
        lessons: [
          {
            id: "les-py-2-note",
            sortOrder: 1,
            title: "Contract Tests & Non-Zero Exit Codes",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Design testable command entrypoints accepting explicit argument vectors and streams.",
            learningObjectives: [
              "Decouple CLI argument parsing from `sys.argv` for fast unit testing",
              "Return Unix-standard exit codes (`0` success, `1` runtime/file error, `2` invalid CLI args)",
            ],
            realWorldContext:
              "CI runners and cron orchestrators detect job failures solely via exit codes; scripts that print 'Error' and exit with 0 hide broken pipelines.",
            noteSections: [
              {
                heading: "Testable main(argv) Entrypoints",
                body: "Never bind argparse directly inside top-level script execution; accept `argv: list[str] | None = None` so unittest/pytest can exercise missing files, bad flags, and formatted outputs cleanly without spawning subprocesses.",
                codeSnippet: `def main(argv: list[str] | None = None) -> int:\n    parser = build_parser()\n    args = parser.parse_args(argv)\n    if not args.input.exists():\n        print(f"Missing log file: {args.input}", file=sys.stderr)\n        return 1\n    summarize_file(args.input, fmt=args.format)\n    return 0\n\nif __name__ == "__main__":\n    raise SystemExit(main())`,
                takeaway: "Deterministic exit codes turn scripts into reliable automation building blocks.",
              },
              {
                heading: "UTC Timestamp Normalization",
                body: "Normalize every timestamp string using `datetime.fromisoformat(ts.replace('Z', '+00:00')).astimezone(timezone.utc)` so events from IST (`+05:30`) and UTC aggregate under exact calendar buckets.",
                takeaway: "Always convert timestamps to UTC before grouping by day or hour.",
              },
            ],
            keyConcepts: [
              {
                term: "Exit Code Contract",
                definition: "Integer status (`0` = OK, non-zero = error) returned by a CLI process to its parent shell or CI runner.",
              },
              {
                term: "Timezone-Aware Datetime",
                definition: "A Python `datetime` with explicit `tzinfo` preventing ambiguous local-clock bugs across servers.",
              },
            ],
            practicalExercise: {
              title: "Write a Unit Test for Missing File Exit Code",
              difficulty: "Applied",
              estimatedMinutes: 20,
              objective: "Verify `main(['--input', 'missing.jsonl'])` returns exit code 1 cleanly without throwing.",
              instructions: [
                "Use Python's built-in `unittest.TestCase`.",
                "Pass a nonexistent temporary file path into `main(['--input', ...])`.",
                "Assert the return value equals `1`.",
              ],
              starterCode: `import unittest\nfrom cli import main\n\nclass TestCli(unittest.TestCase):\n    def test_missing_file_returns_nonzero(self):\n        # Call main with missing path and assertEqual(..., 1)\n        pass`,
              expectedOutput: "`Ran 1 test in 0.002s - OK` with exit code assertion passing.",
              hints: ["Return an `int` from `main(argv)` instead of calling `sys.exit(1)` directly inside library code."],
            },
            commonMistakes: [
              {
                mistake: "Calling `sys.exit(1)` inside core library helpers",
                whyItHappens: "Conflating domain validation with process termination.",
                fix: "Raise typed exceptions or return integer status codes from `main(argv)`, calling `raise SystemExit(main())` only inside `if __name__ == '__main__':`.",
              },
            ],
            keyTakeaways: [
              "Accept `argv: list[str] | None = None` so unit tests invoke your CLI in milliseconds.",
              "Write error diagnostics to `sys.stderr` so stdout stays machine-readable JSON/table data.",
              "Convert all incoming timestamps to UTC prior to bucketing.",
            ],
            knowledgeCheck: {
              question: "Where should diagnostic error messages be printed in a CLI outputting JSON summaries?",
              options: [
                "Mixed into stdout JSON arrays",
                "To `sys.stderr`, accompanied by a non-zero exit code",
                "Swallowed silently",
              ],
              correctIndex: 1,
              explanation: "Writing errors to stderr keeps stdout valid for downstream pipes such as `jq`.",
            },
            resources: [
              {
                id: "res-py-unittest",
                title: "Python Docs: unittest framework",
                provider: "Python.org",
                url: "https://docs.python.org/3/library/unittest.html",
              },
            ],
          },
          {
            id: "les-py-2-video",
            sortOrder: 2,
            title: "Curated Lecture: Complete Python Foundations Reference",
            lessonType: "video",
            durationLabel: "45 min reference",
            summary: "Comprehensive freeCodeCamp Python walkthrough for rapid syntax, exception handling, and file I/O review.",
            learningObjectives: [
              "Use narrow `try/except` blocks around untrusted I/O",
              "Review file context manager guarantees",
            ],
            realWorldContext: "Narrow exception clauses prevent catching KeyboardInterrupt or real AttributeErrors accidentally.",
            noteSections: [
              {
                heading: "Suggested Chapters: Exceptions & Files",
                body: "Focus on file handling, narrow exception guards (`ValueError`, `json.JSONDecodeError`), and dictionary aggregation (`collections.Counter` / `defaultdict`).",
                takeaway: "Keep exception blocks narrow around untrusted I/O.",
              },
            ],
            keyConcepts: [
              {
                term: "Narrow Exception Guard",
                definition: "Catching specific exceptions like `json.JSONDecodeError` rather than broad `except Exception:`.",
              },
              {
                term: "Context Manager (`with`)",
                definition: "Guarantees deterministic file descriptor cleanup even when parse exceptions occur mid-stream.",
              },
            ],
            practicalExercise: {
              title: "Replace Broad Exception Handler with Explicit Types",
              difficulty: "Guided",
              estimatedMinutes: 10,
              objective: "Ensure genuine programming bugs still surface while malformed inputs are handled gracefully.",
              instructions: [
                "Inspect a parser catching bare `except Exception:`.",
                "Narrow it to `except (json.JSONDecodeError, KeyError, ValueError) as exc:`.",
              ],
              expectedOutput: "Only expected row parse issues become structured warnings; unexpected TypeErrors fail loudly.",
              hints: ["Tuple syntax `except (ErrA, ErrB) as exc:` catches multiple expected input errors cleanly."],
            },
            commonMistakes: [
              {
                mistake: "Using bare `except:` blocks",
                whyItHappens: "Quick way to silence crashes during prototyping.",
                fix: "Catch specific parse/IO errors and include context when logging warnings.",
              },
            ],
            keyTakeaways: [
              "Always pair `with open(...)` context managers with explicit `encoding='utf-8'`.",
              "Catch only expected data-format exceptions.",
            ],
            knowledgeCheck: {
              question: "Why avoid bare `except:` clauses in data parsers?",
              options: [
                "They slow down loops",
                "They swallow syntax/attribute bugs and SystemExit signals instead of isolating data errors",
                "Python 3 forbids `try` inside functions",
              ],
              correctIndex: 1,
              explanation: "Specific exception tuples keep genuine code defects visible during testing.",
            },
            youtubeVideoId: "rfscVS0vtbw",
            youtubeUrl: "https://www.youtube.com/watch?v=rfscVS0vtbw",
            videoCreator: "freeCodeCamp.org (YouTube)",
            resources: [
              {
                id: "res-py-pathlib",
                title: "Python Docs: pathlib — Object-oriented filesystem paths",
                provider: "Python.org",
                url: "https://docs.python.org/3/library/pathlib.html",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-py-2",
          title: "Module 2 Check: CLI Architecture & UTC Normalization",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-py-2-q1",
              questionType: "conceptual",
              prompt: "Why define `def main(argv: list[str] | None = None) -> int` instead of parsing `sys.argv` globally?",
              options: [
                "To enable fast deterministic unit tests passing mock flag arrays directly",
                "Python requires every file to have `main(argv)`",
                "To avoid installing standard library argparse",
              ],
              correctIndex: 0,
              explanation: "Parameterized `argv` lets unittest test flags and exit codes without slow subprocess calls.",
            },
            {
              id: "mq-py-2-q2",
              questionType: "scenario",
              prompt: "Events logged at `2026-11-16T22:00:00+05:30` and `2026-11-16T16:30:00Z` occur at the same UTC instant. How do you ensure both land in the same daily bucket?",
              options: [
                "Slice the first 10 characters `ts[:10]`",
                "Parse timezone-aware datetimes and normalize with `.astimezone(timezone.utc)` before extracting `.date()`",
                "Strip the timezone suffix completely",
              ],
              correctIndex: 1,
              explanation: "Converting to UTC before reading `.date()` prevents off-by-one-day drift across time zones.",
            },
          ],
        },
      },
      {
        id: "mod-py-3",
        sortOrder: 3,
        title: "Capstone CLI Telemetry Analyzer",
        summary: "Ship your streaming Python parser with unit tests, UTC normalization, and clean architecture notes.",
        estimatedMinutes: 110,
        learningOutcomes: [
          "Deliver a reproducible streaming CLI tool tested on malformed JSONL edge cases",
        ],
        lessons: [
          {
            id: "les-py-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Build CLI Telemetry Analyzer",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Complete milestones and submit your repository for Ananya Rao's review.",
            learningObjectives: [
              "Combine lazy streaming, UTC bucketing, table/JSON flags, and unit tests into one polished CLI",
              "Generate byte-identical deterministic JSON reports sorted across runs",
            ],
            realWorldContext: "Telemetry analyzers are staple internal developer tools for triaging incidents cleanly from exported JSONL logs.",
            noteSections: [
              {
                heading: "Milestone Checklist",
                body: "Verify your streaming parser handles blank lines, invalid JSON rows, and mixed UTC offsets gracefully while returning exit code 0 on valid runs and 1 on unreadable paths.",
                takeaway: "Submit reproducible `python -m unittest` commands alongside your artifact link.",
              },
            ],
            keyConcepts: [
              {
                term: "Deterministic Report Output",
                definition: "Sorting output keys/dates consistently so repeated runs over identical logs yield byte-identical reports.",
              },
              {
                term: "Diagnostic Side-Channel",
                definition: "Emitting malformed-line warnings to `stderr` while keeping `stdout` valid machine-readable JSON.",
              },
            ],
            practicalExercise: {
              title: "Dry-Run Sample Telemetry Verification",
              difficulty: "Applied",
              estimatedMinutes: 20,
              objective: "Test your CLI against a mixed-timezone, partially corrupted 5-line JSONL fixture.",
              instructions: [
                "Create `sample_events.jsonl` with valid UTC, `+05:30`, empty, and corrupt rows.",
                "Run `python -m analyzer --input sample_events.jsonl --format json` and confirm valid JSON output on stdout and warnings on stderr.",
              ],
              expectedOutput: "Clean JSON daily summary on stdout; diagnostic skip count on stderr.",
              hints: ["Use `json.dumps(..., indent=2, sort_keys=True)` for deterministic ordering."],
            },
            commonMistakes: [
              {
                mistake: "Forgetting `encoding='utf-8'` on Windows/Linux file opens",
                whyItHappens: "Default OS locale encodings differ across environments.",
                fix: "Always pass `encoding='utf-8'` explicitly to `path.open(...)`.",
              },
            ],
            keyTakeaways: [
              "Sort dates and output keys for reproducible test snapshots.",
              "Document exact CLI usage and test commands in your README.",
            ],
            knowledgeCheck: {
              question: "What flag combination proves your CLI supports both human and automation workflows?",
              options: [
                "Interactive `input()` prompts only",
                "`--format table` for terminal inspection and `--format json` writing clean JSON to stdout",
                "Hardcoded file paths with no CLI flags",
              ],
              correctIndex: 1,
              explanation: "Supporting both table and structured JSON modes serves humans and CI pipelines equally.",
            },
            resources: [
              {
                id: "res-py-cli-json",
                title: "Python Docs: json — Deterministic JSON serialization",
                provider: "Python.org",
                url: "https://docs.python.org/3/library/json.html",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-py-3",
          title: "Module 3 Check: Telemetry Analyzer Readiness",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-py-3-q1",
              questionType: "conceptual",
              prompt: "Which guarantee is most critical when summarizing a 10GB telemetry log?",
              options: [
                "Constant memory streaming without buffering the entire file",
                "Adding colorized ASCII banners to stdout JSON",
                "Sorting the entire raw file in memory first",
              ],
              correctIndex: 0,
              explanation: "O(1) line-by-line streaming avoids out-of-memory errors on arbitrarily large inputs.",
            },
            {
              id: "mq-py-3-q2",
              questionType: "scenario",
              prompt: "Your unit tests pass locally, but fail in CI because one server defaults to Latin-1 encoding. What prevents this?",
              options: [
                "Explicitly specifying `encoding='utf-8'` on every `open()` call",
                "Switching from dataclasses to tuples",
                "Disabling stderr output",
              ],
              correctIndex: 0,
              explanation: "Explicit UTF-8 guarantees identical file decoding across operating systems.",
            },
          ],
        },
      },
    ],
    project: {
      slug: "cli-telemetry-analyzer",
      title: "CLI Telemetry Analyzer",
      summary:
        "Parse structured JSONL activity logs in Python, compute rolling metrics, and export clean summary reports.",
      brief:
        "Build a command-line tool that ingests raw event streams, validates timestamps and malformed rows cleanly, and outputs reproducible daily summaries. Compare trade-offs between streaming generators and in-memory aggregation.",
      estimatedHours: 6,
      problemStatement:
        "Ops teams often struggle to inspect multi-gigabyte JSONL logs containing corrupt lines and mixed time zones without crashing container memory or writing brittle one-off scripts.",
      useCase:
        "Reproducible Python CLI tool producing deterministic daily error/latency summaries for backend engineering teams.",
      technologies: ["Python 3.11+", "pathlib", "dataclasses", "argparse", "unittest"],
      milestones: [
        "Implement streaming JSONL reader with strict ISO-8601 UTC normalization",
        "Add summary aggregation exported cleanly as formatted table or JSON",
        "Ship comprehensive unit tests covering malformed rows and exit codes",
      ],
      deliverables: [
        "Typed Python CLI accepting input log path and output format flags",
        "Unit test suite covering malformed JSON and timezone edge cases",
        "Short architecture note explaining data validation choices",
      ],
      rubric: [
        "Constant memory streaming across large sample files",
        "Explicit structured error reporting without unhandled stack traces",
        "Passing automated test coverage",
      ],
      structuredRubric: [
        {
          criterion: "Streaming & Memory Safety",
          weightPercent: 35,
          expectation: "Uses lazy generator iteration (`yield`) with constant memory overhead and explicit UTF-8 handling.",
        },
        {
          criterion: "Defensive Parsing & UTC Contracts",
          weightPercent: 35,
          expectation: "Normalizes ISO-8601 offsets to UTC cleanly and reports corrupt lines cleanly without crashing.",
        },
        {
          criterion: "Testable CLI & Automated Coverage",
          weightPercent: 30,
          expectation: "Parameterized `main(argv) -> int`, clean exit codes, and deterministic `unittest` suite.",
        },
      ],
      submissionInstructions: [
        "Push your Python package, sample JSONL fixtures, and tests to GitHub.",
        "Include exact `python -m unittest` command and sample `--format table` output in README.",
      ],
      mentorName: "Ananya Rao",
      mentorRole: "Staff Systems Engineer",
    },
  },
  {
    id: "course-applied-ai",
    slug: "applied-ai-evaluation",
    title: "Applied AI & Evaluation Internship Programme",
    subtitle:
      "Build measurable LLM evaluation harnesses, golden test suites, and regression checks — bundled with an 8-week Applied AI & Data Systems internship and included certificate.",
    category: "Data & AI",
    level: "Intermediate → Studio",
    pricePaise: 149900,
    currency: "INR",
    estimatedHours: 16,
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Researcher",
    prerequisites: [
      "Working fluency in Python or TypeScript and handling JSON API responses",
      "Familiarity with basic probability, precision/recall intuition, and REST APIs",
    ],
    outcomes: [
      "Design curated golden datasets measuring accuracy, JSON schema adherence, and refusal quality",
      "Replace subjective prompt tuning ('vibe checking') with repeatable regression diffs",
      "Calibrate confidence thresholds and deterministic fallbacks for uncertain outputs",
      "Complete the Applied AI & Data Systems Internship and earn an included completion certificate",
    ],
    includes: [
      "3 deep applied AI evaluation modules with study notes, flow diagrams, labs & curated Karpathy/3B1B lectures",
      "Hands-on eval dataset & harness exercises, module quizzes & mentor rubric feedback",
      "8-week Applied AI & Data Systems Internship participation & dataset/diff tasks",
      "Official Internship Completion Certificate included (₹0 extra after approval)",
    ],
    linkedInternshipSlug: "applied-ai-data-systems",
    linkedInternshipTitle: "Applied AI & Data Systems Internship",
    internshipDurationWeeks: 8,
    includedCertificateTitle: "Applied AI & Data Systems Internship Completion Certificate",
    completionRequirements: [
      "Complete all 3 Applied AI modules, exercises & pass the evaluation engineering quiz",
      "Earn mentor approval on Structured AI Evaluation Harness",
      "Finish golden dataset & regression diff internship tasks and receive final approval",
    ],
    internshipDisclosure:
      "One Programme Enrolment covers all study notes, curated videos, hands-on eval labs, project critique, the 8-week Applied AI & Data Systems Internship, and your verified completion certificate at ₹0 extra once approved.",
    isPublished: true,
    contentStatus: "published",
    modules: [
      {
        id: "mod-ai-1",
        sortOrder: 1,
        title: "LLM Foundations & Golden Datasets",
        summary: "Understand token prediction limits and design non-leaky evaluation benchmarks.",
        estimatedMinutes: 95,
        learningOutcomes: [
          "Structure stratified JSONL benchmarks covering normal, boundary, and adversarial cases",
          "Distinguish deterministic code assertions from probabilistic rubric judging",
        ],
        lessons: [
          {
            id: "les-ai-1-note",
            sortOrder: 1,
            title: "Why Demos Fail in Production Without Evals",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Structuring labeled edge-case suites before changing prompts or model weights.",
            learningObjectives: [
              "Build versioned JSONL test fixtures with expected tags and failure categories",
              "Write deterministic schema + constraint assertions prior to tuning prompts",
            ],
            realWorldContext:
              "Teams often tweak a system prompt to fix one customer bug, unknowingly breaking 20% of structured JSON outputs elsewhere because they have no baseline regression suite.",
            noteSections: [
              {
                heading: "Separating Smoke Tests from Regression Benchmarks",
                body: "Collect real failure modes—ambiguous inputs, empty contexts, multilingual noise, and adversarial formatting—into a versioned JSONL benchmark before tuning system instructions.",
                codeSnippet: `// Example golden dataset row (eval_cases.jsonl)\n{\n  "id": "case-014",\n  "category": "empty_context_refusal",\n  "input": "Summarize the refund terms in the attached invoice.",\n  "context": "",\n  "expectedBehavior": "refuse_insufficient_context",\n  "mustNotContain": ["30-day guarantee", "full refund"]\n}`,
                takeaway: "If you cannot measure prompt regressions deterministically, you are shipping blind.",
              },
              {
                heading: "Layered Assertion Design",
                body: "Always run cheap deterministic checks first (valid JSON, Zod/Pydantic schema pass, forbidden-phrase regex, latency ceiling) before invoking slower LLM-as-a-judge semantic checks.",
                takeaway: "Deterministic checks catch 70% of regressions at zero extra API cost.",
              },
            ],
            keyConcepts: [
              {
                term: "Golden Dataset",
                definition: "Curated, version-controlled input/expectation pairs representing real production distribution and edge cases.",
              },
              {
                term: "Prompt Regression",
                definition: "A previously working test slice degrading in accuracy or formatting after a prompt or model change.",
              },
            ],
            diagram: {
              title: "Two-Stage Evaluation Funnel",
              caption: "Fast deterministic validators filter schema failures before semantic scoring runs.",
              nodes: [
                { role: "1. Suite", label: "Golden JSONL Cases", detail: "Normal + edge + adversarial" },
                { role: "2. Fast Gate", label: "Schema & Regex Checks", detail: "100% deterministic pass/fail" },
                { role: "3. Judge", label: "Rubric / Exact Match", detail: "Slice pass-rate delta" },
              ],
            },
            practicalExercise: {
              title: "Author 5 Adversarial Golden Evaluation Cases",
              difficulty: "Applied",
              estimatedMinutes: 20,
              objective: "Design structured JSONL cases targeting prompt injection, empty context, and JSON format traps.",
              instructions: [
                "Create 5 JSONL records covering: clean input, empty context, contradictory instructions, non-English phrase, and strict enum constraint.",
                "Specify deterministic `mustMatchSchema` and `expectedAction` fields on each record.",
              ],
              expectedOutput: "5 reproducible JSONL test cases cleanly categorized by failure slice.",
              hints: ["Include at least one prompt-injection string inside `context` to test boundary adherence."],
            },
            commonMistakes: [
              {
                mistake: "Testing only 3 happy-path examples written by the prompt author",
                whyItHappens: "Confirmation bias during rapid prototyping.",
                fix: "Reserve 40%+ of eval cases for empty inputs, malformed user queries, and edge cases.",
              },
            ],
            keyTakeaways: [
              "Freeze a golden JSONL baseline before iterating on system instructions.",
              "Run deterministic schema and forbidden-string assertions before semantic scoring.",
            ],
            knowledgeCheck: {
              question: "Which check should execute FIRST in an automated LLM evaluation runner?",
              options: [
                "A second expensive LLM judge call",
                "Deterministic checks such as JSON parsing, schema adherence, and latency limits",
                "Manual human review of every row",
              ],
              correctIndex: 1,
              explanation: "Deterministic assertions run in milliseconds, cost nothing, and eliminate structural failures first.",
            },
            resources: [
              {
                id: "res-ai-evals",
                title: "OpenAI Evals Design Guide",
                provider: "OpenAI Docs",
                url: "https://platform.openai.com/docs/guides/evals",
              },
              {
                id: "res-ai-hf",
                title: "Hugging Face Evaluate Library",
                provider: "Hugging Face",
                url: "https://huggingface.co/docs/evaluate/index",
              },
            ],
          },
          {
            id: "les-ai-1-video",
            sortOrder: 2,
            title: "Curated Lecture: Intro to Large Language Models",
            lessonType: "video",
            durationLabel: "60 min watch",
            summary: "Foundational systems lecture on pretraining, fine-tuning, tool use, and security.",
            learningObjectives: [
              "Contrast base next-token prediction with instruction-tuned assistants",
              "Recognize prompt injection and untrusted-data security boundaries",
            ],
            realWorldContext: "Understanding LLM mechanics prevents treating probabilistic token generation like a deterministic SQL database.",
            noteSections: [
              {
                heading: "Study Prompts: Trusting Tool Boundaries",
                body: "Note the distinction between base next-token prediction, supervised fine-tuning, and tool calling. Never feed unverified model text directly into shell commands or SQL queries.",
                takeaway: "Treat model outputs as untrusted data until verified by schema or tool checks.",
              },
            ],
            keyConcepts: [
              {
                term: "Prompt Injection",
                definition: "Untrusted text inside retrieved documents or user inputs attempting to override system instructions.",
              },
              {
                term: "Tool-Call Boundary",
                definition: "Deterministic server validation enforcing schema types and user ownership before executing any model-proposed function.",
              },
            ],
            practicalExercise: {
              title: "Identify 3 Untrusted Input Vectors in a RAG Flow",
              difficulty: "Guided",
              estimatedMinutes: 15,
              objective: "Map where schema/allowlist guards must sanitize model tool calls.",
              instructions: [
                "Given an AI support bot with `lookup_order(order_id)` and `issue_refund(amount)`, classify which inputs come from untrusted sources.",
                "Define server-side validation rules preventing model-suggested refund tampering.",
              ],
              expectedOutput: "Written validation rule list ensuring database-backed user ownership checks on every tool call.",
              hints: ["Tool functions must re-verify `user_id` ownership server-side regardless of arguments generated by the model."],
            },
            commonMistakes: [
              {
                mistake: "Allowing LLM tool arguments to bypass authorization checks",
                whyItHappens: "Assuming system prompts act as security firewalls.",
                fix: "Enforce authentication and role authorization inside the executed tool function itself.",
              },
            ],
            keyTakeaways: [
              "System prompts guide behavior; server code enforces security.",
              "Validate every model-generated tool call against strict schemas and user entitlements.",
            ],
            knowledgeCheck: {
              question: "Can a carefully worded system prompt alone guarantee defense against prompt injection?",
              options: [
                "Yes, LLMs never ignore system prompts",
                "No — system prompts are soft guidance; security boundaries must live in server code and schema validators",
                "Only when temperature is set to 0",
              ],
              correctIndex: 1,
              explanation: "Authorization and input bounds must always be enforced deterministically in server code.",
            },
            youtubeVideoId: "zjkBMFhNj_g",
            youtubeUrl: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
            videoCreator: "Andrej Karpathy (YouTube)",
            resources: [
              {
                id: "res-ai-owasp",
                title: "OWASP API Security Top 10 Project",
                provider: "OWASP",
                url: "https://owasp.org/www-project-api-security/",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-ai-1",
          title: "Module 1 Check: Golden Datasets & LLM Trust",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-ai-1-q1",
              questionType: "conceptual",
              prompt: "Why include an explicit `category` or slice tag on every golden evaluation case?",
              options: [
                "So aggregate accuracy doesn't hide catastrophic failures inside critical slices like refusals or safety",
                "JSONL requires a category key",
                "To make token counts shorter",
              ],
              correctIndex: 0,
              explanation: "Slice-level metrics expose regressions hidden by overall averages.",
            },
            {
              id: "mq-ai-1-q2",
              questionType: "scenario",
              prompt: "Prompt v2 raises overall score from 84% to 88%, but `empty_context_refusal` drops from 95% to 40%. Should v2 ship?",
              options: [
                "Yes, because the average went up",
                "No — a severe hallucination regression in a high-risk slice blocks release until fixed",
                "Only if latency improved",
              ],
              correctIndex: 1,
              explanation: "Evaluating slice deltas prevents shipping silent safety or hallucination regressions.",
            },
          ],
        },
      },
      {
        id: "mod-ai-2",
        sortOrder: 2,
        title: "Rubrics, Calibration & Comparison Diffs",
        summary: "Measure schema pass rates, calibration thresholds, and prompt A/B regressions cleanly.",
        estimatedMinutes: 95,
        learningOutcomes: [
          "Compute side-by-side prompt diff tables showing fixed vs regressed test IDs",
          "Calibrate confidence thresholds separating auto-accept from human review",
        ],
        lessons: [
          {
            id: "les-ai-2-note",
            sortOrder: 1,
            title: "Deterministic Scoring Rubrics & A/B Diff Runners",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Comparing baseline vs candidate prompt variants cleanly case-by-case.",
            learningObjectives: [
              "Build a paired comparison diff reporting Wins, Losses, and Ties per case ID",
              "Prevent label leakage when calibrating threshold cutoffs",
            ],
            realWorldContext: "Knowing a prompt scored '78% vs 74%' is rarely enough — engineers need to see the exact 3 cases that flipped from pass to fail.",
            noteSections: [
              {
                heading: "Case-by-Case Diff Reporting",
                body: "Store each evaluation run with `(caseId, variant, passed, latencyMs, failureReason)`. Diffing baseline vs candidate outputs immediately surfaces regressions (`baseline=PASS -> candidate=FAIL`) so you debug exact failures instead of guessing.",
                codeSnippet: `type EvalResult = { caseId: string; passed: boolean; reason?: string };\nfunction diffRuns(base: EvalResult[], cand: EvalResult[]) {\n  const baseMap = new Map(base.map((r) => [r.caseId, r]));\n  return cand.map((c) => ({\n    caseId: c.caseId,\n    delta: baseMap.get(c.caseId)?.passed === c.passed\n      ? "UNCHANGED"\n      : c.passed ? "FIXED" : "REGRESSED",\n  }));\n}`,
                takeaway: "Paired case-ID diffs turn subjective prompt editing into rigorous software engineering.",
              },
              {
                heading: "Calibrating Confidence Thresholds Without Label Leakage",
                body: "Split evaluation sets into development tuning slices and held-out validation slices before picking auto-accept vs human-review confidence cutoffs. Tuning threshold numbers against the same test examples you report on inflates perceived reliability and collapses on live traffic.",
                takeaway: "Freeze a held-out verification split before locking auto-pass thresholds.",
              },
            ],
            keyConcepts: [
              {
                term: "Paired Evaluation Diff",
                definition: "Comparing two system variants on identical frozen inputs and inspecting status flips per case ID.",
              },
              {
                term: "Calibration",
                definition: "Alignment between a model/rubric's predicted confidence score and its true empirical pass frequency.",
              },
            ],
            practicalExercise: {
              title: "Implement a Paired Regression Diff Script",
              difficulty: "Applied",
              estimatedMinutes: 20,
              objective: "Write a helper that classifies two evaluation runs into FIXED, REGRESSED, and UNCHANGED counts.",
              instructions: [
                "Compare two result arrays keyed by `caseId`.",
                "Output summary counts plus the list of regressed case IDs.",
              ],
              expectedOutput: "Explicit list of regressed IDs printed cleanly when any pass flips to fail.",
              hints: ["Return non-zero or a warning flag whenever `regressed.length > 0`."],
            },
            commonMistakes: [
              {
                mistake: "Comparing Prompt A on Monday's test file against Prompt B on Tuesday's edited file",
                whyItHappens: "Mutating the benchmark alongside the prompt.",
                fix: "Version-lock dataset snapshots when comparing prompt candidates.",
              },
            ],
            keyTakeaways: [
              "Never change inputs and prompts inside the same measured comparison step.",
              "Surface explicit `REGRESSED` case IDs in every run report.",
            ],
            knowledgeCheck: {
              question: "Why must baseline and candidate prompts be evaluated on the exact same frozen dataset snapshot?",
              options: [
                "To prevent dataset drift from invalidating the comparison",
                "JSONL files cannot be appended to",
                "It reduces CPU clock speed",
              ],
              correctIndex: 0,
              explanation: "Changing test cases mid-experiment makes score deltas meaningless.",
            },
            resources: [
              {
                id: "res-ai-hf-eval",
                title: "Hugging Face Evaluate Guide",
                provider: "Hugging Face",
                url: "https://huggingface.co/docs/evaluate/index",
              },
            ],
          },
          {
            id: "les-ai-2-video",
            sortOrder: 2,
            title: "Curated Lecture: Visual Intuition Behind Neural Networks",
            lessonType: "video",
            durationLabel: "19 min watch",
            summary: "Visual geometric explanation of weights, activations, and probability distributions.",
            learningObjectives: [
              "Connect softmax output distributions to confidence calibration",
              "Define safe fallback abstention thresholds on low-confidence predictions",
            ],
            realWorldContext: "Inspecting probability distributions reveals why models sound equally fluent when uncertain vs certain.",
            noteSections: [
              {
                heading: "Geometric Takeaway: Confidence Calibration",
                body: "Inspecting probability calibration prevents over-confident hallucinated classifications. Track confidence alongside accuracy on held-out test slices.",
                takeaway: "Track confidence alongside accuracy on held-out test slices.",
              },
            ],
            keyConcepts: [
              {
                term: "Softmax Distribution",
                definition: "Normalization converting raw output logits into probabilities summing to 1.0.",
              },
              {
                term: "Abstention Threshold",
                definition: "Confidence cutoff routing uncertain predictions to human review rather than silent auto-approval.",
              },
            ],
            practicalExercise: {
              title: "Set a Fallback Abstain Threshold",
              difficulty: "Guided",
              estimatedMinutes: 10,
              objective: "Route low-confidence predictions (< 0.72) to human review rather than auto-approving.",
              instructions: [
                "Given confidence scores `[0.91, 0.54, 0.78, 0.42]`, classify actions into `auto_accept` vs `human_review` using `threshold = 0.72`.",
                "Verify count summaries and log an escalation alert whenever the `human_review` share exceeds 30% of the batch.",
              ],
              expectedOutput: "2 auto-accepted (`0.91, 0.78`), 2 routed to review (`0.54, 0.42`).",
              hints: ["Compare `score >= 0.72` cleanly in a single pure helper."],
            },
            commonMistakes: [
              {
                mistake: "Treating raw logit confidence as an absolute accuracy percentage without held-out calibration",
                whyItHappens: "Deep networks are often over-confident out-of-distribution.",
                fix: "Calibrate cutoffs empirically against held-out validation labels.",
              },
            ],
            keyTakeaways: [
              "Pair model confidence thresholds with safe fallback queues.",
              "Calibrate abstention cutoffs on validation slices, never on your final test benchmark.",
            ],
            knowledgeCheck: {
              question: "What is the safest automated action when a classifier's calibrated confidence falls below your precision threshold?",
              options: [
                "Publish the top class anyway",
                "Abstain or route to human verification / fallback rule",
                "Double the temperature setting",
              ],
              correctIndex: 1,
              explanation: "Graceful abstention prevents silent low-confidence errors from hitting production users.",
            },
            youtubeVideoId: "aircAruvnKk",
            youtubeUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
            videoCreator: "3Blue1Brown (YouTube)",
            resources: [
              {
                id: "res-ai-eval-2",
                title: "OpenAI Evals & Calibration Guide",
                provider: "OpenAI Platform",
                url: "https://platform.openai.com/docs/guides/evals",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-ai-2",
          title: "Module 2 Check: Paired Diffs & Calibration",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-ai-2-q1",
              questionType: "conceptual",
              prompt: "What does a paired evaluation diff reveal that an aggregate score percentage hides?",
              options: [
                "GPU fan speed",
                "Exact test case IDs that flipped between PASS and FAIL across two prompt versions",
                "Token pricing tiers",
              ],
              correctIndex: 1,
              explanation: "Paired case diffs show both wins and silent regressions side-by-side.",
            },
            {
              id: "mq-ai-2-q2",
              questionType: "scenario",
              prompt: "Should you tune confidence cutoffs using the same test set you report as your final accuracy benchmark?",
              options: [
                "Yes, to maximize reported numbers",
                "No — calibrate cutoffs on a validation split and report final metrics on a held-out test set",
                "Only if the dataset has fewer than 50 rows",
              ],
              correctIndex: 1,
              explanation: "Tuning thresholds on your test split leaks test signal and overstates real-world accuracy.",
            },
          ],
        },
      },
      {
        id: "mod-ai-3",
        sortOrder: 3,
        title: "Real-World AI Evaluation Harness Project",
        summary: "Build an automated harness comparing two prompt strategies across 25+ test cases.",
        estimatedMinutes: 120,
        learningOutcomes: [
          "Ship a reproducible evaluation runner outputting slice accuracy and case diffs",
        ],
        lessons: [
          {
            id: "les-ai-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Structured AI Evaluation Harness",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Assemble reproducible evaluation runner, metrics breakdown, and failure write-up.",
            learningObjectives: [
              "Implement deterministic schema checks + rubric scorer + diff summary table",
              "Support offline replay fixtures so CI verifies evaluation logic with zero API keys",
            ],
            realWorldContext: "Reproducible eval harnesses run directly inside CI on every prompt edit PR.",
            noteSections: [
              {
                heading: "Project Focus",
                body: "Submit clean diffs showing precision/pass-rate shifts between baseline and revised prompts across normal, edge, and adversarial slices.",
                takeaway: "Document at least three real failure slices your evaluation suite caught.",
              },
            ],
            keyConcepts: [
              {
                term: "Slice Breakdown",
                definition: "Pass-rate metrics segmented by input difficulty or failure mode.",
              },
              {
                term: "Offline Replay Fixture",
                definition: "Frozen model response dataset enabling zero-cost reproducible rubric verification in CI.",
              },
            ],
            practicalExercise: {
              title: "Verify JSONL Harness Reproducibility",
              difficulty: "Applied",
              estimatedMinutes: 15,
              objective: "Confirm running your harness twice produces deterministic schema scores.",
              instructions: [
                "Run your runner twice against fixed mock/model outputs.",
                "Confirm identical slice metrics and case diff output.",
              ],
              expectedOutput: "Zero score variance across deterministic rubric checks.",
              hints: ["Seed any sampling or record frozen fixture responses for offline CI runs."],
            },
            commonMistakes: [
              {
                mistake: "Hardcoding live paid API calls inside unit tests without an offline deterministic fixture mode",
                whyItHappens: "Coupling CI checks to live external LLM rate limits.",
                fix: "Support a `--fixture` or offline replay mode so tests run deterministically everywhere.",
              },
            ],
            keyTakeaways: [
              "Always support deterministic offline fixture replay for CI tests.",
              "Document at least 3 discovered failure modes in your write-up.",
            ],
            knowledgeCheck: {
              question: "Why support an offline fixture mode in an AI evaluation repository?",
              options: [
                "So reviewers and CI pipelines can verify grading logic deterministically without external API keys",
                "Because JSONL files only work offline",
                "To skip writing README instructions",
              ],
              correctIndex: 0,
              explanation: "Offline replay fixtures guarantee fast, zero-cost verification in CI and mentor review.",
            },
            resources: [
              {
                id: "res-ai-eval-harness",
                title: "OpenAI Evaluation Best Practices",
                provider: "OpenAI Platform",
                url: "https://platform.openai.com/docs/guides/evals",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-ai-3",
          title: "Module 3 Check: Evaluation Harness Delivery",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-ai-3-q1",
              questionType: "conceptual",
              prompt: "Why separate deterministic schema checks from heuristic/rubric scoring in your runner?",
              options: [
                "To isolate structural JSON failures clearly from semantic quality failures",
                "Because Python prohibits running both in one script",
                "To double runtime latency",
              ],
              correctIndex: 0,
              explanation: "Separating structural and semantic failure counts helps engineers fix formatting bugs first.",
            },
            {
              id: "mq-ai-3-q2",
              questionType: "scenario",
              prompt: "A mentor pulls your GitHub repo without setting an OpenAI/Gemini key. What makes your project immediately testable?",
              options: [
                "Committing your private API key to Git",
                "Providing frozen JSONL replay fixtures and unit tests verifying scoring + diff logic offline",
                "Asking the mentor to copy-paste terminal outputs",
              ],
              correctIndex: 1,
              explanation: "Offline replay fixtures let anyone verify rubric and diff behavior safely without leaking secrets.",
            },
          ],
        },
      },
    ],
    project: {
      slug: "eval-harness-studio",
      title: "Structured AI Evaluation Harness",
      summary:
        "Design golden evaluation sets, grading rubrics, and reproducible prompt regression checks.",
      brief:
        "Build a repeatable evaluation script that scores structured outputs across accuracy, JSON schema compliance, and latency budgets without manual guessing.",
      estimatedHours: 9,
      problemStatement:
        "Teams shipping LLM workflows lack repeatable quality gates, causing silent JSON schema breakages and accuracy regressions whenever prompts change.",
      useCase:
        "An automated CI-ready evaluation runner comparing Prompt v1 vs Prompt v2 over 25+ golden & adversarial inputs.",
      technologies: ["TypeScript / Python", "JSONL", "Zod / Pydantic", "Unit Tests"],
      milestones: [
        "Curate 25+ representative normal and adversarial test cases",
        "Implement deterministic schema and rubric scoring script",
        "Produce clear before/after prompt comparison report",
      ],
      deliverables: [
        "Evaluation dataset JSONL and runner script",
        "Comparison metrics summary report",
        "Short write-up on failure categorization",
      ],
      rubric: [
        "Reproducible pass/fail metrics",
        "Explicit edge-case coverage",
        "Clear separation between deterministic checks and heuristic scoring",
      ],
      structuredRubric: [
        {
          criterion: "Golden Benchmark Quality & Edge Coverage",
          weightPercent: 35,
          expectation: "25+ curated cases tagged by failure category including empty context and adversarial inputs.",
        },
        {
          criterion: "Deterministic Scoring & Paired Diff Engine",
          weightPercent: 40,
          expectation: "Clean schema validation, slice metrics, and explicit FIXED/REGRESSED case ID diffs.",
        },
        {
          criterion: "Offline CI Reproducibility & Failure Analysis",
          weightPercent: 25,
          expectation: "Runs cleanly with offline replay fixtures and documents 3+ concrete failure slices.",
        },
      ],
      submissionInstructions: [
        "Push your JSONL suite, runner script, offline fixture mode, and unit tests to GitHub.",
        "Attach a markdown comparison table summarizing Prompt v1 vs Prompt v2 slice metrics.",
      ],
      mentorName: "Dr. Nisha Menon",
      mentorRole: "Applied AI Researcher",
    },
  },
];
