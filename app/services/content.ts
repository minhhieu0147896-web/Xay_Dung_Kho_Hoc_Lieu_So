import { z } from "zod";
import type {
  Block,
  Lesson,
  MobileLessonDetail,
  MobileLessonSummary,
  MobileSectionDetail,
  Section,
  Workspace,
} from "../data/content";

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/);
const text = z.string().max(50000);
const short = z.string().max(1000);
export function safeImageUrl(value: string) {
  return /^\/(?!\/)[^\s\\]*$/.test(value) || /^https:\/\/[^\s\\]+$/.test(value);
}
export function extractYoutubeId(urlOrId: string): string | null {
  const value = (urlOrId ?? "").trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const parsed = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      const candidate = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[\w-]{11}$/.test(candidate) ? candidate : null;
    }
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const v = parsed.searchParams.get("v") ?? "";
      if (/^[\w-]{11}$/.test(v)) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (
        parts.length >= 2 &&
        ["embed", "shorts", "live", "v"].includes(parts[0]) &&
        /^[\w-]{11}$/.test(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    // Fallback regex below
  }
  const match = value.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i,
  );
  return match ? match[1] : null;
}
export function renumberSectionCodes(
  lessonNumber: number | undefined,
  sections: Section[],
): Section[] {
  const prefix =
    typeof lessonNumber === "number" &&
    Number.isFinite(lessonNumber) &&
    lessonNumber > 0
      ? Math.trunc(lessonNumber)
      : 1;
  return sections.map((section, index) => ({
    ...section,
    code: `${prefix}.${index + 1}`,
  }));
}
const base = {
  id,
  page: z.number().int().min(1).max(10000).optional(),
  filePage: z.number().int().min(1).max(10000).optional(),
};
const blockSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("paragraph"), text }),
  z.object({
    ...base,
    type: z.literal("list"),
    ordered: z.boolean(),
    items: z.array(text).max(100),
  }),
  z.object({
    ...base,
    type: z.literal("image"),
    src: short.refine(
      (s) => !s || safeImageUrl(s),
      "Đường dẫn ảnh phải là HTTPS hoặc /đường-dẫn-trong-dự-án",
    ),
    alt: short,
    caption: short,
    complex: z.boolean(),
    description: text,
  }),
  z.object({
    ...base,
    type: z.literal("table"),
    caption: short,
    headers: z.array(short).max(20),
    rows: z.array(z.array(text).max(20)).max(100),
  }),
]);
export const lessonSchema = z.object({
  id,
  title: short,
  subject: short,
  grade: z.number().int().min(1).max(12),
  chapter: short,
  summary: text,
  period: short,
  minutes: z.number().min(0).max(1000),
  status: z.enum(["draft", "published"]),
  source: text,
  textbook: z
    .object({
      id,
      title: short,
      lessonNumber: z.number().int().positive(),
      url: short.optional(),
    })
    .optional(),
  provenance: z
    .object({
      kind: z.enum(["demo", "textbook", "adaptation"]),
      title: short,
      edition: short,
      fileName: short.optional(),
    })
    .optional(),
  revision: z.number().int().min(0).optional(),
  youtubeVideoId: z
    .string()
    .regex(/^$|^[\w-]{11}$/)
    .optional(),
  youtubeSource: short.optional(),
  videoUrl: short.optional(),
  transcript: text.optional(),
  keywords: z.array(short).max(50).optional(),
  sections: z
    .array(
      z.object({
        id,
        code: short.optional(),
        heading: short,
        sourceText: text.optional(),
        // Compatibility text is derived from all blocks, so it can exceed a single block.
        body: z.string().default(""),
        blocks: z.array(blockSchema).max(100).optional(),
        videoUrl: short.optional(),
        keywords: z.array(short).max(50).optional(),
      }),
    )
    .max(100),
  questions: z
    .array(
      z.object({
        id,
        prompt: text,
        options: z.array(text).min(2).max(10),
        correctOptionId: z.number().int().min(0),
        explanation: text,
        sourceSectionId: id,
      }),
    )
    .max(100),
});
export function blocksOf(section: Section): Block[] {
  return (
    section.blocks ??
    (section.body.trim()
      ? [{ id: `${section.id}-p1`, type: "paragraph", text: section.body }]
      : [])
  );
}
export function blockText(block: Block): string {
  switch (block.type) {
    case "paragraph":
      return block.text;
    case "list":
      return block.items
        .map((item, i) => `${block.ordered ? `${i + 1}. ` : ""}${item}`)
        .join("\n");
    case "image":
      return [block.caption, block.alt, block.description]
        .filter(Boolean)
        .join(". ");
    case "table":
      return [
        block.caption,
        ...block.rows.map((row) =>
          row.map((cell, i) => `${block.headers[i]}: ${cell}`).join("; "),
        ),
      ].join("\n");
  }
}
export function sectionText(section: Section) {
  return blocksOf(section).map(blockText).join("\n\n");
}
export function materialize(lesson: Lesson): Lesson {
  return {
    ...lesson,
    sections: lesson.sections.map((section) => ({
      ...section,
      blocks: blocksOf(section),
      body: sectionText(section),
    })),
  };
}
export function parseLesson(input: unknown, expectedId?: string): Lesson {
  const result = lessonSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      result.error.issues
        .slice(0, 4)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );
  const lesson: Lesson = result.data;
  if (expectedId && lesson.id !== expectedId)
    throw new Error("Mã bài trong tệp không khớp bài đang biên tập.");
  const used = new Set<string>();
  for (const item of [
    ...lesson.sections,
    ...lesson.sections.flatMap(blocksOf),
    ...lesson.questions,
  ]) {
    if (
      used.has(item.id) ||
      [
        "main",
        "ask",
        "quiz",
        "panel-read",
        "panel-ask",
        "panel-quiz",
        "panel-youtube",
      ].includes(item.id)
    )
      throw new Error(`Mã bị trùng hoặc dành riêng: ${item.id}`);
    used.add(item.id);
  }
  for (const q of lesson.questions) {
    if (!lesson.sections.some((s) => s.id === q.sourceSectionId))
      throw new Error(`Câu hỏi ${q.id} trỏ tới mục không tồn tại.`);
    if (q.correctOptionId >= q.options.length)
      throw new Error(`Đáp án câu ${q.id} không hợp lệ.`);
  }
  return materialize(lesson);
}
export function publicationIssues(lesson: Lesson): string[] {
  const issues: string[] = [];
  try {
    parseLesson(lesson);
  } catch (error) {
    issues.push((error as Error).message);
  }
  if (!lesson.title.trim() || !lesson.source.trim())
    issues.push("Điền tên bài và nguồn nội dung.");
  if (!lesson.provenance?.title.trim() || !lesson.provenance.edition.trim())
    issues.push("Điền tên tài liệu nguồn và phiên bản/năm xuất bản.");
  if (!lesson.sections.length) issues.push("Bài chưa có mục nội dung.");
  for (const section of lesson.sections) {
    const blocks = blocksOf(section);
    if (!section.heading.trim() || !blocks.length)
      issues.push(
        `Mục ${section.heading || section.id}: thiếu tiêu đề hoặc nội dung.`,
      );
    for (const block of blocks) {
      const prefix = `Mục ${section.heading}, khối ${block.id}`;
      if (lesson.provenance?.kind !== "demo" && !block.page)
        issues.push(`${prefix}: thiếu trang nguồn.`);
      if (block.type === "paragraph" && !block.text.trim())
        issues.push(`${prefix}: đoạn văn trống.`);
      if (
        block.type === "list" &&
        (!block.items.length || block.items.some((s) => !s.trim()))
      )
        issues.push(`${prefix}: danh sách có dòng trống.`);
      if (
        block.type === "image" &&
        (!block.src ||
          !block.alt.trim() ||
          (block.complex && !block.description.trim()))
      )
        issues.push(
          `${prefix}: bổ sung ảnh, mô tả ngắn và mô tả chi tiết nếu là hình phức tạp.`,
        );
      if (
        block.type === "table" &&
        (!block.caption.trim() ||
          !block.headers.length ||
          !block.rows.length ||
          block.headers.some((s) => !s.trim()) ||
          block.rows.some(
            (r) =>
              r.length !== block.headers.length || r.some((s) => !s.trim()),
          ))
      )
        issues.push(
          `${prefix}: bảng phải có tên, tiêu đề cột và các hàng đủ ô.`,
        );
    }
  }
  for (const q of lesson.questions)
    if (
      !q.prompt.trim() ||
      !q.explanation.trim() ||
      q.options.some((o) => !o.trim())
    )
      issues.push(`Câu ${q.id}: điền câu hỏi, đáp án và giải thích.`);
  if (
    (lesson.youtubeVideoId || lesson.videoUrl?.trim()) &&
    !lesson.transcript?.trim()
  )
    issues.push(
      "Video chưa có bản chép lời và mô tả thông tin trực quan cần thiết.",
    );
  return issues;
}
export function saveDraft(workspace: Workspace, input: Lesson): Workspace {
  const lesson = parseLesson(input);
  if (!workspace.published.some((l) => l.id === lesson.id))
    throw new Error("Không tìm thấy bài gốc.");
  return {
    ...workspace,
    drafts: {
      ...workspace.drafts,
      [lesson.id]: {
        lesson: { ...lesson, status: "draft" },
        savedAt: new Date().toISOString(),
      },
    },
  };
}
export function restoreWorkspace(value: unknown): Workspace {
  const schema = z.object({
    schemaVersion: z.literal(2),
    published: z.array(lessonSchema).min(1),
    drafts: z.record(
      z.string(),
      z.object({ lesson: lessonSchema, savedAt: z.string() }),
    ),
    previous: z.record(z.string(), lessonSchema),
  });
  const parsed = schema.parse(value);
  const published = parsed.published.map((l) => parseLesson(l));
  if (new Set(published.map((l) => l.id)).size !== published.length)
    throw new Error("Mã bài bị trùng trong dữ liệu đã lưu.");
  const drafts = Object.fromEntries(
    Object.entries(parsed.drafts).map(([id, d]) => [
      id,
      { ...d, lesson: parseLesson(d.lesson, id) },
    ]),
  );
  const previous = Object.fromEntries(
    Object.entries(parsed.previous).map(([id, l]) => [id, parseLesson(l, id)]),
  );
  return { schemaVersion: 2, published, drafts, previous };
}
export function publishDraft(
  workspace: Workspace,
  input: Lesson,
  review: { source: boolean; accessibility: boolean },
): Workspace {
  const issues = publicationIssues(input);
  if (issues.length) throw new Error(issues.join("\n"));
  if (!review.source || !review.accessibility)
    throw new Error(
      "Cần xác nhận đã đối chiếu nguồn và kiểm tra bản đọc bằng bàn phím/trình đọc màn hình.",
    );
  const old = workspace.published.find((l) => l.id === input.id);
  if (!old) throw new Error("Không tìm thấy bài gốc.");
  const lesson = {
    ...parseLesson(input),
    status: "published" as const,
    revision: (old.revision ?? 0) + 1,
  };
  const drafts = { ...workspace.drafts };
  delete drafts[lesson.id];
  return {
    ...workspace,
    published: workspace.published.map((l) =>
      l.id === lesson.id ? lesson : l,
    ),
    drafts,
    previous: { ...workspace.previous, [lesson.id]: old },
  };
}
export function appendText(
  lesson: Lesson,
  pages: { text: string; page?: number }[],
  fileName: string,
): Lesson {
  const sections = pages
    .filter((p) => p.text.trim())
    .map((page, i) => {
      const id = `import-${crypto.randomUUID()}`;
      const blocks: Block[] = page.text
        .split(/\n\s*\n/)
        .filter((s) => s.trim())
        .map((text, n) => ({
          id: `${id}-p${n + 1}`,
          type: "paragraph",
          text: text.trim(),
          filePage: page.page,
        }));
      return {
        id,
        heading: `Nội dung nhập ${i + 1}${page.page ? ` · trang tệp ${page.page}` : ""}`,
        sourceText: page.text.trim(),
        body: "",
        blocks,
      };
    });
  return materialize({
    ...lesson,
    provenance: { kind: "adaptation", title: fileName, edition: "", fileName },
    sections: [...lesson.sections, ...sections],
  });
}

