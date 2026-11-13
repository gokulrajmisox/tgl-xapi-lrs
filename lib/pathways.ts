export type Pathway = {
  number: string;
  title: string;
  category: string;
  description: string;
  skills: string[];
  level: string;
  accent: string;
};

export const pathways: Pathway[] = [
  { number: "01", title: "Python programming", category: "Engineering", description: "Build a strong foundation in one of the most versatile languages in modern technology.", skills: ["Python", "Problem solving", "Automation"], level: "Foundations", accent: "#b9a9d6" },
  { number: "02", title: "Web development", category: "Engineering", description: "Go from the building blocks of the web to responsive, interactive digital experiences.", skills: ["HTML & CSS", "JavaScript", "React"], level: "Foundations → build", accent: "#d4c8ad" },
  { number: "03", title: "Artificial intelligence", category: "Data & AI", description: "Explore the ideas, tools, and responsible practices shaping intelligent systems.", skills: ["AI concepts", "Prompt design", "Applied AI"], level: "Explore & apply", accent: "#aab9b0" },
  { number: "04", title: "Machine learning", category: "Data & AI", description: "Learn how data becomes models, and how models can solve practical problems.", skills: ["Model basics", "Evaluation", "Python"], level: "Foundations → build", accent: "#bdafc9" },
  { number: "05", title: "Data science", category: "Data & AI", description: "Turn raw information into clear questions, useful analysis, and thoughtful insight.", skills: ["Data analysis", "Visualization", "Statistics"], level: "Foundations", accent: "#d1b6a8" },
  { number: "06", title: "Cybersecurity", category: "Infrastructure", description: "Understand security fundamentals and develop a responsible, defensive mindset.", skills: ["Security basics", "Threat modeling", "Privacy"], level: "Foundations", accent: "#a6b2c7" },
  { number: "07", title: "Cloud computing", category: "Infrastructure", description: "Discover the services and architecture behind resilient, modern applications.", skills: ["Cloud concepts", "Architecture", "Deployment"], level: "Explore & apply", accent: "#c2bca7" },
  { number: "08", title: "DevOps", category: "Infrastructure", description: "Connect development and operations through automation and reliable delivery.", skills: ["CI/CD", "Containers", "Observability"], level: "Explore & apply", accent: "#b7b0ce" },
  { number: "09", title: "UI/UX design", category: "Product & design", description: "Make digital products clearer and more useful through research and design practice.", skills: ["User research", "Prototyping", "Visual systems"], level: "Foundations → build", accent: "#d5b8aa" },
];

export const pathwayCategories = ["All pathways", "Engineering", "Data & AI", "Infrastructure", "Product & design"];
