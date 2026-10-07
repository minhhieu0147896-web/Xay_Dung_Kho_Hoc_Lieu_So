export type Block = { id: string; page?: number; filePage?: number } & (
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | {
      type: "image";
      src: string;
      alt: string;
      caption: string;
      complex: boolean;
      description: string;
    }
  | { type: "table"; caption: string; headers: string[]; rows: string[][] }
);
export type Section = {
  id: string;
  heading: string;
  body: string;
  blocks?: Block[];
};
export type Question = {
  id: string;
  prompt: string;
  options: string[];
  correctOptionId: number;
  explanation: string;
  sourceSectionId: string;
};
export type Lesson = {
  textbook?: { id: string; title: string; lessonNumber: number; url?: string };
  provenance?: {
    kind: "demo" | "textbook" | "adaptation";
    title: string;
    edition: string;
    fileName?: string;
  };
  revision?: number;
  youtubeVideoId?: string;
  youtubeSource?: string;
  transcript?: string;
  subject: string;
  grade: number;
  id: string;
  title: string;
  summary: string;
  period: string;
  chapter: string;
  minutes: number;
  status: "draft" | "published";
  source: string;
  sections: Section[];
  questions: Question[];
};
export type Progress = {
  completedSectionIds: string[];
  quizScore?: number;
  lastSectionId?: string;
  updatedAt: string;
};
export type Answer = {
  text: string;
  citations: {
    lessonId: string;
    sectionId: string;
    blockId?: string;
    page?: number;
    excerpt: string;
  }[];
  mode: "retrieval";
  status: "ok" | "insufficient_evidence";
};
export type Draft = { lesson: Lesson; savedAt: string };
export type Workspace = {
  schemaVersion: 2;
  published: Lesson[];
  drafts: Record<string, Draft>;
  previous: Record<string, Lesson>;
};