function defaultSectionCode(
  lessonNumber: number | undefined,
  index: number,
  explicitCode?: string,
): string {
  const trimmed = explicitCode?.trim();
  if (trimmed) return trimmed;
  const prefix =
    typeof lessonNumber === "number" &&
    Number.isFinite(lessonNumber) &&
    lessonNumber > 0
      ? Math.trunc(lessonNumber)
      : 1;
  return `${prefix}.${index + 1}`;
}

export function collectLessonKeywords(lesson: Lesson): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of [
    ...(lesson.keywords ?? []),
    ...lesson.sections.flatMap((s) => s.keywords ?? []),
  ]) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

function lessonHasReadableSections(lesson: Lesson): boolean {
  return lesson.sections.some((s) => sectionText(s).trim().length > 0);
}

function lessonHasValidVideo(lesson: Lesson): boolean {
  return (
    /^[a-zA-Z0-9_-]{11}$/.test(lesson.youtubeVideoId ?? "") ||
    Boolean(lesson.videoUrl?.trim())
  );
}

export function toMobileLessonSummary(lesson: Lesson): MobileLessonSummary {
  const lessonNumber = lesson.textbook?.lessonNumber;
  return {
    id: lesson.id,
    lessonNumber,
    title: lesson.title,
    subject: lesson.subject,
    grade: lesson.grade,
    chapter: lesson.chapter,
    summary: lesson.summary,
    period: lesson.period || undefined,
    minutes: lesson.minutes,
    revision: lesson.revision,
    sectionCount: lesson.sections.length,
    questionCount: lesson.questions.length,
    hasReading: lessonHasReadableSections(lesson),
    hasVideo: lessonHasValidVideo(lesson),
    keywords: collectLessonKeywords(lesson),
    sectionSummaries: lesson.sections.map((section, index) => ({
      id: section.id,
      code: defaultSectionCode(lessonNumber, index, section.code),
      heading: section.heading,
      keywords: (section.keywords ?? []).map((k) => k.trim()).filter(Boolean),
    })),
  };
}

