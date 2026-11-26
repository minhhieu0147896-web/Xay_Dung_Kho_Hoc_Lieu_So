import { z } from "zod";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE_HEADERS });
}

// ==========================================
// 1. SCHEMAS & TYPES
// ==========================================

const splitOutlineRequestSchema = z.object({
  action: z.literal("split_outline"),
  rawText: z
    .string()
    .min(1, "Văn bản đầu vào không được để trống.")
    .max(150000),
  lessonNumber: z.number().int().positive().optional(),
  lessonTitle: z.string().max(1000).optional(),
});

const outlineSectionItemSchema = z.object({
  code: z.string().min(1).max(50),
  heading: z.string().min(1).max(1000),
  sourceText: z.string().min(1).max(50000),
  studyText: z.string().min(1).max(50000),
  keywords: z.array(z.string().max(200)).max(30).optional(),
});

const splitOutlineOutputSchema = z.object({
  sections: z.array(outlineSectionItemSchema).min(1).max(50),
});

export type SplitOutlineSectionItem = z.infer<typeof outlineSectionItemSchema>;
export type SplitOutlineResponse = {
  sections: SplitOutlineSectionItem[];
  provider: "openrouter" | "local-fallback";
  fallback: boolean;
  model: string;
  notice?: string;
};

const generateStudyContentRequestSchema = z.object({
  action: z.literal("generate_study_content"),
  heading: z.string().min(1, "Tiêu đề mục không được để trống.").max(1000),
  sourceText: z
    .string()
    .min(1, "Nội dung gốc cần chế biến không được để trống.")
    .max(50000),
  imageDescriptions: z.array(z.string().max(5000)).max(20).optional(),
  lessonTitle: z.string().max(1000).optional(),
});

const generateStudyContentOutputSchema = z.object({
  studyText: z.string().min(1).max(50000),
  summary: z.string().max(5000).optional(),
  keywords: z.array(z.string().max(200)).max(30).optional(),
});

export type GenerateStudyContentResponse = {
  studyText: string;
  summary?: string;
  keywords: string[];
  provider: "openrouter" | "local-fallback";
  fallback: boolean;
  model: string;
  notice?: string;
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const MAX_IMAGE_DATA_URL_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 256;
const IMAGE_DATA_URL_REGEX =
  /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i;

function estimateBase64ImageBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return 0;
  const base64 = dataUrl.slice(commaIdx + 1).replace(/\s+/g, "");
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

const insertImageSemanticRequestSchema = z
  .object({
    action: z.literal("insert_image_semantic"),
    heading: z.string().max(1000).optional(),
    studyText: z.string().max(50000).optional(),
    sourceText: z.string().max(50000).optional(),
    imageCaption: z.string().max(2000).optional(),
    imageContext: z.string().max(5000).optional(),
    imageDataUrl: z
      .string()
      .max(
        MAX_IMAGE_DATA_URL_LENGTH,
        "Dung lượng ảnh tải lên vượt quá giới hạn an toàn 4MB.",
      )
      .refine(
        (val) => !val.trim() || IMAGE_DATA_URL_REGEX.test(val.trim()),
        "Định dạng ảnh không hợp lệ (chỉ hỗ trợ data:image/jpeg|png|webp;base64,...).",
      )
      .refine(
        (val) =>
          !val.trim() || estimateBase64ImageBytes(val.trim()) <= MAX_IMAGE_BYTES,
        "Dung lượng ảnh tải lên vượt quá giới hạn an toàn 4MB.",
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasCaption = Boolean(data.imageCaption && data.imageCaption.trim());
    const hasImage = Boolean(data.imageDataUrl && data.imageDataUrl.trim());
    if (!hasCaption && !hasImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageCaption"],
        message:
          "Hãy nhập tiêu đề/chú thích bức ảnh hoặc tải file ảnh lên (<= 4MB).",
      });
    }
  });

const insertImageSemanticOutputSchema = z.object({
  description: z.string().min(1).max(10000),
  insertedText: z.string().min(1).max(60000),
  insertedAfterSentence: z.string().min(1).max(5000),
  reason: z.string().min(1).max(5000),
});

export type InsertImageSemanticResponse = z.infer<
  typeof insertImageSemanticOutputSchema
> & {
  provider: "openrouter" | "local-fallback";
  fallback: boolean;
  model: string;
  usedVision?: boolean;
  notice?: string;
};

const generateQuizRequestSchema = z.object({
  action: z.literal("generate_quiz"),
  sectionId: z.string().min(1, "Thiếu mã định danh mục (sectionId).").max(120),
  heading: z.string().min(1, "Thiếu tiêu đề mục.").max(1000),
  studyText: z.string().max(50000).optional(),
  sourceText: z.string().max(50000).optional(),
  count: z.number().int().min(1).max(5).optional(),
});

const generatedQuizItemSchema = z.object({
  prompt: z.string().min(1).max(5000),
  options: z.array(z.string().min(1).max(2000)).length(4),
  correctOptionId: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(5000),
});

const generateQuizOutputSchema = z.object({
  questions: z.array(generatedQuizItemSchema).min(1).max(10),
});

export type GeneratedQuizQuestion = z.infer<typeof generatedQuizItemSchema> & {
  sourceSectionId: string;
};

export type GenerateQuizResponse = {
  questions: GeneratedQuizQuestion[];
  provider: "openrouter" | "local-fallback";
  fallback: boolean;
  model: string;
  notice?: string;
};

const askLessonBlockItemSchema = z.object({
  id: z.string().min(1).max(120),
  text: z.string().max(50000),
  page: z.number().int().min(1).max(10000).optional(),
});

const askLessonSectionItemSchema = z.object({
  id: z.string().min(1).max(120),
  code: z.string().max(50).optional(),
  heading: z.string().min(1).max(1000),
  body: z.string().max(50000).optional(),
  studyText: z.string().max(50000).optional(),
  sourceText: z.string().max(50000).optional(),
  keywords: z.array(z.string().max(200)).max(50).optional(),
  blocks: z.array(askLessonBlockItemSchema).max(100).optional(),
});

const askLessonRequestSchema = z.object({
  action: z.literal("ask_lesson"),
  question: z
    .string()
    .min(1, "Câu hỏi không được để trống.")
    .max(1000, "Câu hỏi tối đa 1000 ký tự."),
  lessonId: z.string().min(1).max(120).optional(),
  lessonTitle: z.string().max(1000).optional(),
  sections: z
    .array(askLessonSectionItemSchema)
    .min(1, "Bài học chưa có mục nội dung để tra cứu.")
    .max(100),
});

const askLessonLlmOutputSchema = z.object({
  text: z.string().min(1).max(10000),
  status: z.enum(["ok", "insufficient_evidence"]).optional(),
  citations: z
    .array(
      z.object({
        sectionId: z.string().min(1).max(120),
        blockId: z.string().max(120).optional(),
        page: z.number().int().min(1).max(10000).optional(),
        excerpt: z.string().max(5000).optional(),
      }),
    )
    .max(5)
    .optional(),
  suggestedQuestions: z.array(z.string().max(300)).max(4).optional(),
});

export type AskLessonCitation = {
  lessonId: string;
  sectionId: string;
  blockId?: string;
  page?: number;
  excerpt: string;
};

export type AskLessonResponse = {
  text: string;
  citations: AskLessonCitation[];
  mode: "retrieval" | "ai_grounded";
  status: "ok" | "insufficient_evidence";
  suggestedQuestions?: string[];
  provider: "openrouter" | "local-fallback";
  fallback: boolean;
  model: string;
  notice?: string;
};

