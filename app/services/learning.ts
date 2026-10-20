import { blocksOf, blockText, sectionText } from "./content.ts";
import type { Answer, Lesson, Progress } from "../data/lessons";
export function lessonProgressSummary(lesson: Lesson, progress?: Progress) {
  const totalSections = lesson.sections.length;
  const completedSections = lesson.sections.filter((s) =>
    progress?.completedSectionIds.includes(s.id),
  ).length;
  const totalQuestions = lesson.questions.length;
  const quizDone = totalQuestions > 0 && progress?.quizScore !== undefined;
  const totalSteps = totalSections + (totalQuestions > 0 ? 1 : 0);
  const completedSteps = completedSections + (quizDone ? 1 : 0);
  const percent =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const state: "completed" | "in_progress" | "not_started" =
    totalSteps > 0 && completedSteps === totalSteps
      ? "completed"
      : completedSteps > 0
        ? "in_progress"
        : "not_started";
  const parts: string[] = [];
  if (totalSections > 0 && (completedSections > 0 || quizDone))
    parts.push(`Đã đọc ${completedSections}/${totalSections} mục`);
  if (quizDone) parts.push(`Luyện tập ${progress?.quizScore}/${totalQuestions}`);
  return {
    totalSections,
    completedSections,
    totalQuestions,
    quizScore: progress?.quizScore,
    quizDone,
    percent,
    state,
    label:
      state === "completed"
        ? `Đã hoàn thành (${parts.join(" · ")})`
        : state === "in_progress"
          ? `Đang học: ${parts.join(" · ")}`
          : "",
  };
}
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}
export function titleMatches(lesson: Lesson, query: string) {
  const term = normalize(query.trim());
  const number = term.match(/^(?:bai\s*)?0*(\d+)$/);
  return number
    ? lesson.textbook?.lessonNumber === Number(number[1])
    : normalize(
        `Bài ${lesson.textbook?.lessonNumber ?? ""} ${lesson.title}`,
      ).includes(term);
}
export function hasReading(lesson: Lesson) {
  return lesson.sections.some((s) => sectionText(s).trim().length > 0);
}
export function hasVideo(lesson: Lesson) {
  return /^[a-zA-Z0-9_-]{11}$/.test(lesson.youtubeVideoId ?? "");
}
export function contentLabel(lesson: Lesson) {
  if (hasReading(lesson))
    return lesson.provenance?.kind === "demo" || !lesson.provenance
      ? "Bài đọc mẫu"
      : "Có bài đọc";
  return hasVideo(lesson) ? "Chỉ có video tham khảo" : "Chưa nhập nội dung";
}
export function searchLessons(lessons: Lesson[], query: string) {
  const term = normalize(query.trim());
  const numberOnly = /^(?:bai\s*)?\d+$/.test(term);
  return lessons
    .filter((l) => l.status === "published")
    .map((lesson, index) => ({
      lesson,
      index,
      score:
        !term || titleMatches(lesson, query)
          ? 3
          : numberOnly
            ? 0
            : normalize(lesson.chapter).includes(term)
              ? 2
              : normalize(
                    lesson.summary +
                      " " +
                      lesson.sections
                        .map((s) => s.heading + " " + sectionText(s))
                        .join(" "),
                  ).includes(term)
                ? 1
                : 0,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.lesson);
}
export function askLesson(lesson: Lesson, question: string): Answer {
  const stop = new Set([
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
  ]);
  const tokens = [
    ...new Set(normalize(question).match(/[a-z0-9]+/g) ?? []),
  ].filter((t) => !stop.has(t) && t.length > 1);
  const ranked = lesson.sections
    .flatMap((section) =>
      blocksOf(section).map((block) => ({
        section,
        block,
        score: tokens.filter((token) =>
          normalize(
            section.heading +
              " " +
              blockText(block) +
              " " +
              lesson.questions
                .filter((q) => q.sourceSectionId === section.id)
                .map((q) => q.prompt)
                .join(" "),
          )
            .split(/\W+/)
            .includes(token),
        ).length,
      })),
    )
    .sort((a, b) => b.score - a.score);
  const match = ranked[0];
  if (
    !tokens.length ||
    !match ||
    match.score < Math.max(2, Math.ceil(tokens.length * 0.65))
  )
    return {
      text: "Chưa đủ thông tin trong bài học để trả lời câu hỏi này. Bạn có thể xem mục lục hoặc hỏi về một nội dung cụ thể của bài.",
      citations: [],
      mode: "retrieval",
      status: "insufficient_evidence",
    };
  return {
    text: blockText(match.block),
    citations: [
      {
        lessonId: lesson.id,
        sectionId: match.section.id,
        blockId: match.block.id,
        page: match.block.page,
        excerpt: blockText(match.block),
      },
    ],
    mode: "retrieval",
    status: "ok",
  };
}
export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