export function toMobileLessonDetail(lesson: Lesson): MobileLessonDetail {
  const lessonNumber = lesson.textbook?.lessonNumber;
  const sections: MobileSectionDetail[] = lesson.sections.map(
    (section, index) => {
      const studyText = sectionText(section).trim() || section.body.trim();
      return {
        id: section.id,
        code: defaultSectionCode(lessonNumber, index, section.code),
        heading: section.heading,
        body: studyText,
        studyText,
        sourceText: section.sourceText,
        videoUrl: section.videoUrl || undefined,
        keywords: (section.keywords ?? []).map((k) => k.trim()).filter(Boolean),
      };
    },
  );

  return {
    id: lesson.id,
    lessonNumber,
    title: lesson.title,
    subject: lesson.subject,
    grade: lesson.grade,
    chapter: lesson.chapter,
    summary: lesson.summary,
    period: lesson.period || undefined,
    minutes: lesson.minutes,
    status: "published",
    source: lesson.source || undefined,
    revision: lesson.revision,
    videoUrl: lesson.videoUrl || undefined,
    youtubeVideoId: lesson.youtubeVideoId || undefined,
    youtubeSource: lesson.youtubeSource || undefined,
    transcript: lesson.transcript || undefined,
    hasReading: lessonHasReadableSections(lesson),
    hasVideo: lessonHasValidVideo(lesson),
    keywords: collectLessonKeywords(lesson),
    sections,
    questions: lesson.questions,
  };
}