// ==========================================
// 2. COMMON HELPERS
// ==========================================

function cleanForSpeech(text: string): string {
  return text
    .replace(/[*_=~#]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => cleanForSpeech(s))
    .filter((s) => s.length > 6);
}

function summarizeToStudyText(
  heading: string,
  sourceText: string,
  imageDescriptions?: string[],
): string {
  const sentences = splitIntoSentences(sourceText).filter((s) => s.length > 10);

  let lines: string[];
  if (!sentences.length) {
    lines = [`Ý chính 1 (${heading}): ${cleanForSpeech(sourceText)}`];
  } else {
    const picked = sentences.slice(0, Math.min(4, sentences.length));
    lines = picked.map((sentence, idx) => {
      const cleaned = sentence.replace(/^Ý chính\s*\d+\s*(\([^)]*\))?:\s*/i, "");
      return `Ý chính ${idx + 1}: ${cleaned}`;
    });
  }

  const validImageDescs = (imageDescriptions ?? [])
    .map((d) => cleanForSpeech(d))
    .filter(Boolean);
  if (validImageDescs.length > 0) {
    for (const desc of validImageDescs) {
      lines.push(`[Mô tả ảnh tư liệu: ${desc}]`);
    }
  }

  return lines.join("\n");
}

function extractKeywordsFromText(heading: string, sourceText: string): string[] {
  const combined = `${heading} ${sourceText}`;
  const candidates: string[] = [];
  const yearMatches =
    combined.match(/\b(?:\d{1,2}[-/]\d{1,2}[-/])?(19\d{2}|20\d{2})\b/g) ?? [];
  for (const y of yearMatches) {
    if (!candidates.includes(y)) candidates.push(y);
  }
  const headingParts = heading
    .split(/[:,;–—-]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4 && s.length <= 80);
  for (const p of headingParts) {
    if (!candidates.includes(p)) candidates.push(p);
  }
  if (!candidates.length && heading.trim()) {
    candidates.push(heading.trim().slice(0, 80));
  }
  return candidates.slice(0, 8);
}

function extractJsonString(raw: string): string {
  const cleaned = raw
    .replace(/^[\s\S]*?```(?:json)?\s*/i, (m) => (m.includes("```") ? "" : m))
    .replace(/\s*```[\s\S]*$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

type OpenRouterUserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type OpenRouterUserContent = string | OpenRouterUserContentPart[];

async function callOpenRouterJson<T>(
  systemPrompt: string,
  userContent: OpenRouterUserContent,
  schema: z.ZodType<T>,
  apiKey: string,
  model: string,
): Promise<T> {
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), 30000);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
          "X-Title":
            process.env.OPENROUTER_SITE_TITLE ||
            "Kho Hoc Lieu So Tiep Can Hoc Sinh Khiem Thi",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenRouter HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter trả về nội dung rỗng.");
    }

    const jsonString = extractJsonString(content);
    const parsed = JSON.parse(jsonString);
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      throw new Error("Cấu trúc JSON từ LLM không khớp schema.");
    }

    return validated.data;
  } finally {
    clearTimeout(timer);
  }
}

// ==========================================
// 3. ACTION 1: split_outline
// ==========================================

function localFallbackSplitOutline(
  rawText: string,
  lessonNumber?: number,
  lessonTitle?: string,
): SplitOutlineSectionItem[] {
  const prefix =
    typeof lessonNumber === "number" &&
    Number.isFinite(lessonNumber) &&
    lessonNumber > 0
      ? Math.trunc(lessonNumber)
      : 1;

  const lines = rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const headingRegex =
    /^(?:(?:Mục|Phần|Chương)\s+\d+|[IVX]{1,4}\.|[0-9]+(?:\.[0-9]+)*[.)]|[a-zA-Z]\))\s+(.+)$/i;

  const rawGroups: { heading: string; paragraphs: string[] }[] = [];
  let current: { heading: string; paragraphs: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(headingRegex);
    const isShortCapsHeading =
      !match &&
      line.length >= 5 &&
      line.length <= 110 &&
      !/[.!?]$/.test(line) &&
      line === line.toUpperCase() &&
      /[A-ZÀ-Ỹ]/.test(line);

    if (match || isShortCapsHeading) {
      const cleanHeading = (match ? match[1] : line)
        .replace(/^[:.-]+\s*/, "")
        .trim();
      if (current && current.paragraphs.length === 0) {
        current.heading = `${current.heading}: ${cleanHeading}`;
      } else {
        if (current && current.paragraphs.length > 0) {
          rawGroups.push(current);
        }
        current = {
          heading: cleanHeading || `Mục ${rawGroups.length + 1}`,
          paragraphs: [],
        };
      }
    } else {
      if (!current) {
        current = {
          heading: lessonTitle
            ? `Khái quát: ${lessonTitle}`
            : "Nội dung trọng tâm",
          paragraphs: [],
        };
      }
      current.paragraphs.push(line);
    }
  }

  if (current && current.paragraphs.length > 0) {
    rawGroups.push(current);
  }

  if (rawGroups.length <= 1) {
    const paragraphs = rawText
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length > 1) {
      rawGroups.length = 0;
      const chunkSize = Math.max(
        1,
        Math.ceil(paragraphs.length / Math.min(4, paragraphs.length)),
      );
      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        const slice = paragraphs.slice(i, i + chunkSize);
        const firstLine = slice[0].split(/(?<=[.!?])\s+|\n/)[0] ?? "";
        const heading =
          firstLine.length >= 6 && firstLine.length <= 95
            ? firstLine.replace(/[.!?]+$/, "")
            : `${lessonTitle || "Nội dung bài học"} - Phần ${rawGroups.length + 1}`;
        rawGroups.push({
          heading,
          paragraphs: slice,
        });
      }
    }
  }

  if (!rawGroups.length) {
    const cleanRaw = rawText.trim();
    return [
      {
        code: `${prefix}.1`,
        heading: lessonTitle || "Nội dung bài học",
        sourceText: cleanRaw,
        studyText: summarizeToStudyText(
          lessonTitle || "Nội dung bài học",
          cleanRaw,
        ),
        keywords: extractKeywordsFromText(
          lessonTitle || "Nội dung bài học",
          cleanRaw,
        ),
      },
    ];
  }

  return rawGroups.map((group, idx) => {
    const code = `${prefix}.${idx + 1}`;
    const sourceText = group.paragraphs.join("\n\n").trim() || group.heading;
    const studyText = summarizeToStudyText(group.heading, sourceText);
    const keywords = extractKeywordsFromText(group.heading, sourceText);
    return {
      code,
      heading: group.heading,
      sourceText,
      studyText,
      keywords,
    };
  });
}

async function callOpenRouterSplitOutline(
  input: z.infer<typeof splitOutlineRequestSchema>,
  apiKey: string,
  model: string,
): Promise<SplitOutlineSectionItem[]> {
  const prefix =
    typeof input.lessonNumber === "number" && input.lessonNumber > 0
      ? Math.trunc(input.lessonNumber)
      : 1;

  const systemPrompt = [
    "Bạn là chuyên gia sư phạm lịch sử và thiết kế học liệu số tiếp cận cho học sinh khiếm thị (accessibility educator).",
    "Nhiệm vụ: Phân tích văn bản sách giáo khoa / tài liệu Word đầu vào và tách thành danh sách các mục học tập (sections) có cấu trúc bảng phân cấp.",
    `Quy tắc đánh mã mục: Dùng tiền tố số bài là "${prefix}." để đánh mã tuần tự "${prefix}.1", "${prefix}.2", "${prefix}.3"...`,
    "Với mỗi mục:",
    '- code: Mã mục dạng chuỗi (ví dụ: "1.1", "1.2").',
    "- heading: Tiêu đề mục ngắn gọn, chuẩn hóa, rõ nghĩa.",
    "- sourceText: Văn bản gốc từ SGK tương ứng với mục đó để giáo viên đối chiếu (giữ đầy đủ thông tin gốc).",
    "- studyText: Bản 'Nội dung học' đã được chế biến cô đọng thành các ý chính ('Ý chính 1: ...\\nÝ chính 2: ...') mạch lạc, dễ nghe qua giọng đọc TTS / trình đọc màn hình cho học sinh khiếm thị, tuyệt đối không dùng ký hiệu trang trí thị giác gây nhiễu âm thanh (như ***, ===, bảng ASCII).",
    "- keywords: Mảng 3-6 từ khóa ngữ nghĩa quan trọng của mục.",
    "Chỉ trả về đúng một JSON object hợp lệ theo mẫu sau, không kèm bất kỳ lời dẫn hay markdown nào ngoài JSON:",
    JSON.stringify({
      sections: [
        {
          code: `${prefix}.1`,
          heading: "Tiêu đề mục chuẩn hóa",
          sourceText: "Văn bản gốc từ sách giáo khoa...",
          studyText: "Ý chính 1: ...\nÝ chính 2: ...",
          keywords: ["từ khóa 1", "từ khóa 2"],
        },
      ],
    }),
  ].join("\n");

  const userPrompt = [
    input.lessonTitle ? `Tên bài học: ${input.lessonTitle}` : "",
    input.lessonNumber ? `Bài số: ${input.lessonNumber}` : "",
    "Văn bản đầu vào cần tách khung mục lục:",
    input.rawText.slice(0, 40000),
  ]
    .filter(Boolean)
    .join("\n\n");

  const validated = await callOpenRouterJson(
    systemPrompt,
    userPrompt,
    splitOutlineOutputSchema,
    apiKey,
    model,
  );

  return validated.sections.map((sec, idx) => ({
    ...sec,
    code: `${prefix}.${idx + 1}`,
  }));
}

// ==========================================
// 4. ACTION 2: generate_study_content
// ==========================================

function localFallbackGenerateStudyContent(
  input: z.infer<typeof generateStudyContentRequestSchema>,
): { studyText: string; summary: string; keywords: string[] } {
  const studyText = summarizeToStudyText(
    input.heading,
    input.sourceText,
    input.imageDescriptions,
  );
  const sentences = splitIntoSentences(input.sourceText);
  const summary = sentences.length
    ? `${input.heading}: ${sentences[0]}`
    : `${input.heading}: ${cleanForSpeech(input.sourceText).slice(0, 220)}`;
  const keywords = extractKeywordsFromText(input.heading, input.sourceText);
  return { studyText, summary, keywords };
}

async function callOpenRouterGenerateStudyContent(
  input: z.infer<typeof generateStudyContentRequestSchema>,
  apiKey: string,
  model: string,
): Promise<{ studyText: string; summary?: string; keywords: string[] }> {
  const systemPrompt = [
    "Bạn là chuyên gia sư phạm lịch sử và biên soạn học liệu số tiếp cận cho học sinh mù và khiếm thị.",
    "Nhiệm vụ: Chuyển đổi 'Nội dung gốc (SGK)' thành bản 'Nội dung học' (studyText) cô đọng các ý cốt lõi như lời giảng của giáo viên trên lớp, tối ưu để nghe qua giọng đọc TTS và trình đọc màn hình.",
    "Yêu cầu bắt buộc:",
    "1. Chia thành các dòng bắt đầu bằng 'Ý chính 1:', 'Ý chính 2:', 'Ý chính 3:'... (mỗi ý chính là một đoạn/dòng mạch lạc, câu văn rõ chủ ngữ - vị ngữ, giải thích rõ mốc thời gian và sự kiện).",
    "2. Không dùng ký hiệu thị giác gây nhiễu âm thanh (như ***, ===, ---, ->, bảng ASCII).",
    "3. Nếu có danh sách mô tả hình ảnh đi kèm (imageDescriptions), hãy lồng ghép tự nhiên lời mô tả ảnh vào đúng ý chính có ngữ nghĩa liên quan nhất.",
    "4. Trả về thêm summary (1 câu tóm tắt cốt lõi của mục) và keywords (3-6 từ khóa ngữ nghĩa của mục).",
    "Chỉ trả về đúng một JSON object hợp lệ theo mẫu sau, không kèm lời dẫn hay markdown ngoài JSON:",
    JSON.stringify({
      studyText:
        "Ý chính 1 (Bối cảnh): ...\nÝ chính 2 (Diễn biến chính): ...\nÝ chính 3 (Ý nghĩa): ...",
      summary: "Tóm tắt ngắn gọn 1 câu về nội dung trọng tâm của mục.",
      keywords: ["từ khóa 1", "từ khóa 2", "từ khóa 3"],
    }),
  ].join("\n");

  const userPrompt = [
    input.lessonTitle ? `Bài học: ${input.lessonTitle}` : "",
    `Tiêu đề mục: ${input.heading}`,
    `Nội dung gốc (SGK):\n${input.sourceText.slice(0, 25000)}`,
    input.imageDescriptions?.length
      ? `Mô tả hình ảnh tư liệu cần lồng ghép:\n${input.imageDescriptions.join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const validated = await callOpenRouterJson(
    systemPrompt,
    userPrompt,
    generateStudyContentOutputSchema,
    apiKey,
    model,
  );

  return {
    studyText: validated.studyText.trim(),
    summary: validated.summary?.trim(),
    keywords:
      validated.keywords && validated.keywords.length > 0
        ? validated.keywords
        : extractKeywordsFromText(input.heading, input.sourceText),
  };
}

// ==========================================
// 5. ACTION 3: insert_image_semantic
// ==========================================

function normalizeVietnameseTokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[.,;:!?()"'“”‘’[\]{}<>/\\|+-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function localFallbackInsertImageSemantic(
  input: z.infer<typeof insertImageSemanticRequestSchema>,
): z.infer<typeof insertImageSemanticOutputSchema> {
  const baseText = (
    input.studyText?.trim() ||
    input.sourceText?.trim() ||
    input.heading?.trim() ||
    "Nội dung mục học tập."
  ).trim();

  const rawCaption = input.imageCaption?.trim() || "";
  const captionClean = rawCaption
    ? cleanForSpeech(rawCaption).replace(/[.!?]+$/, "")
    : `Tư liệu lịch sử của mục ${cleanForSpeech(input.heading || "bài học")}`;
  const contextClean = input.imageContext
    ? cleanForSpeech(input.imageContext).replace(/[.!?]+$/, "")
    : "";

  const description = contextClean
    ? `Hình ảnh tư liệu "${captionClean}" khắc họa ${contextClean.charAt(0).toLowerCase()}${contextClean.slice(1)}, giúp người học hình dung rõ bối cảnh và ý nghĩa lịch sử của sự kiện đang nghe.`
    : rawCaption
      ? `Hình ảnh tư liệu "${captionClean}" minh họa trực quan cho bối cảnh, nhân vật và diễn biến lịch sử trọng tâm của mục ${input.heading || "bài học"}.`
      : `Hình ảnh tư liệu đính kèm minh họa trực quan cho bối cảnh, nhân vật và sự kiện lịch sử trọng tâm của mục "${input.heading || "bài học"}", giúp học sinh khiếm thị nắm bắt mạch nội dung đang nghe.`;

  const lines = baseText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const sentences =
    lines.length > 1
      ? lines
      : baseText
          .split(/(?<=[.!?…])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);

  if (!sentences.length) {
    const marker = `[Mô tả ảnh chèn tự động: ${description}]`;
    return {
      description,
      insertedText: `${baseText} ${marker}`.trim(),
      insertedAfterSentence: baseText,
      reason:
        "Chèn ngay sau câu duy nhất của mục để bổ sung thông tin trực quan cho người nghe.",
    };
  }

  const queryTokens = normalizeVietnameseTokens(
    `${rawCaption} ${input.imageContext ?? ""} ${input.heading ?? ""}`,
  );
  let bestIdx = 0;
  let bestScore = -1;
  let matchedTerms: string[] = [];

  sentences.forEach((sentence, idx) => {
    const sentLower = sentence.toLowerCase();
    const hits: string[] = [];
    for (const token of queryTokens) {
      if (token.length >= 3 && sentLower.includes(token)) {
        if (!hits.includes(token)) hits.push(token);
      }
    }
    if (hits.length > bestScore) {
      bestScore = hits.length;
      bestIdx = idx;
      matchedTerms = hits;
    }
  });

  const targetSentence = sentences[bestIdx];
  const insertionNote = `[Mô tả ảnh chèn tự động: ${description}]`;
  const updatedSentences = [...sentences];
  updatedSentences[bestIdx] = `${targetSentence} ${insertionNote}`;

  const joiner = lines.length > 1 ? "\n" : " ";
  const insertedText = updatedSentences.join(joiner);

  const reason =
    matchedTerms.length > 0
      ? `Chèn ngay sau câu có độ khớp ngữ nghĩa cao nhất (khớp các từ khóa: "${matchedTerms.slice(0, 5).join(", ")}" trong mạch bài giảng) để học sinh khiếm thị hình dung được bức ảnh ngay khi vừa nghe tới sự kiện đó.`
      : `Chèn ngay sau ý chính mở đầu ("${targetSentence.slice(0, 80)}...") để cung cấp bối cảnh trực quan liền mạch trước khi nghe tiếp diễn biến tiếp theo.`;

  return {
    description,
    insertedText,
    insertedAfterSentence: targetSentence,
    reason,
  };
}

async function callOpenRouterInsertImageSemantic(
  input: z.infer<typeof insertImageSemanticRequestSchema>,
  apiKey: string,
  model: string,
  useVision = true,
): Promise<
  z.infer<typeof insertImageSemanticOutputSchema> & { usedVision: boolean }
> {
  const baseText = (
    input.studyText?.trim() ||
    input.sourceText?.trim() ||
    input.heading?.trim() ||
    ""
  ).trim();

  const imageDataUrl = useVision ? input.imageDataUrl?.trim() : undefined;
  const hasImage = Boolean(imageDataUrl);
  const captionLabel =
    input.imageCaption?.trim() ||
    (hasImage
      ? "(Giáo viên tải ảnh trực tiếp, hãy quan sát bức ảnh để nhận diện sự kiện và viết mô tả chi tiết)"
      : `Hình tư liệu mục ${input.heading || "bài học"}`);

  const systemPrompt = [
    "Bạn là chuyên gia sư phạm lịch sử và thiết kế học liệu tiếp cận cho học sinh khiếm thị (Semantic Audio Description & Vision AI).",
    "Nhiệm vụ 2 bước:",
    hasImage
      ? "Bước 1 (Phân tích ảnh bằng Vision AI): Quan sát kỹ bức ảnh lịch sử được đính kèm kết hợp với tiêu đề/chú thích (nếu có) và nội dung mục học. Hãy viết lời mô tả bức ảnh (description) giàu thông tin, sống động và chuẩn xác cho học sinh khiếm thị: nêu rõ bối cảnh không gian/thời gian, nhân vật hoặc đối tượng trung tâm, hành động/tư thế/biểu cảm hoặc chi tiết tư liệu nổi bật trong ảnh, và ý nghĩa lịch sử của bức ảnh."
      : "Bước 1: Viết lời mô tả bức ảnh lịch sử (description) giàu thông tin, nêu rõ bối cảnh, nhân vật/chi tiết chính và ý nghĩa lịch sử dựa trên tiêu đề/chú thích ảnh (imageCaption) và bối cảnh bổ sung (imageContext).",
    "Bước 2: Phân tích ngữ nghĩa của văn bản 'Nội dung học' hiện tại để tìm câu văn có liên hệ ngữ nghĩa chặt chẽ nhất (insertedAfterSentence), sau đó chèn lời mô tả ảnh vào NGAY SAU câu văn đó theo định dạng '[Mô tả ảnh chèn tự động: <description>]' để tạo thành văn bản hoàn chỉnh (insertedText) giúp học sinh khiếm thị nghe liền mạch không bị đứt đoạn.",
    "Giải thích ngắn gọn lý do vì sao chọn vị trí chèn đó trong trường 'reason'.",
    "Chỉ trả về đúng một JSON object hợp lệ theo mẫu sau, không kèm bất kỳ văn bản nào ngoài JSON:",
    JSON.stringify({
      description:
        "Hình ảnh tư liệu tại ... ghi lại cảnh ..., thể hiện ý nghĩa lịch sử ...",
      insertedText:
        "Ý chính 1: ... [Mô tả ảnh chèn tự động: Hình ảnh tư liệu tại ...]\nÝ chính 2: ...",
      insertedAfterSentence:
        "Câu văn trong bài được chọn làm điểm neo để chèn ngay phía sau.",
      reason:
        "Chèn ngay sau câu nói về sự kiện ... để người học hình dung ngay không khí lịch sử tại thời điểm đó.",
    }),
  ].join("\n");

  const textPrompt = [
    input.heading ? `Tiêu đề mục: ${input.heading}` : "",
    `Chú thích / Tiêu đề bức ảnh: ${captionLabel}`,
    input.imageContext ? `Bối cảnh / Chi tiết bức ảnh: ${input.imageContext}` : "",
    `Nội dung học hiện tại cần chèn mô tả ảnh:\n${baseText.slice(0, 25000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const userContent: OpenRouterUserContent =
    hasImage && imageDataUrl
      ? [
          { type: "text", text: textPrompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ]
      : textPrompt;

  const validated = await callOpenRouterJson(
    systemPrompt,
    userContent,
    insertImageSemanticOutputSchema,
    apiKey,
    model,
  );

  return {
    ...validated,
    usedVision: hasImage,
  };
}

// ==========================================
// 6. ACTION 4: generate_quiz
// ==========================================

function localFallbackGenerateQuiz(
  input: z.infer<typeof generateQuizRequestSchema>,
): GeneratedQuizQuestion[] {
  const baseText = (
    input.studyText?.trim() ||
    input.sourceText?.trim() ||
    input.heading
  ).trim();

  const cleanSentences = splitIntoSentences(baseText)
    .map((s) =>
      s
        .replace(/^Ý chính\s*\d+\s*(\([^)]*\))?:\s*/i, "")
        .replace(/\[Mô tả ảnh[^\]]*\]/gi, "")
        .trim(),
    )
    .filter((s) => s.length >= 15);

  const primaryFact =
    cleanSentences[0] ||
    `Nội dung trọng tâm của mục "${input.heading}" trình bày bối cảnh, diễn biến và ý nghĩa lịch sử cốt lõi của sự kiện.`;
  const secondaryFact =
    cleanSentences[1] ||
    cleanSentences[0] ||
    `Sự kiện trong mục "${input.heading}" đánh dấu bước phát triển quan trọng trong tiến trình lịch sử.`;

  const desiredCount = Math.min(Math.max(input.count ?? 2, 1), 3);
  const list: GeneratedQuizQuestion[] = [
    {
      prompt: `Nội dung nào sau đây phản ánh đúng trọng tâm của mục "${input.heading}"?`,
      options: [
        primaryFact.slice(0, 280),
        "Sự kiện diễn ra hoàn toàn biệt lập, không có sự tham gia hay phối hợp của các lực lượng trong nước và quốc tế.",
        "Mục tiêu duy nhất của giai đoạn này là duy trì nguyên trạng chế độ thuộc địa và phong kiến cũ.",
        "Các hoạt động chỉ giới hạn trong lĩnh vực văn hóa nghệ thuật, không tác động tới chính trị hay xã hội.",
      ],
      correctOptionId: 0,
      explanation: `Đáp án 1 đúng vì bám sát nội dung cốt lõi của mục "${input.heading}": ${primaryFact.slice(0, 260)}`,
      sourceSectionId: input.sectionId,
    },
  ];

  if (desiredCount >= 2) {
    list.push({
      prompt: `Nhận định nào sau đây phù hợp với tư liệu và sự kiện được nêu trong mục "${input.heading}"?`,
      options: [
        "Sự kiện này làm chấm dứt hoàn toàn mọi hoạt động ngoại giao và hợp tác quốc tế sau đó.",
        secondaryFact.slice(0, 280),
        "Quá trình diễn biến không gắn với bất kỳ mốc thời gian hay văn kiện lịch sử cụ thể nào.",
        "Kết quả của sự kiện chỉ mang tính chất địa phương, không để lại bài học hay ý nghĩa lịch sử.",
      ],
      correctOptionId: 1,
      explanation: `Đáp án 2 đúng vì phản ánh chính xác thông tin trong mục "${input.heading}": ${secondaryFact.slice(0, 260)}`,
      sourceSectionId: input.sectionId,
    });
  }

  return list;
}

async function callOpenRouterGenerateQuiz(
  input: z.infer<typeof generateQuizRequestSchema>,
  apiKey: string,
  model: string,
): Promise<GeneratedQuizQuestion[]> {
  const baseText = (
    input.studyText?.trim() ||
    input.sourceText?.trim() ||
    input.heading
  ).trim();
  const count = Math.min(Math.max(input.count ?? 2, 1), 4);

  const systemPrompt = [
    "Bạn là chuyên gia khảo thí và biên soạn câu hỏi trắc nghiệm Lịch sử THPT hỗ trợ học sinh khiếm thị.",
    `Nhiệm vụ: Dựa chặt vào nội dung của mục học tập được cung cấp, hãy tạo ${count} câu hỏi trắc nghiệm khách quan (mức độ Nhận biết và Thông hiểu).`,
    "Yêu cầu bắt buộc:",
    "- Mỗi câu hỏi (prompt) phải rõ ràng, không dùng câu hỏi phủ định đánh đố phức tạp khi nghe bằng giọng đọc.",
    "- Mỗi câu hỏi có đúng 4 lựa chọn (options là mảng 4 chuỗi văn bản đầy đủ, không cần ghi tiền tố 'A.', 'B.' vì giao diện đã đánh số 1, 2, 3, 4).",
    "- correctOptionId là chỉ số đáp án đúng từ 0 đến 3.",
    "- explanation giải thích ngắn gọn, súc tích vì sao đáp án đó đúng dựa trên nội dung mục học.",
    "Chỉ trả về đúng một JSON object hợp lệ theo mẫu sau, không kèm lời dẫn hay markdown ngoài JSON:",
    JSON.stringify({
      questions: [
        {
          prompt: "Câu hỏi trắc nghiệm rõ nghĩa...",
          options: [
            "Lựa chọn thứ nhất",
            "Lựa chọn thứ hai",
            "Lựa chọn thứ ba",
            "Lựa chọn thứ tư",
          ],
          correctOptionId: 0,
          explanation: "Giải thích căn cứ theo nội dung mục học...",
        },
      ],
    }),
  ].join("\n");

  const userPrompt = [
    `Tiêu đề mục: ${input.heading}`,
    `Số câu hỏi cần tạo: ${count}`,
    `Nội dung mục học:\n${baseText.slice(0, 25000)}`,
  ].join("\n\n");

  const validated = await callOpenRouterJson(
    systemPrompt,
    userPrompt,
    generateQuizOutputSchema,
    apiKey,
    model,
  );

  return validated.questions.map((q) => ({
    ...q,
    sourceSectionId: input.sectionId,
  }));
}

// ==========================================
// 7. ACTION 5: ask_lesson
// ==========================================

function stripVietnameseDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

const ASK_STOP_WORDS = new Set([
  "la",
  "gi",
  "nao",
  "tai",
  "sao",
  "cua",
  "va",
  "cho",
  "toi",
  "biet",
  "hay",
  "trong",
  "co",
  "khong",
  "nhung",
  "cac",
  "duoc",
  "ve",
  "khi",
  "o",
  "mot",
  "the",
  "thu",
  "bao",
  "nhieu",
  "hoi",
  "bai",
  "hoc",
  "muc",
  "nay",
  "do",
  "tren",
  "duoi",
  "voi",
  "nhu",
]);

const SEMANTIC_TOPIC_EXPANSIONS: {
  patterns: string[];
  expandedTerms: string[];
}[] = [
  {
    patterns: ["cay da tan trao", "tan trao", "quan lenh so 1", "xuat quan"],
    expandedTerms: [
      "tan",
      "trao",
      "thai",
      "nguyen",
      "vo",
      "nguyen",
      "giap",
      "giai",
      "phong",
      "16",
      "1945",
      "khoi",
      "nghia",
    ],
  },
  {
    patterns: [
      "tong khoi nghia",
      "cach mang thang tam",
      "gianh chinh quyen",
      "tuyen ngon doc lap",
      "ba dinh",
    ],
    expandedTerms: [
      "thang",
      "tam",
      "1945",
      "ha",
      "noi",
      "hue",
      "sai",
      "gon",
      "19",
      "23",
      "25",
      "ho",
      "chi",
      "minh",
      "doc",
      "lap",
    ],
  },
  {
    patterns: [
      "to chuc giu hoa binh",
      "giu gin hoa binh",
      "an ninh quoc te",
      "lien hop quoc",
      "ianta",
      "hien chuong",
    ],
    expandedTerms: [
      "lien",
      "hop",
      "quoc",
      "hoa",
      "binh",
      "an",
      "ninh",
      "ianta",
      "1945",
      "hien",
      "chuong",
      "dong",
      "minh",
    ],
  },
  {
    patterns: ["doi moi", "dai hoi vi", "1986", "kinh te thi truong"],
    expandedTerms: [
      "doi",
      "moi",
      "1986",
      "kinh",
      "te",
      "dai",
      "hoi",
      "khung",
      "hoang",
    ],
  },
];

type SectionCandidate = {
  sectionId: string;
  sectionCode?: string;
  heading: string;
  blockId?: string;
  page?: number;
  studyText: string;
  sourceText: string;
  excerpt: string;
  keywords: string[];
};

function buildSectionCandidates(
  sections: z.infer<typeof askLessonSectionItemSchema>[],
): SectionCandidate[] {
  const candidates: SectionCandidate[] = [];

  for (const section of sections) {
    const studyText = (
      section.studyText?.trim() ||
      section.body?.trim() ||
      (section.blocks ?? [])
        .map((b) => b.text.trim())
        .filter(Boolean)
        .join("\n\n") ||
      ""
    ).trim();
    const sourceText = (section.sourceText?.trim() || "").trim();
    const keywords = section.keywords ?? [];

    if (section.blocks && section.blocks.length > 0) {
      for (const block of section.blocks) {
        const blockClean = block.text.trim();
        if (!blockClean) continue;
        candidates.push({
          sectionId: section.id,
          sectionCode: section.code,
          heading: section.heading,
          blockId: block.id,
          page: block.page,
          studyText: blockClean,
          sourceText,
          excerpt: blockClean.slice(0, 600),
          keywords,
        });
      }
    } else if (studyText || sourceText) {
      const primary = studyText || sourceText;
      candidates.push({
        sectionId: section.id,
        sectionCode: section.code,
        heading: section.heading,
        blockId: `${section.id}-p1`,
        studyText: primary,
        sourceText,
        excerpt: primary.slice(0, 600),
        keywords,
      });
    }
  }

  return candidates;
}

function rankCandidatesForQuestion(
  question: string,
  candidates: SectionCandidate[],
): { candidate: SectionCandidate; score: number; directHits: number }[] {
  const normQuestion = stripVietnameseDiacritics(question.trim());
  const directTokens = [
    ...new Set(normQuestion.match(/[a-z0-9]+/g) ?? []),
  ].filter((t) => !ASK_STOP_WORDS.has(t) && t.length > 1);

  const expandedTokens = new Set<string>(directTokens);
  for (const group of SEMANTIC_TOPIC_EXPANSIONS) {
    if (group.patterns.some((p) => normQuestion.includes(p))) {
      for (const term of group.expandedTerms) {
        expandedTokens.add(term);
      }
    }
  }

  return candidates
    .map((candidate) => {
      const combinedText = [
        candidate.sectionCode ?? "",
        candidate.heading,
        candidate.studyText,
        candidate.sourceText,
        candidate.keywords.join(" "),
      ].join(" ");
      const normCombined = stripVietnameseDiacritics(combinedText);
      const wordSet = new Set(normCombined.split(/\W+/).filter(Boolean));

      let directHits = 0;
      for (const token of directTokens) {
        if (wordSet.has(token) || normCombined.includes(token)) {
          directHits += 1;
        }
      }

      let semanticBonus = 0;
      for (const token of expandedTokens) {
        if (!directTokens.includes(token) && wordSet.has(token)) {
          semanticBonus += 0.5;
        }
      }

      // Bonus if multi-word phrase appears contiguous
      if (normQuestion.length >= 6 && normCombined.includes(normQuestion)) {
        semanticBonus += 3;
      }

      // Bonus for matching section keyword directly
      for (const kw of candidate.keywords) {
        const normKw = stripVietnameseDiacritics(kw.trim());
        if (normKw.length >= 3 && normQuestion.includes(normKw)) {
          semanticBonus += 2;
        }
      }

      return {
        candidate,
        score: directHits + semanticBonus,
        directHits,
      };
    })
    .sort((a, b) => b.score - a.score || b.directHits - a.directHits);
}

function buildSuggestedQuestions(
  sections: z.infer<typeof askLessonSectionItemSchema>[],
): string[] {
  return sections
    .slice(0, 3)
    .map((s) =>
      s.code
        ? `Nội dung trọng tâm của Mục ${s.code} (${s.heading}) là gì?`
        : `Ý chính của mục "${s.heading}" là gì?`,
    );
}

function localFallbackAskLesson(
  input: z.infer<typeof askLessonRequestSchema>,
): Omit<AskLessonResponse, "provider" | "fallback" | "model" | "notice"> {
  const lessonId = input.lessonId?.trim() || "current-lesson";
  const candidates = buildSectionCandidates(input.sections);

  if (!candidates.length) {
    return {
      text: "Chưa đủ thông tin trong bài học để trả lời câu hỏi này. Bài học hiện chưa có nội dung chi tiết.",
      citations: [],
      mode: "retrieval",
      status: "insufficient_evidence",
      suggestedQuestions: [],
    };
  }

  const normQuestion = stripVietnameseDiacritics(input.question.trim());
  const directTokens = [
    ...new Set(normQuestion.match(/[a-z0-9]+/g) ?? []),
  ].filter((t) => !ASK_STOP_WORDS.has(t) && t.length > 1);

  const ranked = rankCandidatesForQuestion(input.question, candidates);
  const top = ranked[0];

  const minRequiredScore =
    directTokens.length <= 1
      ? 1
      : Math.max(1.5, Math.min(3, Math.ceil(directTokens.length * 0.5)));

  if (!directTokens.length || !top || top.score < minRequiredScore) {
    return {
      text: "Chưa đủ thông tin trong bài học để trả lời câu hỏi này. Bạn có thể xem mục lục hoặc hỏi về một sự kiện, nhân vật, mốc thời gian cụ thể trong bài.",
      citations: [],
      mode: "retrieval",
      status: "insufficient_evidence",
      suggestedQuestions: buildSuggestedQuestions(input.sections),
    };
  }

  const topMatches = ranked
    .filter((item, idx) => idx === 0 || item.score >= top.score * 0.75)
    .slice(0, 2);

  // Find the most relevant sentences within the top matching section
  const allSentences = splitIntoSentences(
    `${top.candidate.studyText}\n${top.candidate.sourceText}`,
  );
  const scoredSentences = allSentences
    .map((sentence) => {
      const normSent = stripVietnameseDiacritics(sentence);
      let hits = 0;
      for (const token of directTokens) {
        if (normSent.includes(token)) hits += 1;
      }
      return { sentence, hits };
    })
    .sort((a, b) => b.hits - a.hits);

  const bestSentences = scoredSentences
    .filter((s) => s.hits > 0)
    .slice(0, 2)
    .map((s) => s.sentence);

  const sectionLabel = top.candidate.sectionCode
    ? `Mục ${top.candidate.sectionCode} (${top.candidate.heading})`
    : `mục "${top.candidate.heading}"`;

  const answerBody =
    bestSentences.length > 0
      ? bestSentences.join(" ")
      : cleanForSpeech(top.candidate.studyText);

  const text = `Theo ${sectionLabel}: ${answerBody}`;

  const seenSectionBlocks = new Set<string>();
  const citations: AskLessonCitation[] = [];
  for (const item of topMatches) {
    const key = `${item.candidate.sectionId}::${item.candidate.blockId ?? ""}`;
    if (seenSectionBlocks.has(key)) continue;
    seenSectionBlocks.add(key);
    citations.push({
      lessonId,
      sectionId: item.candidate.sectionId,
      blockId: item.candidate.blockId,
      page: item.candidate.page,
      excerpt: item.candidate.excerpt,
    });
  }

  return {
    text,
    citations,
    mode: "retrieval",
    status: "ok",
    suggestedQuestions: buildSuggestedQuestions(input.sections),
  };
}

async function callOpenRouterAskLesson(
  input: z.infer<typeof askLessonRequestSchema>,
  apiKey: string,
  model: string,
): Promise<
  Omit<AskLessonResponse, "provider" | "fallback" | "model" | "notice">
> {
  const lessonId = input.lessonId?.trim() || "current-lesson";
  const candidates = buildSectionCandidates(input.sections);

  if (!candidates.length) {
    return localFallbackAskLesson(input);
  }

  const contextLines = input.sections.map((sec, idx) => {
    const firstBlock = sec.blocks?.[0];
    const study = (
      sec.studyText?.trim() ||
      sec.body?.trim() ||
      (sec.blocks ?? []).map((b) => b.text).join("\n") ||
      ""
    ).trim();
    const source = (sec.sourceText?.trim() || "").trim();
    return [
      `--- MỤC ${idx + 1} ---`,
      `sectionId: ${sec.id}`,
      sec.code ? `code: ${sec.code}` : "",
      firstBlock?.id ? `blockId: ${firstBlock.id}` : "",
      firstBlock?.page ? `page: ${firstBlock.page}` : "",
      `heading: ${sec.heading}`,
      study ? `Nội dung học (studyText):\n${study}` : "",
      source ? `Nội dung gốc SGK (sourceText):\n${source}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  const systemPrompt = [
    "Bạn là trợ giảng AI lịch sử hỗ trợ học sinh và học sinh khiếm thị.",
    "Nhiệm vụ: Trả lời câu hỏi của học sinh DỰA CHẶT VÀO nội dung bài học được cung cấp (bao gồm cả 'Nội dung học' và 'Nội dung gốc SGK').",
    "Quy tắc bắt buộc:",
    "1. Trả lời trực tiếp, ngắn gọn (2-4 câu), mạch lạc, dễ nghe qua giọng đọc TTS / trình đọc màn hình, không dùng ký hiệu trang trí thị giác.",
    "2. Tuyệt đối không bịa đặt sự kiện nằm ngoài nội dung bài học. Nếu câu hỏi hoàn toàn không liên quan hoặc bài học không có thông tin để trả lời, đặt status = 'insufficient_evidence', citations = [] và giải thích lịch sự.",
    "3. Nếu trả lời được, đặt status = 'ok' và trả về mảng 'citations' (1-2 mục) trỏ đúng tới 'sectionId' (và 'blockId' nếu có) trong danh sách mục đã cung cấp, kèm 'excerpt' trích đoạn ngắn từ mục đó.",
    "4. Trả về thêm 'suggestedQuestions' gồm 2-3 câu hỏi gợi ý tiếp theo bám sát bài học.",
    "Chỉ trả về đúng một JSON object hợp lệ theo mẫu sau, không kèm bất kỳ văn bản nào ngoài JSON:",
    JSON.stringify({
      text: "Theo Mục 6.1 (Bối cảnh lịch sử): ...",
      status: "ok",
      citations: [
        {
          sectionId: "id-cua-muc",
          blockId: "id-cua-block",
          excerpt: "Trích đoạn ngắn làm căn cứ trong bài...",
        },
      ],
      suggestedQuestions: [
        "Câu hỏi gợi ý 1?",
        "Câu hỏi gợi ý 2?",
      ],
    }),
  ].join("\n");

  const userPrompt = [
    input.lessonTitle ? `Bài học: ${input.lessonTitle}` : "",
    `Câu hỏi của học sinh: ${input.question}`,
    "Dữ liệu các mục của bài học:",
    contextLines.join("\n\n").slice(0, 35000),
  ]
    .filter(Boolean)
    .join("\n\n");

  const validated = await callOpenRouterJson(
    systemPrompt,
    userPrompt,
    askLessonLlmOutputSchema,
    apiKey,
    model,
  );

  // Verify and map citations to valid sectionId/blockId from input.sections
  const validCitations: AskLessonCitation[] = [];
  for (const rawCit of validated.citations ?? []) {
    const matchedSection = input.sections.find(
      (s) => s.id === rawCit.sectionId,
    );
    if (!matchedSection) continue;
    const matchedBlock =
      matchedSection.blocks?.find((b) => b.id === rawCit.blockId) ??
      matchedSection.blocks?.[0];
    const fallbackExcerpt = (
      matchedBlock?.text ||
      matchedSection.studyText ||
      matchedSection.body ||
      matchedSection.sourceText ||
      matchedSection.heading
    )
      .trim()
      .slice(0, 600);

    validCitations.push({
      lessonId,
      sectionId: matchedSection.id,
      blockId: matchedBlock?.id ?? rawCit.blockId,
      page: rawCit.page ?? matchedBlock?.page,
      excerpt: (rawCit.excerpt?.trim() || fallbackExcerpt).slice(0, 600),
    });
  }

  // If status is ok but LLM omitted valid sectionId, attach the highest-ranked section candidate
  const status = validated.status ?? (validCitations.length > 0 ? "ok" : "ok");
  if (status === "ok" && validCitations.length === 0) {
    const ranked = rankCandidatesForQuestion(input.question, candidates);
    if (ranked[0]) {
      validCitations.push({
        lessonId,
        sectionId: ranked[0].candidate.sectionId,
        blockId: ranked[0].candidate.blockId,
        page: ranked[0].candidate.page,
        excerpt: ranked[0].candidate.excerpt,
      });
    }
  }

  return {
    text: cleanForSpeech(validated.text),
    citations: status === "insufficient_evidence" ? [] : validCitations,
    mode: "ai_grounded",
    status,
    suggestedQuestions:
      validated.suggestedQuestions && validated.suggestedQuestions.length > 0
        ? validated.suggestedQuestions
        : buildSuggestedQuestions(input.sections),
  };
}

// ==========================================
// 8. ROUTE HANDLER (POST /api/ai-assistant)
// ==========================================

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Dữ liệu yêu cầu không phải JSON hợp lệ." }, 400);
  }

  const action =
    typeof body === "object" && body !== null && "action" in body
      ? (body as { action?: unknown }).action
      : undefined;

  const apiKey = (process.env.OPENROUTER_API_KEY ?? "").trim();
  const model =
    (process.env.OPENROUTER_MODEL ?? "").trim() ||
    "google/gemini-2.0-flash-001";

  // 1) split_outline
  if (action === "split_outline") {
    const parsedReq = splitOutlineRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      return reply(
        {
          error: parsedReq.error.issues
            .map((i) => `${i.path.join(".") || "payload"}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    }

    const input = parsedReq.data;
    if (apiKey) {
      try {
        const sections = await callOpenRouterSplitOutline(input, apiKey, model);
        const responseData: SplitOutlineResponse = {
          sections,
          provider: "openrouter",
          fallback: false,
          model,
        };
        return reply(responseData, 200);
      } catch {
        const sections = localFallbackSplitOutline(
          input.rawText,
          input.lessonNumber,
          input.lessonTitle,
        );
        const responseData: SplitOutlineResponse = {
          sections,
          provider: "local-fallback",
          fallback: true,
          model: "local-heuristic-v1",
          notice:
            "Không kết nối được OpenRouter LLM; đã tự động tách khung mục lục bằng bộ xử lý cấu trúc cục bộ.",
        };
        return reply(responseData, 200);
      }
    }

    const sections = localFallbackSplitOutline(
      input.rawText,
      input.lessonNumber,
      input.lessonTitle,
    );
    const responseData: SplitOutlineResponse = {
      sections,
      provider: "local-fallback",
      fallback: true,
      model: "local-heuristic-v1",
      notice:
        "Chưa cấu hình OPENROUTER_API_KEY; đã tách khung mục lục bằng bộ xử lý cấu trúc cục bộ.",
    };
    return reply(responseData, 200);
  }

  // 2) generate_study_content
  if (action === "generate_study_content") {
    const parsedReq = generateStudyContentRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      return reply(
        {
          error: parsedReq.error.issues
            .map((i) => `${i.path.join(".") || "payload"}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    }

    const input = parsedReq.data;
    if (apiKey) {
      try {
        const out = await callOpenRouterGenerateStudyContent(
          input,
          apiKey,
          model,
        );
        const responseData: GenerateStudyContentResponse = {
          studyText: out.studyText,
          summary: out.summary,
          keywords: out.keywords,
          provider: "openrouter",
          fallback: false,
          model,
        };
        return reply(responseData, 200);
      } catch {
        const out = localFallbackGenerateStudyContent(input);
        const responseData: GenerateStudyContentResponse = {
          ...out,
          provider: "local-fallback",
          fallback: true,
          model: "local-heuristic-v1",
          notice:
            "Không kết nối được OpenRouter LLM; đã chế biến Nội dung học bằng bộ xử lý tóm lược cục bộ.",
        };
        return reply(responseData, 200);
      }
    }

    const out = localFallbackGenerateStudyContent(input);
    const responseData: GenerateStudyContentResponse = {
      ...out,
      provider: "local-fallback",
      fallback: true,
      model: "local-heuristic-v1",
      notice:
        "Chưa cấu hình OPENROUTER_API_KEY; đã chế biến Nội dung học bằng bộ xử lý tóm lược cục bộ.",
    };
    return reply(responseData, 200);
  }

  // 3) insert_image_semantic
  if (action === "insert_image_semantic") {
    const parsedReq = insertImageSemanticRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      return reply(
        {
          error: parsedReq.error.issues
            .map((i) => `${i.path.join(".") || "payload"}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    }

    const input = parsedReq.data;
    const hasImage = Boolean(input.imageDataUrl && input.imageDataUrl.trim());

    if (apiKey) {
      try {
        const out = await callOpenRouterInsertImageSemantic(
          input,
          apiKey,
          model,
          hasImage,
        );
        const responseData: InsertImageSemanticResponse = {
          ...out,
          provider: "openrouter",
          fallback: false,
          model,
          usedVision: out.usedVision,
          notice: out.usedVision
            ? `Đã phân tích trực tiếp hình ảnh tải lên bằng Vision AI (${model}) và chèn mô tả vào đúng mạch ngữ nghĩa.`
            : undefined,
        };
        return reply(responseData, 200);
      } catch {
        // Nếu có ảnh mà model hiện tại trên OpenRouter không hỗ trợ multimodal image_url,
        // thử gọi lại OpenRouter ở chế độ văn bản (nếu có tiêu đề/chú thích hoặc tiêu đề mục) trước khi về local fallback.
        if (hasImage && (input.imageCaption?.trim() || input.heading?.trim())) {
          try {
            const textOut = await callOpenRouterInsertImageSemantic(
              input,
              apiKey,
              model,
              false,
            );
            const responseData: InsertImageSemanticResponse = {
              ...textOut,
              provider: "openrouter",
              fallback: false,
              model,
              usedVision: false,
              notice: `Model ${model} không hỗ trợ đọc ảnh trực tiếp (Vision) hoặc từ chối định dạng ảnh; hệ thống đã tự động chuyển sang mô tả ngữ nghĩa qua OpenRouter dựa trên tiêu đề/bối cảnh.`,
            };
            return reply(responseData, 200);
          } catch {
            // Chuyển hẳn xuống local fallback bên dưới
          }
        }

        const out = localFallbackInsertImageSemantic(input);
        const responseData: InsertImageSemanticResponse = {
          ...out,
          provider: "local-fallback",
          fallback: true,
          model: "local-heuristic-v1",
          usedVision: false,
          notice: hasImage
            ? `Model ${model} không hỗ trợ Vision AI hoặc lỗi kết nối OpenRouter; đã tự động chuyển sang bộ xử lý ngữ nghĩa cục bộ an toàn.`
            : "Không kết nối được OpenRouter LLM; đã mô tả và định vị chèn ảnh theo ngữ nghĩa bằng bộ xử lý cục bộ.",
        };
        return reply(responseData, 200);
      }
    }

    const out = localFallbackInsertImageSemantic(input);
    const responseData: InsertImageSemanticResponse = {
      ...out,
      provider: "local-fallback",
      fallback: true,
      model: "local-heuristic-v1",
      usedVision: false,
      notice: hasImage
        ? "Chưa cấu hình OPENROUTER_API_KEY để phân tích ảnh bằng Vision AI; đã mô tả và định vị chèn ảnh theo ngữ nghĩa bằng bộ xử lý cục bộ."
        : "Chưa cấu hình OPENROUTER_API_KEY; đã mô tả và định vị chèn ảnh theo ngữ nghĩa bằng bộ xử lý cục bộ.",
    };
    return reply(responseData, 200);
  }

  // 4) generate_quiz
  if (action === "generate_quiz") {
    const parsedReq = generateQuizRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      return reply(
        {
          error: parsedReq.error.issues
            .map((i) => `${i.path.join(".") || "payload"}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    }

    const input = parsedReq.data;
    if (apiKey) {
      try {
        const questions = await callOpenRouterGenerateQuiz(
          input,
          apiKey,
          model,
        );
        const responseData: GenerateQuizResponse = {
          questions,
          provider: "openrouter",
          fallback: false,
          model,
        };
        return reply(responseData, 200);
      } catch {
        const questions = localFallbackGenerateQuiz(input);
        const responseData: GenerateQuizResponse = {
          questions,
          provider: "local-fallback",
          fallback: true,
          model: "local-heuristic-v1",
          notice:
            "Không kết nối được OpenRouter LLM; đã tạo câu hỏi trắc nghiệm gợi ý bằng bộ xử lý cục bộ.",
        };
        return reply(responseData, 200);
      }
    }

    const questions = localFallbackGenerateQuiz(input);
    const responseData: GenerateQuizResponse = {
      questions,
      provider: "local-fallback",
      fallback: true,
      model: "local-heuristic-v1",
      notice:
        "Chưa cấu hình OPENROUTER_API_KEY; đã tạo câu hỏi trắc nghiệm gợi ý bằng bộ xử lý cục bộ.",
    };
    return reply(responseData, 200);
  }

  // 5) ask_lesson
  if (action === "ask_lesson") {
    const parsedReq = askLessonRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      return reply(
        {
          error: parsedReq.error.issues
            .map((i) => `${i.path.join(".") || "payload"}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    }

    const input = parsedReq.data;
    if (apiKey) {
      try {
        const out = await callOpenRouterAskLesson(input, apiKey, model);
        const responseData: AskLessonResponse = {
          ...out,
          provider: "openrouter",
          fallback: false,
          model,
        };
        return reply(responseData, 200);
      } catch {
        const out = localFallbackAskLesson(input);
        const responseData: AskLessonResponse = {
          ...out,
          provider: "local-fallback",
          fallback: true,
          model: "local-heuristic-v1",
          notice:
            "Không kết nối được OpenRouter LLM; đã trả lời và trích dẫn đoạn nguồn bằng bộ truy hồi ngữ nghĩa cục bộ.",
        };
        return reply(responseData, 200);
      }
    }

    const out = localFallbackAskLesson(input);
    const responseData: AskLessonResponse = {
      ...out,
      provider: "local-fallback",
      fallback: true,
      model: "local-heuristic-v1",
      notice:
        "Chưa cấu hình OPENROUTER_API_KEY; đã trả lời và trích dẫn đoạn nguồn bằng bộ truy hồi ngữ nghĩa cục bộ.",
    };
    return reply(responseData, 200);
  }

  return reply(
    {
      error:
        "Hành động AI không hợp lệ (hiện hỗ trợ: split_outline, generate_study_content, insert_image_semantic, generate_quiz, ask_lesson).",
    },
    400,
  );
}
