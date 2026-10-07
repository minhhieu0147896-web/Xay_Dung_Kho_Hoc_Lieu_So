import { z } from "zod";
import type { Block, Lesson, Section, Workspace } from "../data/content";

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/);
const text = z.string().max(50000);
const short = z.string().max(1000);
export function safeImageUrl(value: string) {
  return /^\/(?!\/)[^\s\\]*$/.test(value) || /^https:\/\/[^\s\\]+$/.test(value);
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
  transcript: text.optional(),
  sections: z
    .array(
      z.object({
        id,
        heading: short,
        // Compatibility text is derived from all blocks, so it can exceed a single block.
        body: z.string().default(""),
        blocks: z.array(blockSchema).max(100).optional(),
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
  if (lesson.youtubeVideoId && !lesson.transcript?.trim())
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