export function toLessonFromMobileSummary(
  summary: MobileLessonSummary,
): Lesson {
  return {
    id: summary.id,
    title: summary.title,
    subject: summary.subject,
    grade: summary.grade,
    chapter: summary.chapter,
    summary: summary.summary,
    period: summary.period ?? "",
    minutes: summary.minutes ?? 0,
    status: "published",
    source: "",
    revision: summary.revision,
    keywords: summary.keywords,
    textbook:
      typeof summary.lessonNumber === "number"
        ? {
            id: "ket-noi-tri-thuc",
            title: "Kết nối tri thức với cuộc sống",
            lessonNumber: summary.lessonNumber,
          }
        : undefined,
    sections: (summary.sectionSummaries ?? []).map((sec) => ({
      id: sec.id,
      code: sec.code,
      heading: sec.heading,
      body: "",
      keywords: sec.keywords,
    })),
    questions: [],
  };
}

export function toLessonFromMobileDetail(detail: MobileLessonDetail): Lesson {
  return materialize({
    id: detail.id,
    title: detail.title,
    subject: detail.subject,
    grade: detail.grade,
    chapter: detail.chapter,
    summary: detail.summary,
    period: detail.period ?? "",
    minutes: detail.minutes ?? 0,
    status: "published",
    source: detail.source ?? "",
    revision: detail.revision,
    videoUrl: detail.videoUrl,
    youtubeVideoId: detail.youtubeVideoId,
    youtubeSource: detail.youtubeSource,
    transcript: detail.transcript,
    keywords: detail.keywords,
    textbook:
      typeof detail.lessonNumber === "number"
        ? {
            id: "ket-noi-tri-thuc",
            title: "Kết nối tri thức với cuộc sống",
            lessonNumber: detail.lessonNumber,
          }
        : undefined,
    sections: detail.sections.map((sec) => ({
      id: sec.id,
      code: sec.code,
      heading: sec.heading,
      sourceText: sec.sourceText,
      body: sec.studyText || sec.body,
      videoUrl: sec.videoUrl,
      keywords: sec.keywords,
    })),
    questions: detail.questions,
  });
}

