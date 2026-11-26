"use client";
import { useEffect, useRef, useState } from "react";
import type { Block, Lesson, Question, Section } from "../data/content";
import {
  appendText,
  blocksOf,
  extractYoutubeId,
  materialize,
  parseLesson,
  publicationIssues,
  renumberSectionCodes,
} from "../services/content";
import ContentBlocks from "./content-blocks";
import TableEditor from "./table-editor";

type Review = { source: boolean; accessibility: boolean };
type AiOutlineMeta = {
  provider: "openrouter" | "local-fallback";
  model?: string;
  notice?: string;
};
type SemanticInsertFeedback = {
  insertedAfterSentence: string;
  reason: string;
  provider: "openrouter" | "local-fallback";
  model?: string;
  usedVision?: boolean;
  notice?: string;
};
const MAX_VISION_IMAGE_BYTES = 4 * 1024 * 1024;
const COMPRESS_THRESHOLD_BYTES = Math.floor(1.5 * 1024 * 1024);
const ACCEPTED_VISION_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function formatByteSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2).replace(".", ",")} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx < 0) return 0;
  const base64 = dataUrl.slice(commaIdx + 1).replace(/\s+/g, "");
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Không đọc được dữ liệu hình ảnh."));
    };
    reader.onerror = () =>
      reject(new Error("Không đọc được tệp hình ảnh đã chọn."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Không giải mã được tệp hình ảnh để xem trước và nén."));
    img.src = src;
  });
}

async function prepareVisionImageDataUrl(file: File): Promise<{
  dataUrl: string;
  byteSize: number;
  compressed: boolean;
}> {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const validExt = ["jpg", "jpeg", "png", "webp"].includes(ext);
  if (mime && !ACCEPTED_VISION_IMAGE_TYPES.has(mime)) {
    throw new Error("Chỉ hỗ trợ tệp ảnh định dạng PNG, JPG hoặc WebP.");
  }
  if (!mime && !validExt) {
    throw new Error("Chỉ hỗ trợ tệp ảnh định dạng PNG, JPG hoặc WebP.");
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const rawBytes = estimateDataUrlBytes(rawDataUrl);
  const hasAllowedPrefix = /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(
    rawDataUrl,
  );

  if (
    hasAllowedPrefix &&
    rawBytes > 0 &&
    rawBytes <= COMPRESS_THRESHOLD_BYTES &&
    rawBytes <= MAX_VISION_IMAGE_BYTES
  ) {
    return { dataUrl: rawDataUrl, byteSize: rawBytes, compressed: false };
  }

  const img = await loadImageElement(rawDataUrl);
  const attempts: { maxDim: number; quality: number }[] = [
    { maxDim: 1600, quality: 0.82 },
    { maxDim: 1400, quality: 0.7 },
    { maxDim: 1024, quality: 0.58 },
  ];

  for (const { maxDim, quality } of attempts) {
    const scale = Math.min(
      1,
      maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
    );
    const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(img, 0, 0, width, height);
    const compressedUrl = canvas.toDataURL("image/jpeg", quality);
    const compressedBytes = estimateDataUrlBytes(compressedUrl);
    if (compressedBytes > 0 && compressedBytes <= MAX_VISION_IMAGE_BYTES) {
      return {
        dataUrl: compressedUrl,
        byteSize: compressedBytes,
        compressed: true,
      };
    }
  }

  if (hasAllowedPrefix && rawBytes > 0 && rawBytes <= MAX_VISION_IMAGE_BYTES) {
    return { dataUrl: rawDataUrl, byteSize: rawBytes, compressed: false };
  }

  throw new Error(
    "Ảnh vượt quá giới hạn 4 MB ngay cả sau khi nén nhẹ. Vui lòng chọn ảnh có dung lượng nhỏ hơn.",
  );
}
type Props = {
  lesson: Lesson;
  onChange: (lesson: Lesson) => void;
  onCommit: (lesson: Lesson, publish: boolean, review: Review) => string | null;
  onClose: () => void;
};
const newId = () => `content-${crypto.randomUUID()}`;
const blankReview = { source: false, accessibility: false };

function paragraphTextOf(section: Section): string {
  const blocks = blocksOf(section);
  const paragraphs = blocks.filter(
    (b): b is Extract<Block, { type: "paragraph" }> => b.type === "paragraph",
  );
  return paragraphs.map((b) => b.text).join("\n\n");
}

function syncStudyTextToBlocks(section: Section, studyText: string): Block[] {
  const existingBlocks = blocksOf(section);
  const existingParagraphs = existingBlocks.filter(
    (b): b is Extract<Block, { type: "paragraph" }> => b.type === "paragraph",
  );
  const preservedBlocks = existingBlocks.filter((b) => b.type !== "paragraph");

  if (!studyText && preservedBlocks.length > 0) {
    return preservedBlocks;
  }

  const parts = studyText.split("\n\n");
  const nextParagraphs: Block[] = parts.map((text, idx) => {
    const prev = existingParagraphs[idx];
    return prev
      ? { ...prev, text }
      : { id: newId(), type: "paragraph", text };
  });

  return [...nextParagraphs, ...preservedBlocks];
}

function splitTextInHalf(raw: string): [string, string] {
  const trimmed = raw.trim();
  if (!trimmed) return ["", ""];

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length >= 2) {
    const mid = Math.ceil(paragraphs.length / 2);
    return [
      paragraphs.slice(0, mid).join("\n\n"),
      paragraphs.slice(mid).join("\n\n"),
    ];
  }

  const lines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    const mid = Math.ceil(lines.length / 2);
    return [lines.slice(0, mid).join("\n"), lines.slice(mid).join("\n")];
  }

  const sentences = trimmed
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length >= 2) {
    const mid = Math.ceil(sentences.length / 2);
    return [sentences.slice(0, mid).join(" "), sentences.slice(mid).join(" ")];
  }

  return [trimmed, ""];
}

