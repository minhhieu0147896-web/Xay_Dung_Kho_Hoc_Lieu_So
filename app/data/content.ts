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
  code?: string; // Ví dụ: "1.1", "1.2", "6.1"
  heading: string;
  sourceText?: string; // Nội dung gốc từ SGK (để tham chiếu & làm đầu vào AI)
  body: string; // Nội dung học (đã chế biến để đọc cho người khiếm thị)
  blocks?: Block[];
  videoUrl?: string; // Link video bài giảng riêng của mục (URL bất kỳ)
  keywords?: string[]; // Từ khóa ngữ nghĩa phục vụ Semantic Search
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
  videoUrl?: string;
  transcript?: string;
  keywords?: string[];
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
  mode: "retrieval" | "ai_grounded";
  status: "ok" | "insufficient_evidence";
};
export type Draft = { lesson: Lesson; savedAt: string };
export type Workspace = {
  schemaVersion: 2;
  published: Lesson[];
  drafts: Record<string, Draft>;
  previous: Record<string, Lesson>;
};

export type MobileSectionSummary = {
  id: string;
  code: string;
  heading: string;
  keywords: string[];
};

export type MobileLessonSummary = {
  id: string;
  lessonNumber?: number;
  title: string;
  subject: string;
  grade: number;
  chapter: string;
  summary: string;
  period?: string;
  minutes?: number;
  revision?: number;
  sectionCount: number;
  questionCount?: number;
  hasReading: boolean;
  hasVideo: boolean;
  keywords: string[];
  sectionSummaries?: MobileSectionSummary[];
};

export type MobileSectionDetail = {
  id: string;
  code: string;
  heading: string;
  body: string;
  studyText: string;
  sourceText?: string;
  videoUrl?: string;
  keywords: string[];
};

export type MobileLessonDetail = {
  id: string;
  lessonNumber?: number;
  title: string;
  subject: string;
  grade: number;
  chapter: string;
  summary: string;
  period?: string;
  minutes?: number;
  status: "published";
  source?: string;
  revision?: number;
  videoUrl?: string;
  youtubeVideoId?: string;
  youtubeSource?: string;
  transcript?: string;
  hasReading: boolean;
  hasVideo: boolean;
  keywords: string[];
  sections: MobileSectionDetail[];
  questions: Question[];
};

export type MobileLessonListResponse = {
  lessons: MobileLessonSummary[];
  total: number;
  readableCount: number;
  generatedAt: string;
};