export function mergeMobileLessonsWithLocal(
  apiSummaries: MobileLessonSummary[],
  localPublished: Lesson[],
): {
  summaries: MobileLessonSummary[];
  lessons: Lesson[];
} {
  const validLocal = localPublished.filter((l) => l.status === "published");
  const localMap = new Map(validLocal.map((l) => [l.id, l]));

  const summaries: MobileLessonSummary[] = apiSummaries.map((apiItem) => {
    const local = localMap.get(apiItem.id);
    if (local && (local.revision ?? 0) > (apiItem.revision ?? 0)) {
      return toMobileLessonSummary(local);
    }
    return apiItem;
  });

  for (const local of validLocal) {
    if (!apiSummaries.some((apiItem) => apiItem.id === local.id)) {
      summaries.push(toMobileLessonSummary(local));
    }
  }

  const lessons: Lesson[] = summaries.map((summary) => {
    const local = localMap.get(summary.id);
    if (local) {
      if ((local.revision ?? 0) > (summary.revision ?? 0)) {
        return local;
      }
      return {
        ...local,
        title: summary.title,
        summary: summary.summary,
        chapter: summary.chapter,
      };
    }
    return toLessonFromMobileSummary(summary);
  });

  return { summaries, lessons };
}

export function resolveMobileLessonDetail(
  apiDetail: MobileLessonDetail | null,
  localLesson?: Lesson,
): MobileLessonDetail | null {
  if (localLesson && localLesson.status === "published") {
    if (!apiDetail || (localLesson.revision ?? 0) > (apiDetail.revision ?? 0)) {
      return toMobileLessonDetail(localLesson);
    }
  }
  return apiDetail;
}