function makeParagraphBlocks(text: string): Block[] {
  const parts = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) {
    return [{ id: newId(), type: "paragraph", text: "" }];
  }
  return parts.map((part) => ({
    id: newId(),
    type: "paragraph",
    text: part,
  }));
}
export default function LessonEditor({
  lesson,
  onChange,
  onCommit,
  onClose,
}: Props) {
  const [draft, setDraft] = useState(() => materialize(lesson));
  const [preview, setPreview] = useState(false);
  const [pane, setPane] = useState("sections");
  const [activeSection, setActiveSection] = useState(
    lesson.sections[0]?.id ?? "",
  );
  const selectedSection = draft.sections.some((s) => s.id === activeSection)
    ? activeSection
    : draft.sections[0]?.id;

  const [review, setReview] = useState<Review>(blankReview);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTaskLabel, setAiTaskLabel] = useState("");
  const [aiMeta, setAiMeta] = useState<AiOutlineMeta | null>(null);
  const [pasteRawText, setPasteRawText] = useState("");
  const [compactOutlineView, setCompactOutlineView] = useState(false);
  const [imagePanelSectionId, setImagePanelSectionId] = useState<string | null>(
    null,
  );
  const [imageCaption, setImageCaption] = useState("");
  const [imageContext, setImageContext] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [imageFileSize, setImageFileSize] = useState(0);
  const [imageCompressed, setImageCompressed] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [semanticInsertResults, setSemanticInsertResults] = useState<
    Record<string, SemanticInsertFeedback>
  >({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const busy = loading || aiLoading;
  const errors = publicationIssues(draft);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) return;
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => setFileUrl(url), 0);
    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
  }, [file]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(next: Lesson) {
    setDraft(next);
    onChange(next);
    setDirty(true);
    setReview(blankReview);
    setMessage("");
    setError("");
  }
  function changeBlock(sectionId: string, block: Block) {
    change({
      ...draft,
      sections: draft.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              blocks: blocksOf(s).map((b) => (b.id === block.id ? block : b)),
            }
          : s,
      ),
    });
  }
  function addBlock(sectionId: string, type: Block["type"]) {
    const id = newId();
    const block: Block =
      type === "paragraph"
        ? { id, type, text: "" }
        : type === "list"
          ? { id, type, ordered: false, items: [""] }
          : type === "image"
            ? {
                id,
                type,
                src: "",
                alt: "",
                caption: "",
                complex: true,
                description: "",
              }
            : { id, type, caption: "", headers: ["", ""], rows: [["", ""]] };
    change({
      ...draft,
      sections: draft.sections.map((s) =>
        s.id === sectionId ? { ...s, blocks: [...blocksOf(s), block] } : s,
      ),
    });
    requestAnimationFrame(() => document.getElementById(`edit-${id}`)?.focus());
  }
  async function importFile() {
    if (!file) return;
    setError("");
    setWarnings([]);
    if (file.size > 10 * 1024 * 1024) {
      setError("Tệp phải nhỏ hơn hoặc bằng 10 MB.");
      return;
    }
    setLoading(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "json") {
        const imported = parseLesson(
          JSON.parse((await file.text()).replace(/^\uFEFF/, "")),
          draft.id,
        );
        if (abort.signal.aborted) return;
        change({
          ...draft,
          ...imported,
          id: draft.id,
          subject: draft.subject,
          grade: draft.grade,
          textbook: draft.textbook,
          chapter: draft.chapter,
          status: "draft",
        });
        setWarnings([
          "JSON thay nội dung bản đang biên tập. Bài đang công bố vẫn giữ nguyên; hãy kiểm tra trước khi lưu.",
        ]);
      } else if (extension === "txt") {
        const text = await file.text();
        if (abort.signal.aborted) return;
        if (!text.trim() || text.length > 150000)
          throw new Error(
            "Văn bản trống hoặc dài hơn 150.000 ký tự. Hãy nhập riêng từng bài.",
          );
        change(appendText(draft, [{ text }], file.name));
        setWarnings([
          "Đã thêm văn bản vào cuối bài. Hãy chia mục và bổ sung trang nguồn.",
        ]);
      } else if (extension === "pdf" || extension === "docx") {
        const response = await fetch("/api/import-document", {
          method: "POST",
          body: file,
          signal: abort.signal,
          headers: {
            "Content-Type": "application/octet-stream",
            "x-document-format": extension,
            "x-page-from": from,
            "x-page-to": to,
          },
        });
        const result = await response.json();
        if (abort.signal.aborted) return;
        if (!response.ok)
          throw new Error(result.error || "Không nhập được tài liệu.");
        change(appendText(draft, result.pages, file.name));
        setWarnings(result.warnings);
      } else throw new Error("Chọn tệp PDF, DOCX, TXT hoặc JSON.");
      setMessage("Đã nhập vào bản biên tập; chưa lưu hoặc công bố.");
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : "Không đọc được tài liệu.");
    } finally {
      if (!abort.signal.aborted) setLoading(false);
    }
  }
  function commit(publish: boolean) {
    const error = onCommit(materialize(draft), publish, review);
    if (error) {
      setError(error);
      return;
    }
    setDirty(false);
    setError("");
    setMessage(
      publish
        ? "Đã công bố bản mới trên trình duyệt này. Bản công bố trước được giữ để khôi phục."
        : "Đã lưu bản nháp. Học sinh vẫn đọc bản đang công bố.",
    );
    if (publish) setReview(blankReview);
  }
  function exportJson() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(materialize(draft), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function updateSectionInTable(sectionId: string, patch: Partial<Section>) {
    change(
      materialize({
        ...draft,
        sections: draft.sections.map((s) =>
          s.id === sectionId ? { ...s, ...patch } : s,
        ),
      }),
    );
  }
  function updateSectionStudyText(sectionId: string, studyText: string) {
    change(
      materialize({
        ...draft,
        sections: draft.sections.map((s) =>
          s.id === sectionId
            ? { ...s, blocks: syncStudyTextToBlocks(s, studyText) }
            : s,
        ),
      }),
    );
  }
  function handleRenumberCodes() {
    const renumbered = renumberSectionCodes(
      draft.textbook?.lessonNumber,
      draft.sections,
    );
    change(materialize({ ...draft, sections: renumbered }));
    setMessage(
      `Đã đánh lại mã mục tự động theo bài ${draft.textbook?.lessonNumber ?? 1} (${renumbered.length} mục).`,
    );
  }
  function splitSectionAt(index: number) {
    const target = draft.sections[index];
    if (!target) return;

    const [firstSource, secondSource] = splitTextInHalf(
      target.sourceText ?? "",
    );
    const [firstStudy, secondStudy] = splitTextInHalf(paragraphTextOf(target));
    const preservedBlocks = blocksOf(target).filter(
      (b) => b.type !== "paragraph",
    );

    const firstSection: Section = {
      ...target,
      sourceText: firstSource || undefined,
      blocks: [...makeParagraphBlocks(firstStudy), ...preservedBlocks],
    };
    const secondSection: Section = {
      id: newId(),
      heading: `${target.heading.trim() || "Mục mới"} (phần 2)`,
      sourceText: secondSource || undefined,
      body: secondStudy,
      blocks: makeParagraphBlocks(secondStudy),
      keywords: target.keywords ? [...target.keywords] : undefined,
    };

    const nextSections = [
      ...draft.sections.slice(0, index),
      firstSection,
      secondSection,
      ...draft.sections.slice(index + 1),
    ];
    const renumbered = renumberSectionCodes(
      draft.textbook?.lessonNumber,
      nextSections,
    );
    change(materialize({ ...draft, sections: renumbered }));
    setMessage(
      `Đã tách mục thành ${renumbered[index].code} và ${renumbered[index + 1].code}.`,
    );
  }
  function mergeSectionWithNext(index: number) {
    if (index < 0 || index >= draft.sections.length - 1) return;
    const current = draft.sections[index];
    const next = draft.sections[index + 1];

    const mergedHeading = [current.heading.trim(), next.heading.trim()]
      .filter(Boolean)
      .join(" — ");
    const mergedSource = [
      current.sourceText?.trim() ?? "",
      next.sourceText?.trim() ?? "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const mergedKeywords = Array.from(
      new Set([...(current.keywords ?? []), ...(next.keywords ?? [])]),
    );
    const mergedSection: Section = {
      ...current,
      heading: mergedHeading || current.heading,
      sourceText: mergedSource || undefined,
      blocks: [...blocksOf(current), ...blocksOf(next)],
      videoUrl: current.videoUrl?.trim() || next.videoUrl?.trim() || undefined,
      keywords: mergedKeywords.length ? mergedKeywords : undefined,
    };

    const nextSections = [
      ...draft.sections.slice(0, index),
      mergedSection,
      ...draft.sections.slice(index + 2),
    ];
    const renumbered = renumberSectionCodes(
      draft.textbook?.lessonNumber,
      nextSections,
    );
    const nextQuestions = draft.questions.map((q) =>
      q.sourceSectionId === next.id ? { ...q, sourceSectionId: current.id } : q,
    );
    if (activeSection === next.id) {
      setActiveSection(current.id);
    }
    change(
      materialize({
        ...draft,
        sections: renumbered,
        questions: nextQuestions,
      }),
    );
    setMessage(
      `Đã gộp 2 mục thành ${renumbered[index].code} và cập nhật lại liên kết câu hỏi.`,
    );
  }
  function addSectionInTable() {
    const id = newId();
    const nextSections = renumberSectionCodes(draft.textbook?.lessonNumber, [
      ...draft.sections,
      {
        id,
        heading: "Mục mới",
        sourceText: "",
        body: "",
        blocks: [{ id: newId(), type: "paragraph", text: "" }],
      },
    ]);
    change(materialize({ ...draft, sections: nextSections }));
    setMessage(
      `Đã thêm mục ${nextSections[nextSections.length - 1]?.code ?? nextSections.length} vào cuối bảng.`,
    );
  }
  async function splitOutlineWithAI(sourceMode: "file" | "draft" | "paste") {
    setError("");
    setWarnings([]);
    setAiTaskLabel("Đang tách bảng mục lục bằng AI…");
    setAiLoading(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      let rawText = "";
      if (sourceMode === "file") {
        if (!file) {
          throw new Error("Hãy chọn tệp Word (.docx), PDF hoặc TXT trước.");
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Tệp phải nhỏ hơn hoặc bằng 10 MB.");
        }
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension === "txt") {
          rawText = (await file.text()).trim();
        } else if (extension === "pdf" || extension === "docx") {
          const importRes = await fetch("/api/import-document", {
            method: "POST",
            body: file,
            signal: abort.signal,
            headers: {
              "Content-Type": "application/octet-stream",
              "x-document-format": extension,
              "x-page-from": from,
              "x-page-to": to,
            },
          });
          const importData = await importRes.json();
          if (abort.signal.aborted) return;
          if (!importRes.ok) {
            throw new Error(importData.error || "Không trích xuất được tài liệu.");
          }
          if (Array.isArray(importData.warnings)) {
            setWarnings(importData.warnings);
          }
          rawText = Array.isArray(importData.pages)
            ? importData.pages
                .map((p: { text?: string }) => p.text?.trim() ?? "")
                .filter(Boolean)
                .join("\n\n")
            : "";
        } else {
          throw new Error(
            "Chỉ hỗ trợ tách tự động từ tệp DOCX, PDF hoặc TXT.",
          );
        }
      } else if (sourceMode === "paste") {
        rawText = pasteRawText.trim();
      } else {
        rawText = draft.sections
          .map((s) => (s.sourceText?.trim() || s.body.trim()))
          .filter(Boolean)
          .join("\n\n");
      }

      if (!rawText) {
        throw new Error(
          "Chưa có văn bản để tách. Hãy nhập/dán văn bản SGK hoặc chọn tệp DOCX/PDF/TXT.",
        );
      }

      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "split_outline",
          rawText: rawText.slice(0, 150000),
          lessonNumber: draft.textbook?.lessonNumber,
          lessonTitle: draft.title,
        }),
      });
      const result = await response.json();
      if (abort.signal.aborted) return;
      if (!response.ok) {
        throw new Error(result.error || "Không tách được bảng mục lục.");
      }

      const items = Array.isArray(result.sections) ? result.sections : [];
      if (!items.length) {
        throw new Error("Không nhận được danh sách mục hợp lệ từ bộ xử lý.");
      }

      const mappedSections: Section[] = items.map(
        (item: {
          code?: string;
          heading?: string;
          sourceText?: string;
          studyText?: string;
          keywords?: string[];
        }) => {
          const studyText = (item.studyText ?? "").trim();
          return {
            id: newId(),
            code: item.code?.trim() || undefined,
            heading: (item.heading ?? "").trim() || "Mục mới",
            sourceText: (item.sourceText ?? "").trim() || undefined,
            body: studyText,
            blocks: makeParagraphBlocks(studyText),
            keywords: Array.isArray(item.keywords)
              ? item.keywords.filter((k): k is string => typeof k === "string")
              : undefined,
          };
        },
      );

      const nextSections = renumberSectionCodes(
        draft.textbook?.lessonNumber,
        mappedSections,
      );
      const validIds = new Set(nextSections.map((s) => s.id));
      const fallbackSectionId = nextSections[0]?.id ?? "";
      const nextQuestions = fallbackSectionId
        ? draft.questions.map((q) =>
            validIds.has(q.sourceSectionId)
              ? q
              : { ...q, sourceSectionId: fallbackSectionId },
          )
        : draft.questions;

      change(
        materialize({
          ...draft,
          sections: nextSections,
          questions: nextQuestions,
        }),
      );
      setActiveSection(fallbackSectionId);
      setPane("table");

      const provider: "openrouter" | "local-fallback" =
        result.provider === "openrouter" ? "openrouter" : "local-fallback";
      setAiMeta({
        provider,
        model: typeof result.model === "string" ? result.model : undefined,
        notice: typeof result.notice === "string" ? result.notice : undefined,
      });
      setMessage(
        provider === "openrouter"
          ? `Đã tách bảng mục lục bằng OpenRouter LLM (${result.model || "AI"}) — tạo ${nextSections.length} mục. Hãy kiểm duyệt trước khi lưu.`
          : result.notice ||
              `Đã tách bảng mục lục bằng Bộ xử lý cục bộ — tạo ${nextSections.length} mục. Hãy kiểm duyệt trước khi lưu.`,
      );
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(
          e instanceof Error ? e.message : "Không tách được bảng mục lục.",
        );
      }
    } finally {
      if (!abort.signal.aborted) {
        setAiLoading(false);
        setAiTaskLabel("");
      }
    }
  }
  async function generateStudyContentForSection(
    section: Section,
    displayCode: string,
  ) {
    const sourceText = (
      section.sourceText?.trim() || paragraphTextOf(section).trim()
    ).trim();
    if (!sourceText) {
      setError(
        `Mục ${displayCode} chưa có Nội dung gốc (SGK) hoặc Nội dung học để AI chế biến.`,
      );
      return;
    }

    setError("");
    setAiTaskLabel(`Đang chế biến Nội dung học cho mục ${displayCode}…`);
    setAiLoading(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const imageDescriptions = blocksOf(section)
        .filter((b): b is Extract<Block, { type: "image" }> => b.type === "image")
        .map((b) => [b.caption, b.alt, b.description].filter(Boolean).join(". "))
        .filter(Boolean);

      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_study_content",
          heading: section.heading.trim() || `Mục ${displayCode}`,
          sourceText: sourceText.slice(0, 50000),
          imageDescriptions,
          lessonTitle: draft.title,
        }),
      });
      const result = await response.json();
      if (abort.signal.aborted) return;
      if (!response.ok) {
        throw new Error(
          result.error || "Không chế biến được Nội dung học cho mục này.",
        );
      }

      const studyText =
        typeof result.studyText === "string" ? result.studyText.trim() : "";
      if (!studyText) {
        throw new Error("Bộ xử lý không trả về Nội dung học hợp lệ.");
      }

      const incomingKeywords = Array.isArray(result.keywords)
        ? result.keywords
            .filter((k: unknown): k is string => typeof k === "string")
            .map((k: string) => k.trim())
            .filter(Boolean)
        : [];
      const mergedKeywords = Array.from(
        new Set([...(section.keywords ?? []), ...incomingKeywords]),
      ).slice(0, 50);

      change(
        materialize({
          ...draft,
          sections: draft.sections.map((s) =>
            s.id === section.id
              ? {
                  ...s,
                  blocks: syncStudyTextToBlocks(s, studyText),
                  keywords: mergedKeywords.length ? mergedKeywords : s.keywords,
                }
              : s,
          ),
        }),
      );

      const provider: "openrouter" | "local-fallback" =
        result.provider === "openrouter" ? "openrouter" : "local-fallback";
      const providerLabel =
        provider === "openrouter"
          ? `OpenRouter LLM${typeof result.model === "string" ? ` (${result.model})` : ""}`
          : "Bộ xử lý cục bộ";
      setAiMeta({
        provider,
        model: typeof result.model === "string" ? result.model : undefined,
        notice: typeof result.notice === "string" ? result.notice : undefined,
      });
      setMessage(
        `Đã chế biến Nội dung học cho mục ${displayCode} bằng ${providerLabel}. Hãy kiểm duyệt trước khi lưu.`,
      );
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(
          e instanceof Error
            ? e.message
            : "Không chế biến được Nội dung học cho mục này.",
        );
      }
    } finally {
      if (!abort.signal.aborted) {
        setAiLoading(false);
        setAiTaskLabel("");
      }
    }
  }
  function clearSelectedImage() {
    setImageDataUrl("");
    setImageFileName("");
    setImageFileSize(0);
    setImageCompressed(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }
  async function handleSelectVisionImage(selectedFile: File | null) {
    if (!selectedFile) {
      clearSelectedImage();
      return;
    }
    setError("");
    setImageProcessing(true);
    try {
      const prepared = await prepareVisionImageDataUrl(selectedFile);
      setImageDataUrl(prepared.dataUrl);
      setImageFileName(selectedFile.name);
      setImageFileSize(prepared.byteSize);
      setImageCompressed(prepared.compressed);
    } catch (e) {
      clearSelectedImage();
      setError(
        e instanceof Error
          ? e.message
          : "Không thể xử lý tệp ảnh đã chọn. Vui lòng thử ảnh PNG, JPG hoặc WebP nhỏ hơn 4 MB.",
      );
    } finally {
      setImageProcessing(false);
    }
  }
  async function insertImageSemanticForSection(
    section: Section,
    displayCode: string,
  ) {
    const captionTrimmed = imageCaption.trim();
    if (!captionTrimmed && !imageDataUrl) {
      setError(
        "Hãy tải lên một tệp ảnh (PNG, JPG, WebP) hoặc nhập tiêu đề/chú thích bức ảnh trước khi chèn.",
      );
      return;
    }

    setError("");
    setAiTaskLabel(
      imageDataUrl
        ? `Đang phân tích hình ảnh bằng Vision AI và chèn mô tả cho mục ${displayCode}…`
        : `Đang phân tích ngữ nghĩa và chèn mô tả ảnh cho mục ${displayCode}…`,
    );
    setAiLoading(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "insert_image_semantic",
          heading: section.heading.trim() || `Mục ${displayCode}`,
          studyText: paragraphTextOf(section).trim() || undefined,
          sourceText: section.sourceText?.trim() || undefined,
          imageCaption: captionTrimmed || undefined,
          imageContext: imageContext.trim() || undefined,
          imageDataUrl: imageDataUrl || undefined,
        }),
      });
      const result = await response.json();
      if (abort.signal.aborted) return;
      if (!response.ok) {
        throw new Error(
          result.error || "Không chèn được mô tả ảnh theo ngữ nghĩa.",
        );
      }

      const insertedText =
        typeof result.insertedText === "string"
          ? result.insertedText.trim()
          : "";
      if (!insertedText) {
        throw new Error("Bộ xử lý không trả về Nội dung học sau khi chèn ảnh.");
      }

      change(
        materialize({
          ...draft,
          sections: draft.sections.map((s) =>
            s.id === section.id
              ? { ...s, blocks: syncStudyTextToBlocks(s, insertedText) }
              : s,
          ),
        }),
      );

      const provider: "openrouter" | "local-fallback" =
        result.provider === "openrouter" ? "openrouter" : "local-fallback";
      const usedVision = result.usedVision === true;
      const resultModel =
        typeof result.model === "string" ? result.model : undefined;
      const resultNotice =
        typeof result.notice === "string" && result.notice.trim()
          ? result.notice.trim()
          : undefined;
      const providerLabel =
        provider === "openrouter"
          ? usedVision
            ? `Vision AI · OpenRouter LLM${resultModel ? ` (${resultModel})` : ""}`
            : `OpenRouter LLM (chế độ văn bản${resultModel ? ` · ${resultModel}` : ""})`
          : "Bộ xử lý cục bộ";
      setAiMeta({
        provider,
        model: resultModel,
        notice: resultNotice,
      });
      setSemanticInsertResults((prev) => ({
        ...prev,
        [section.id]: {
          insertedAfterSentence:
            typeof result.insertedAfterSentence === "string"
              ? result.insertedAfterSentence
              : "",
          reason: typeof result.reason === "string" ? result.reason : "",
          provider,
          model: resultModel,
          usedVision,
          notice: resultNotice,
        },
      }));
      setImagePanelSectionId(null);
      setImageCaption("");
      setImageContext("");
      clearSelectedImage();
      setMessage(
        resultNotice
          ? `Mục ${displayCode}: ${resultNotice}`
          : `Đã chèn mô tả ảnh theo ngữ nghĩa vào mục ${displayCode} bằng ${providerLabel}. Xem vị trí câu neo và lý do ngay dưới ô Nội dung học.`,
      );
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(
          e instanceof Error
            ? e.message
            : "Không chèn được mô tả ảnh theo ngữ nghĩa.",
        );
      }
    } finally {
      if (!abort.signal.aborted) {
        setAiLoading(false);
        setAiTaskLabel("");
      }
    }
  }
  async function generateQuizForSection(
    section: Section,
    displayCode: string,
  ) {
    setError("");
    setAiTaskLabel(`Đang tạo câu hỏi trắc nghiệm cho mục ${displayCode}…`);
    setAiLoading(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_quiz",
          sectionId: section.id,
          heading: section.heading.trim() || `Mục ${displayCode}`,
          studyText: paragraphTextOf(section).trim() || undefined,
          sourceText: section.sourceText?.trim() || undefined,
          count: 2,
        }),
      });
      const result = await response.json();
      if (abort.signal.aborted) return;
      if (!response.ok) {
        throw new Error(
          result.error || "Không tạo được câu hỏi trắc nghiệm cho mục này.",
        );
      }

      const rawQuestions = Array.isArray(result.questions)
        ? result.questions
        : [];
      const newQuestions: Question[] = rawQuestions
        .filter(
          (q: unknown): q is Record<string, unknown> =>
            typeof q === "object" &&
            q !== null &&
            typeof (q as Record<string, unknown>).prompt === "string" &&
            Boolean(String((q as Record<string, unknown>).prompt).trim()) &&
            Array.isArray((q as Record<string, unknown>).options) &&
            ((q as Record<string, unknown>).options as unknown[]).length >= 2,
        )
        .map((q: Record<string, unknown>) => {
          const options = (q.options as unknown[])
            .map((o) => String(o ?? "").trim())
            .filter(Boolean);
          const safeOptions =
            options.length >= 2 ? options : ["Đáp án 1", "Đáp án 2"];
          const rawCorrect = Number(q.correctOptionId);
          const correctOptionId =
            Number.isInteger(rawCorrect) &&
            rawCorrect >= 0 &&
            rawCorrect < safeOptions.length
              ? rawCorrect
              : 0;
          return {
            id: newId(),
            prompt: String(q.prompt).trim(),
            options: safeOptions,
            correctOptionId,
            explanation:
              typeof q.explanation === "string" && q.explanation.trim()
                ? q.explanation.trim()
                : `Đáp án bám sát nội dung mục ${displayCode}.`,
            sourceSectionId: section.id,
          };
        });

      if (!newQuestions.length) {
        throw new Error("Bộ xử lý không trả về câu hỏi trắc nghiệm hợp lệ.");
      }

      change(
        materialize({
          ...draft,
          questions: [...draft.questions, ...newQuestions],
        }),
      );

      const provider: "openrouter" | "local-fallback" =
        result.provider === "openrouter" ? "openrouter" : "local-fallback";
      const providerLabel =
        provider === "openrouter"
          ? `OpenRouter LLM${typeof result.model === "string" ? ` (${result.model})` : ""}`
          : "Bộ xử lý cục bộ";
      setAiMeta({
        provider,
        model: typeof result.model === "string" ? result.model : undefined,
        notice: typeof result.notice === "string" ? result.notice : undefined,
      });
      setMessage(
        `Đã thêm ${newQuestions.length} câu hỏi trắc nghiệm gợi ý cho mục ${displayCode} vào tab Luyện tập (nguồn: ${providerLabel}).`,
      );
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(
          e instanceof Error
            ? e.message
            : "Không tạo được câu hỏi trắc nghiệm cho mục này.",
        );
      }
    } finally {
      if (!abort.signal.aborted) {
        setAiLoading(false);
        setAiTaskLabel("");
      }
    }
  }
  return (
    <section
      className={pane === "table" && !preview ? "authoring authoring-wide" : "authoring"}
      aria-label="Biên tập học liệu"
    >
      <div className="authoring-toolbar">
        <button
          type="button"
          className="inline-link"
          disabled={busy}
          onClick={() => {
            if (dirty) {
              const error = onCommit(materialize(draft), false, blankReview);
              if (error) {
                setError(error);
                return;
              }
            }
            onClose();
          }}
        >
          ← Danh sách bài {dirty ? "(lưu nháp trước khi về)" : ""}
        </button>
        <span role="status">
          {dirty ? "Có thay đổi chưa lưu" : "Bản biên tập"}
        </span>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => commit(false)}
        >
          Lưu bản nháp
        </button>
      </div>
      <h2 ref={titleRef} tabIndex={-1}>
        {draft.title}
      </h2>
      <p className="source-note">
        Lưu và công bố trong bản demo chỉ có hiệu lực trên trình duyệt này. Tải
        bản sao trong mục Nguồn & nhập tệp để lưu riêng trên máy.
      </p>
      <div className="authoring-tabs" aria-label="Chế độ biên tập">
        <button
          className="secondary"
          aria-pressed={!preview}
          disabled={busy}
          onClick={() => setPreview(false)}
        >
          1. Nhập và biên tập
        </button>
        <button
          className="secondary"
          aria-pressed={preview}
          disabled={busy}
          onClick={() => {
            setPreview(true);
            requestAnimationFrame(() => previewRef.current?.focus());
          }}
        >
          2. Xem trước và kiểm tra
        </button>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <p role="status">
        {aiLoading
          ? aiTaskLabel || "Đang xử lý bằng AI…"
          : loading
            ? "Đang trích xuất tài liệu…"
            : message}
      </p>
      <fieldset
        className="authoring-fields"
        disabled={busy}
        hidden={preview}
      >
        <legend className="sr-only">Nhập và biên tập</legend>
        <nav className="editor-panes" aria-label="Phần cần biên tập">
          {[
            ["sections", "Nội dung"],
            ["table", "Bảng mục lục & AI"],
            ["source", "Nguồn & nhập tệp"],
            ["questions", "Luyện tập"],
            ["media", "Video"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={pane === id}
              onClick={() => setPane(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div hidden={pane !== "table"}>
          <div className="outline-toolbar">
            <div className="outline-toolbar-actions">
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => splitOutlineWithAI("draft")}
              >
                Tự động tách thành Bảng mục lục (AI)
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy || !draft.sections.length}
                onClick={handleRenumberCodes}
              >
                Đánh lại mã mục tự động
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={addSectionInTable}
              >
                Thêm mục vào bảng
              </button>
              <button
                type="button"
                className="secondary outline-view-toggle"
                aria-pressed={compactOutlineView}
                aria-label="Chuyển đổi chế độ xem mục lục rút gọn hoặc thẻ so sánh 2 cột"
                onClick={() => setCompactOutlineView((v) => !v)}
              >
                {compactOutlineView
                  ? "Xem thẻ so sánh 2 cột"
                  : "Xem mục lục rút gọn"}
              </button>
            </div>
            {aiMeta && (
              <span
                className={`outline-ai-badge${aiMeta.provider === "openrouter" ? " is-openrouter" : ""}`}
                role="status"
              >
                {aiMeta.provider === "openrouter"
                  ? `Nguồn xử lý: OpenRouter LLM${aiMeta.model ? ` (${aiMeta.model})` : ""}`
                  : "Nguồn xử lý: Bộ xử lý cục bộ"}
              </span>
            )}
          </div>
          <p className="source-note">
            Mọi chỉnh sửa tại đây tự động đồng bộ với tab Nội dung. Có thể dùng
            phím Tab để di chuyển qua từng ô và Enter hoặc Space để kích hoạt nút
            thao tác.
          </p>
          <details className="outline-paste-panel">
            <summary>Dán văn bản SGK hoặc tài liệu mới để tách bằng AI</summary>
            <label>
              Văn bản gốc cần tách mục lục
              <textarea
                rows={5}
                value={pasteRawText}
                placeholder="Dán nội dung bài học từ SGK hoặc Word (ví dụ: I. Bối cảnh lịch sử... II. Mục tiêu...)"
                onChange={(e) => setPasteRawText(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="secondary"
              disabled={busy || !pasteRawText.trim()}
              onClick={() => splitOutlineWithAI("paste")}
            >
              Tách văn bản vừa dán thành bảng (AI)
            </button>
          </details>
          {compactOutlineView ? (
            <div className="outline-table-scroll">
              <table
                className="outline-compact-table"
                aria-label="Bảng mục lục rút gọn toàn bài"
              >
                <caption>
                  Bảng mục lục rút gọn ({draft.sections.length} mục) — rà soát
                  và sửa nhanh mã mục, tiêu đề toàn bài
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="col-code">
                      Mã mục
                    </th>
                    <th scope="col" className="col-heading-compact">
                      Tiêu đề mục
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!draft.sections.length ? (
                    <tr>
                      <td colSpan={2}>
                        Chưa có mục nào. Hãy bấm &ldquo;Thêm mục vào bảng&rdquo;
                        hoặc dán văn bản để tách tự động bằng AI.
                      </td>
                    </tr>
                  ) : (
                    draft.sections.map((section, index) => {
                      const displayCode =
                        section.code ??
                        `${draft.textbook?.lessonNumber ?? 1}.${index + 1}`;
                      const rowContext = `mục ${displayCode}${section.heading ? ` - ${section.heading}` : ""}`;

                      return (
                        <tr key={section.id}>
                          <td className="col-code">
                            <input
                              type="text"
                              value={displayCode}
                              aria-label={`Mã mục dòng ${index + 1}`}
                              onChange={(e) =>
                                updateSectionInTable(section.id, {
                                  code: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="col-heading-compact">
                            <div className="outline-compact-heading-cell">
                              <input
                                type="text"
                                value={section.heading}
                                placeholder="Nhập tiêu đề mục..."
                                aria-label={`Tiêu đề ${rowContext}`}
                                onChange={(e) =>
                                  updateSectionInTable(section.id, {
                                    heading: e.target.value,
                                  })
                                }
                              />
                              <button
                                type="button"
                                className="secondary outline-compact-open-btn"
                                aria-label={`Mở thẻ chi tiết cho ${rowContext}`}
                                onClick={() => {
                                  setCompactOutlineView(false);
                                  requestAnimationFrame(() =>
                                    document
                                      .getElementById(
                                        `outline-card-${section.id}`,
                                      )
                                      ?.focus(),
                                  );
                                }}
                              >
                                Mở thẻ chi tiết
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="outline-cards-list"
              aria-label={`Danh sách ${draft.sections.length} thẻ mục lục so sánh 2 cột`}
            >
              {!draft.sections.length ? (
                <div className="outline-empty-card">
                  Chưa có mục nào. Hãy bấm &ldquo;Thêm mục vào bảng&rdquo; hoặc
                  dán văn bản để tách tự động bằng AI.
                </div>
              ) : (
                draft.sections.map((section, index) => {
                  const displayCode =
                    section.code ??
                    `${draft.textbook?.lessonNumber ?? 1}.${index + 1}`;
                  const rowContext = `mục ${displayCode}${section.heading ? ` - ${section.heading}` : ""}`;
                  const nonParagraphCount = blocksOf(section).filter(
                    (b) => b.type !== "paragraph",
                  ).length;
                  const semanticInfo = semanticInsertResults[section.id];
                  const imagePanelOpen = imagePanelSectionId === section.id;

                  return (
                    <article
                      key={section.id}
                      id={`outline-card-${section.id}`}
                      tabIndex={-1}
                      className="outline-section-card"
                      aria-label={`Mục ${displayCode}: ${section.heading || "Chưa đặt tên"}`}
                    >
                      <header className="outline-card-header">
                        <div className="outline-card-identity">
                          <input
                            type="text"
                            className="outline-code-input"
                            value={displayCode}
                            aria-label={`Mã mục dòng ${index + 1}`}
                            onChange={(e) =>
                              updateSectionInTable(section.id, {
                                code: e.target.value,
                              })
                            }
                          />
                          <input
                            type="text"
                            className="outline-heading-input"
                            value={section.heading}
                            placeholder="Nhập tiêu đề mục..."
                            aria-label={`Tiêu đề ${rowContext}`}
                            onChange={(e) =>
                              updateSectionInTable(section.id, {
                                heading: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="outline-card-struct-actions">
                          <button
                            type="button"
                            className="secondary outline-struct-btn"
                            disabled={busy}
                            aria-label={`Tách làm 2 mục từ ${rowContext}`}
                            onClick={() => splitSectionAt(index)}
                          >
                            Tách làm 2 mục
                          </button>
                          <button
                            type="button"
                            className="secondary outline-struct-btn"
                            disabled={
                              busy || index >= draft.sections.length - 1
                            }
                            aria-label={`Gộp ${rowContext} xuống mục dưới`}
                            onClick={() => mergeSectionWithNext(index)}
                          >
                            Gộp xuống mục dưới
                          </button>
                        </div>
                      </header>

                      <div className="outline-card-split">
                        <div className="outline-split-col is-source">
                          <label
                            htmlFor={`outline-source-${section.id}`}
                            className="outline-split-label"
                          >
                            <span>Nội dung gốc (SGK)</span>
                            <span className="outline-split-hint">
                              Văn bản trích từ sách giáo khoa để đối chiếu &amp;
                              làm đầu vào AI
                            </span>
                          </label>
                          <textarea
                            id={`outline-source-${section.id}`}
                            rows={6}
                            value={section.sourceText ?? ""}
                            placeholder="Văn bản gốc từ SGK để đối chiếu..."
                            aria-label={`Nội dung gốc sách giáo khoa của ${rowContext}`}
                            onChange={(e) =>
                              updateSectionInTable(section.id, {
                                sourceText: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="outline-split-col is-study">
                          <label
                            htmlFor={`outline-study-${section.id}`}
                            className="outline-split-label"
                          >
                            <span>
                              Nội dung học (Đọc cho học sinh khiếm thị)
                            </span>
                            <span className="outline-split-hint">
                              Văn bản mạch lạc dùng cho trình đọc màn hình &amp;
                              giọng đọc TTS
                            </span>
                          </label>
                          <textarea
                            id={`outline-study-${section.id}`}
                            rows={6}
                            value={paragraphTextOf(section)}
                            placeholder="Nội dung học dễ nghe cho học sinh khiếm thị..."
                            aria-label={`Nội dung học của ${rowContext}`}
                            onChange={(e) =>
                              updateSectionStudyText(section.id, e.target.value)
                            }
                          />
                          {nonParagraphCount > 0 && (
                            <p className="outline-cell-note">
                              Giữ nguyên {nonParagraphCount} khối hình/bảng/danh
                              sách (sửa chi tiết tại tab Nội dung).
                            </p>
                          )}
                          {semanticInfo && (
                            <div
                              className="outline-semantic-note"
                              role="status"
                            >
                              <p className="outline-semantic-meta">
                                Đã chèn mô tả ảnh theo ngữ nghĩa (
                                {semanticInfo.provider === "openrouter"
                                  ? semanticInfo.usedVision
                                    ? `Vision AI · OpenRouter LLM${semanticInfo.model ? ` · ${semanticInfo.model}` : ""}`
                                    : `OpenRouter LLM · chế độ văn bản${semanticInfo.model ? ` · ${semanticInfo.model}` : ""}`
                                  : "Bộ xử lý cục bộ"}
                                )
                              </p>
                              {semanticInfo.notice && (
                                <p className="outline-semantic-notice">
                                  {semanticInfo.notice}
                                </p>
                              )}
                              {semanticInfo.insertedAfterSentence && (
                                <p>
                                  <strong>Sau câu neo:</strong>{" "}
                                  {semanticInfo.insertedAfterSentence}
                                </p>
                              )}
                              {semanticInfo.reason && (
                                <p>
                                  <strong>Lý do chọn vị trí:</strong>{" "}
                                  {semanticInfo.reason}
                                </p>
                              )}
                              <button
                                type="button"
                                className="inline-link outline-semantic-dismiss"
                                aria-label={`Ẩn ghi chú chèn mô tả ảnh của ${rowContext}`}
                                onClick={() =>
                                  setSemanticInsertResults((prev) => {
                                    const next = { ...prev };
                                    delete next[section.id];
                                    return next;
                                  })
                                }
                              >
                                Ẩn ghi chú
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <footer className="outline-card-footer">
                        <div className="outline-card-video">
                          <label htmlFor={`outline-video-${section.id}`}>
                            Link Video URL
                          </label>
                          <input
                            id={`outline-video-${section.id}`}
                            type="url"
                            value={section.videoUrl ?? ""}
                            placeholder="https://..."
                            aria-label={`Đường dẫn video của ${rowContext}`}
                            onChange={(e) =>
                              updateSectionInTable(section.id, {
                                videoUrl: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="outline-card-ai-bar">
                          <button
                            type="button"
                            className="secondary outline-ai-btn"
                            disabled={busy}
                            aria-label={`AI chế biến nội dung học cho ${rowContext}`}
                            onClick={() =>
                              generateStudyContentForSection(
                                section,
                                displayCode,
                              )
                            }
                          >
                            AI Chế biến Nội dung học
                          </button>
                          <button
                            type="button"
                            className="secondary outline-ai-btn"
                            disabled={busy}
                            aria-expanded={imagePanelOpen}
                            aria-controls={
                              imagePanelOpen
                                ? `image-panel-${section.id}`
                                : undefined
                            }
                            aria-label={`AI mô tả và chèn ảnh theo ngữ nghĩa cho ${rowContext}`}
                            onClick={() => {
                              if (imagePanelOpen) {
                                setImagePanelSectionId(null);
                                setImageCaption("");
                                setImageContext("");
                                clearSelectedImage();
                              } else {
                                setImagePanelSectionId(section.id);
                                setImageCaption("");
                                setImageContext("");
                                clearSelectedImage();
                              }
                            }}
                          >
                            AI Mô tả &amp; Chèn ảnh theo ngữ nghĩa
                          </button>
                          <button
                            type="button"
                            className="secondary outline-ai-btn"
                            disabled={busy}
                            aria-label={`AI tạo câu hỏi trắc nghiệm cho ${rowContext}`}
                            onClick={() =>
                              generateQuizForSection(section, displayCode)
                            }
                          >
                            AI Tạo câu hỏi Quiz
                          </button>
                        </div>
                      </footer>

                      {imagePanelOpen && (
                        <fieldset
                          id={`image-panel-${section.id}`}
                          className="outline-image-panel"
                        >
                          <legend>
                            Chèn mô tả ảnh theo ngữ nghĩa cho mục {displayCode}
                          </legend>
                          <div className="outline-image-upload">
                            <label htmlFor={`image-file-${section.id}`}>
                              Tải ảnh lịch sử từ máy (PNG, JPG, WebP · tối đa 4
                              MB)
                            </label>
                            <input
                              ref={imageInputRef}
                              id={`image-file-${section.id}`}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              disabled={busy || imageProcessing}
                              aria-label={`Chọn tệp ảnh lịch sử từ máy cho ${rowContext}`}
                              onChange={(e) => {
                                void handleSelectVisionImage(
                                  e.target.files?.[0] ?? null,
                                );
                              }}
                            />
                          </div>
                          {imageProcessing && (
                            <p className="outline-cell-note" role="status">
                              Đang kiểm tra và tối ưu dung lượng ảnh…
                            </p>
                          )}
                          {imageDataUrl && (
                            <div className="outline-image-preview">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageDataUrl}
                                alt={
                                  imageCaption.trim() ||
                                  `Xem trước ảnh đã chọn: ${imageFileName}`
                                }
                                className="outline-image-thumb"
                              />
                              <div className="outline-image-meta">
                                <strong>{imageFileName}</strong>
                                <span>
                                  {formatByteSize(imageFileSize)}
                                  {imageCompressed ? " (đã nén nhẹ)" : ""}
                                </span>
                                <small>
                                  Ảnh chỉ gửi lên Vision AI để sinh mô tả, không
                                  lưu tệp nặng vào trình duyệt.
                                </small>
                                <button
                                  type="button"
                                  className="inline-link danger-link"
                                  disabled={busy || imageProcessing}
                                  aria-label={`Xóa ảnh đã chọn (${imageFileName}) cho ${rowContext}`}
                                  onClick={clearSelectedImage}
                                >
                                  Xóa ảnh
                                </button>
                              </div>
                            </div>
                          )}
                          <label>
                            Tiêu đề / Chú thích ảnh (tùy chọn khi đã tải ảnh)
                            <input
                              type="text"
                              value={imageCaption}
                              placeholder="Ví dụ: Lễ xuất quân dưới bóng cây đa Tân Trào"
                              aria-label={`Tiêu đề hoặc chú thích ảnh cho ${rowContext}`}
                              onChange={(e) => setImageCaption(e.target.value)}
                            />
                          </label>
                          <label>
                            Bối cảnh / Chi tiết ảnh (tùy chọn)
                            <textarea
                              rows={2}
                              value={imageContext}
                              placeholder="Ví dụ: Đội hình chiến sĩ Giải phóng quân nghe đọc Quân lệnh số 1 chiều 16/8/1945"
                              aria-label={`Bối cảnh hoặc chi tiết ảnh cho ${rowContext}`}
                              onChange={(e) => setImageContext(e.target.value)}
                            />
                          </label>
                          <div className="outline-image-actions">
                            <button
                              type="button"
                              className="primary"
                              disabled={
                                busy ||
                                imageProcessing ||
                                (!imageCaption.trim() && !imageDataUrl)
                              }
                              aria-label={`Xác nhận chèn mô tả ảnh vào mạch bài cho ${rowContext}`}
                              onClick={() =>
                                insertImageSemanticForSection(
                                  section,
                                  displayCode,
                                )
                              }
                            >
                              Chèn mô tả ảnh vào mục {displayCode}
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              disabled={busy || imageProcessing}
                              aria-label={`Đóng khung chèn mô tả ảnh cho ${rowContext}`}
                              onClick={() => {
                                setImagePanelSectionId(null);
                                setImageCaption("");
                                setImageContext("");
                                clearSelectedImage();
                              }}
                            >
                              Đóng
                            </button>
                          </div>
                        </fieldset>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          )}
        </div>
        <div hidden={pane !== "source"}>
          <button type="button" className="secondary" onClick={exportJson}>
            Tải bản sao học liệu (JSON)
          </button>
          <details className="import-panel">
            <summary>Nhập từ tài liệu hoặc bản sao JSON</summary>
            <p>
              PDF/Word: trích xuất chữ trên máy chủ của ứng dụng, không gửi tới
              dịch vụ AI. TXT/PDF/Word thêm vào cuối bản nháp; JSON thay nội
              dung bản nháp. Tối đa 10 MB.
            </p>
            <label>
              Tài liệu nguồn
              <input
                type="file"
                accept=".pdf,.docx,.txt,.json"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setFileUrl("");
                  setError("");
                }}
              />
            </label>
            {file?.name.toLowerCase().endsWith(".pdf") && (
              <div className="source-fields">
                <label>
                  Từ trang tệp
                  <input
                    type="number"
                    min={1}
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label>
                  Đến trang tệp
                  <input
                    type="number"
                    min={1}
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
              </div>
            )}
            <div className="import-actions">
              <button
                type="button"
                className="secondary"
                disabled={!file || busy}
                onClick={importFile}
              >
                Nhập vào bản biên tập
              </button>
              <button
                type="button"
                className="primary"
                disabled={
                  busy ||
                  !file ||
                  file.name.toLowerCase().endsWith(".json")
                }
                aria-label="Tự động tách tệp tài liệu đã chọn thành Bảng mục lục bằng AI"
                onClick={() => splitOutlineWithAI("file")}
              >
                Tự động tách thành Bảng mục lục (AI)
              </button>
            </div>
            <p>
              PDF scan chưa hỗ trợ OCR. Hình, bảng và thứ tự đọc cần đối chiếu
              thủ công.
            </p>
            {!!warnings.length && (
              <ul>
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </details>
          {fileUrl && (
            <details className="source-document">
              <summary>Đối chiếu PDF nguồn đang chọn</summary>
              <p>
                Tệp chỉ được giữ trong phiên này. Lưu bản gốc riêng để đối chiếu
                về sau.
              </p>
              <a href={fileUrl} target="_blank" rel="noreferrer">
                Mở PDF nguồn ở thẻ mới
              </a>
              <iframe title="PDF nguồn để đối chiếu" src={fileUrl} />
            </details>
          )}
          <label>
            Tên bài
            <input
              value={draft.title}
              onChange={(e) => change({ ...draft, title: e.target.value })}
            />
          </label>
          <div className="source-fields">
            <label>
              Loại nội dung
              <select
                value={draft.provenance?.kind ?? "demo"}
                onChange={(e) =>
                  change({
                    ...draft,
                    provenance: {
                      title: "",
                      edition: "",
                      ...draft.provenance,
                      kind: e.target.value as
                        | "demo"
                        | "textbook"
                        | "adaptation",
                    },
                  })
                }
              >
                <option value="demo">Dữ liệu mẫu</option>
                <option value="textbook">Nội dung từ sách giáo khoa</option>
                <option value="adaptation">Diễn giải / học liệu bổ sung</option>
              </select>
            </label>
            <label>
              Phiên bản / năm xuất bản
              <input
                value={draft.provenance?.edition ?? ""}
                onChange={(e) =>
                  change({
                    ...draft,
                    provenance: {
                      kind: "demo",
                      title: "",
                      ...draft.provenance,
                      edition: e.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
          <label>
            Tên tài liệu nguồn
            <input
              value={draft.provenance?.title ?? ""}
              onChange={(e) =>
                change({
                  ...draft,
                  provenance: {
                    kind: "demo",
                    edition: "",
                    ...draft.provenance,
                    title: e.target.value,
                  },
                })
              }
            />
          </label>
          <label>
            Ghi chú nguồn và phạm vi sử dụng
            <textarea
              rows={2}
              value={draft.source}
              onChange={(e) => change({ ...draft, source: e.target.value })}
            />
          </label>
        </div>
        <div hidden={pane !== "sections"}>
          <label className="section-picker">
            Mục đang biên tập
            <select
              value={selectedSection ?? ""}
              onChange={(e) => setActiveSection(e.target.value)}
            >
              {!draft.sections.length && (
                <option value="">Chưa có mục — hãy thêm mục đầu tiên</option>
              )}
              {draft.sections.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {i + 1}. {s.heading || "Chưa đặt tên"}
                </option>
              ))}
            </select>
          </label>
          {draft.sections.map((section, sectionIndex) => (
            <fieldset
              className="section-editor"
              key={section.id}
              hidden={section.id !== selectedSection}
            >
              <legend>Mục {sectionIndex + 1}</legend>
              <label>
                Tiêu đề mục {sectionIndex + 1}
                <input
                  value={section.heading}
                  onChange={(e) =>
                    change({
                      ...draft,
                      sections: draft.sections.map((s) =>
                        s.id === section.id
                          ? { ...s, heading: e.target.value }
                          : s,
                      ),
                    })
                  }
                />
              </label>
              <div className="section-actions">
                <button
                  type="button"
                  className="inline-link"
                  disabled={sectionIndex === 0}
                  aria-label={`Đưa mục lên: ${section.heading}`}
                  onClick={() => {
                    const sections = [...draft.sections];
                    [sections[sectionIndex - 1], sections[sectionIndex]] = [
                      sections[sectionIndex],
                      sections[sectionIndex - 1],
                    ];
                    change({ ...draft, sections });
                  }}
                >
                  Đưa mục lên
                </button>
                <button
                  type="button"
                  className="inline-link danger-link"
                  aria-label={`Bỏ mục khỏi bản nháp: ${section.heading}`}
                  disabled={draft.questions.some(
                    (q) => q.sourceSectionId === section.id,
                  )}
                  onClick={() =>
                    change({
                      ...draft,
                      sections: draft.sections.filter(
                        (s) => s.id !== section.id,
                      ),
                    })
                  }
                >
                  Bỏ mục khỏi bản nháp
                </button>
              </div>
              {blocksOf(section).map((block, blockIndex) => (
                <fieldset className="block-editor" key={block.id}>
                  <legend id={`edit-${block.id}`} tabIndex={-1}>
                    Nội dung {blockIndex + 1} ·{" "}
                    {
                      {
                        paragraph: "Đoạn văn",
                        list: "Danh sách",
                        image: "Hình ảnh",
                        table: "Bảng",
                      }[block.type]
                    }
                  </legend>
                  {block.type === "paragraph" && (
                    <label>
                      Nội dung đoạn
                      <textarea
                        rows={5}
                        value={block.text}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            text: e.target.value,
                          })
                        }
                      />
                    </label>
                  )}
                  {block.type === "list" && (
                    <>
                      <label>
                        <input
                          type="checkbox"
                          checked={block.ordered}
                          onChange={(e) =>
                            changeBlock(section.id, {
                              ...block,
                              ordered: e.target.checked,
                            })
                          }
                        />{" "}
                        Danh sách đánh số
                      </label>
                      <label>
                        Mỗi ý một dòng
                        <textarea
                          rows={4}
                          value={block.items.join("\n")}
                          onChange={(e) =>
                            changeBlock(section.id, {
                              ...block,
                              items: e.target.value.split("\n"),
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                  {block.type === "image" && (
                    <>
                      <label>
                        Đường dẫn ảnh (HTTPS hoặc /đường-dẫn)
                        <input
                          value={block.src}
                          onChange={(e) =>
                            changeBlock(section.id, {
                              ...block,
                              src: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Mô tả ngắn cho người không thấy ảnh
                        <input
                          value={block.alt}
                          onChange={(e) =>
                            changeBlock(section.id, {
                              ...block,
                              alt: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Chú thích ảnh
                        <input
                          value={block.caption}
                          onChange={(e) =>
                            changeBlock(section.id, {
                              ...block,
                              caption: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={block.complex}
                          onChange={(e) =>
                            changeBlock(section.id, {
                              ...block,
                              complex: e.target.checked,
                            })
                          }
                        />{" "}
                        Bản đồ, biểu đồ hoặc hình phức tạp
                      </label>
                      <label>
                        Mô tả chi tiết thông tin trong hình
                        <textarea
                          rows={4}
                          value={block.description}
                          onChange={(e) =>
                            changeBlock(section.id, {
                              ...block,
                              description: e.target.value,
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                  {block.type === "table" && (
                    <>
                      <label>
                        Tên bảng
                        <input
                          value={block.caption}
                          onChange={(e) =>
                            changeBlock(section.id, {
                              ...block,
                              caption: e.target.value,
                            })
                          }
                        />
                      </label>
                      <TableEditor
                        block={block}
                        onChange={(next) => changeBlock(section.id, next)}
                      />
                    </>
                  )}
                  <label>
                    Trang in trong tài liệu nguồn
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={block.page ?? ""}
                      onChange={(e) =>
                        changeBlock(section.id, {
                          ...block,
                          page: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </label>
                  {block.filePage && (
                    <p className="source-note">
                      Trích từ trang tệp {block.filePage}; cần đối chiếu với
                      trang in trong sách.
                    </p>
                  )}
                  <div className="section-actions">
                    <button
                      type="button"
                      className="inline-link"
                      disabled={blockIndex === 0}
                      aria-label={`Đưa nội dung lên: nội dung ${blockIndex + 1}, ${section.heading}`}
                      onClick={() => {
                        const blocks = [...blocksOf(section)];
                        [blocks[blockIndex - 1], blocks[blockIndex]] = [
                          blocks[blockIndex],
                          blocks[blockIndex - 1],
                        ];
                        change({
                          ...draft,
                          sections: draft.sections.map((s) =>
                            s.id === section.id ? { ...s, blocks } : s,
                          ),
                        });
                      }}
                    >
                      Đưa nội dung lên
                    </button>
                    <button
                      type="button"
                      className="inline-link danger-link"
                      aria-label={`Bỏ nội dung khỏi bản nháp: nội dung ${blockIndex + 1}, ${section.heading}`}
                      onClick={() =>
                        change({
                          ...draft,
                          sections: draft.sections.map((s) =>
                            s.id === section.id
                              ? {
                                  ...s,
                                  blocks: blocksOf(s).filter(
                                    (b) => b.id !== block.id,
                                  ),
                                }
                              : s,
                          ),
                        })
                      }
                    >
                      Bỏ nội dung khỏi bản nháp
                    </button>
                  </div>
                </fieldset>
              ))}
              <div className="section-actions">
                {(["paragraph", "list", "image", "table"] as const).map(
                  (type) => (
                    <button
                      type="button"
                      className="secondary"
                      key={type}
                      onClick={() => addBlock(section.id, type)}
                    >
                      Thêm{" "}
                      {
                        {
                          paragraph: "đoạn",
                          list: "danh sách",
                          image: "hình",
                          table: "bảng",
                        }[type]
                      }
                    </button>
                  ),
                )}
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const id = newId();
              setActiveSection(id);
              change({
                ...draft,
                sections: [
                  ...draft.sections,
                  {
                    id,
                    heading: "Mục mới",
                    body: "",
                    blocks: [{ id: `${id}-p1`, type: "paragraph", text: "" }],
                  },
                ],
              });
            }}
          >
            Thêm mục
          </button>
        </div>
        <div className="media-editor" hidden={pane !== "media"}>
          <h3>Video và bản chép lời</h3>
          <label>
            Đường dẫn Video bài giảng (URL YouTube hoặc trang học tập bất kỳ)
            <input
              type="url"
              value={draft.videoUrl ?? ""}
              placeholder="https://www.youtube.com/watch?v=... hoặc https://.../bai-giang.mp4"
              onChange={(e) => {
                const rawUrl = e.target.value;
                const trimmedUrl = rawUrl.trim();
                const extractedId = extractYoutubeId(trimmedUrl);
                change({
                  ...draft,
                  videoUrl: rawUrl,
                  youtubeVideoId:
                    extractedId ?? (trimmedUrl ? "" : draft.youtubeVideoId),
                  youtubeSource:
                    extractedId || trimmedUrl || draft.youtubeVideoId
                      ? draft.youtubeSource
                      : undefined,
                });
              }}
            />
          </label>
          <p className="source-note">
            Dán đường dẫn YouTube đầy đủ sẽ tự tách mã 11 ký tự để nhúng phát an
            toàn. Liên kết tệp .mp4/.webm/.ogg phát trực tiếp bằng trình phát
            HTML5 (không tự phát); liên kết trang học tập ngoài hiển thị khung
            mở trang mới.
          </p>
          <label>
            Mã video YouTube (11 ký tự — tự động điền khi dán link YouTube)
            <input
              value={draft.youtubeVideoId ?? ""}
              placeholder="Ví dụ: dQw4w9WgXcQ hoặc dán link YouTube"
              onChange={(e) => {
                const raw = e.target.value.trim();
                const extracted = extractYoutubeId(raw);
                const videoId = extracted ?? raw;
                change({
                  ...draft,
                  youtubeVideoId: videoId,
                  youtubeSource:
                    videoId || draft.videoUrl?.trim()
                      ? draft.youtubeSource
                      : undefined,
                });
              }}
            />
          </label>
          <label>
            Nguồn video
            <input
              value={draft.youtubeSource ?? ""}
              onChange={(e) =>
                change({ ...draft, youtubeSource: e.target.value })
              }
            />
          </label>
          <label>
            Bản chép lời, gồm mô tả thông tin trực quan cần thiết
            <textarea
              rows={6}
              value={draft.transcript ?? ""}
              onChange={(e) => change({ ...draft, transcript: e.target.value })}
            />
          </label>
        </div>
        <div className="questions-editor" hidden={pane !== "questions"}>
          <h3>Câu hỏi luyện tập ({draft.questions.length})</h3>
          {draft.questions.map((q, i) => (
            <fieldset key={q.id}>
              <legend>Câu {i + 1}</legend>
              <label>
                Câu hỏi
                <textarea
                  value={q.prompt}
                  onChange={(e) =>
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id ? { ...x, prompt: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Các lựa chọn (mỗi dòng một lựa chọn)
                <textarea
                  value={q.options.join("\n")}
                  onChange={(e) => {
                    const options = e.target.value.split("\n");
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id
                          ? {
                              ...x,
                              options,
                              correctOptionId: Math.min(
                                x.correctOptionId,
                                Math.max(0, options.length - 1),
                              ),
                            }
                          : x,
                      ),
                    });
                  }}
                />
              </label>
              <label>
                Đáp án đúng
                <select
                  value={q.correctOptionId}
                  onChange={(e) =>
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id
                          ? { ...x, correctOptionId: Number(e.target.value) }
                          : x,
                      ),
                    })
                  }
                >
                  {q.options.map((o, j) => (
                    <option key={j} value={j}>
                      {j + 1}. {o}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Giải thích
                <textarea
                  value={q.explanation}
                  onChange={(e) =>
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id
                          ? { ...x, explanation: e.target.value }
                          : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Mục nguồn
                <select
                  value={q.sourceSectionId}
                  onChange={(e) =>
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id
                          ? { ...x, sourceSectionId: e.target.value }
                          : x,
                      ),
                    })
                  }
                >
                  {draft.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.heading}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="inline-link danger-link"
                aria-label={`Bỏ câu hỏi khỏi bản nháp: câu ${i + 1}`}
                onClick={() =>
                  change({
                    ...draft,
                    questions: draft.questions.filter((x) => x.id !== q.id),
                  })
                }
              >
                Bỏ câu hỏi khỏi bản nháp
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            className="secondary"
            disabled={!draft.sections.length}
            onClick={() =>
              change({
                ...draft,
                questions: [
                  ...draft.questions,
                  {
                    id: newId(),
                    prompt: "",
                    options: ["", ""],
                    correctOptionId: 0,
                    explanation: "",
                    sourceSectionId: draft.sections[0].id,
                  },
                ],
              })
            }
          >
            Thêm câu hỏi
          </button>
        </div>
      </fieldset>
      {preview && (
        <div
          ref={previewRef}
          tabIndex={-1}
          className="authoring-preview"
          aria-label="Xem trước học liệu"
        >
          <h3>Bản đọc trước khi công bố</h3>
          <p>{draft.source}</p>
          {draft.sections.map((section) => (
            <section className="reading-section" key={section.id}>
              <h4>{section.heading}</h4>
              <ContentBlocks section={section} prefix="preview-" />
            </section>
          ))}
          {draft.transcript && (
            <section>
              <h4>Bản chép lời video</h4>
              <p className="paragraph-text">{draft.transcript}</p>
            </section>
          )}
          <section
            aria-label="Kiểm tra trước công bố"
            className="publish-check"
          >
            <h3>Kiểm tra trước công bố</h3>
            {errors.length ? (
              <ul>
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            ) : (
              <p>
                Đã đủ các trường bắt buộc. Kiểm tra tự động không thay thế đối
                chiếu nội dung và thử với người học.
              </p>
            )}
            <label className="check-label">
              <input
                type="checkbox"
                checked={review.source}
                onChange={(e) =>
                  setReview({ ...review, source: e.target.checked })
                }
              />{" "}
              Tôi đã đối chiếu nội dung, câu hỏi và trang nguồn; giữ nhãn mẫu
              nếu dùng dữ liệu mẫu.
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={review.accessibility}
                onChange={(e) =>
                  setReview({ ...review, accessibility: e.target.checked })
                }
              />{" "}
              Tôi đã kiểm tra thứ tự đọc, mô tả hình, bảng và thao tác bằng bàn
              phím/trình đọc màn hình.
            </label>
            <button
              type="button"
              className="primary"
              disabled={
                busy ||
                !!errors.length ||
                !review.source ||
                !review.accessibility
              }
              onClick={() => commit(true)}
            >
              Công bố trong demo
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
