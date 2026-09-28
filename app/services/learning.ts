import type { Answer, Lesson } from "../data/lessons";
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}
export function searchLessons(lessons: Lesson[], query: string) {
  const term = normalize(query.trim());
  return lessons
    .filter((l) => l.status === "published")
    .filter(
      (l) =>
        !term ||
        normalize(
          l.title +
            " " +
            l.summary +
            " " +
            l.sections.map((s) => s.heading + " " + s.body).join(" "),
        ).includes(term),
    );
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
  ]);
  const tokens = [
    ...new Set(normalize(question).match(/[a-z0-9]+/g) ?? []),
  ].filter((t) => !stop.has(t) && t.length > 1);
  const ranked = lesson.sections
    .map((section) => ({
      section,
      score: tokens.filter((t) =>
        normalize(
          section.heading + " " + section.body + " " +
          lesson.questions
            .filter((question) => question.sourceSectionId === section.id)
            .map((question) => question.prompt)
            .join(" "),
        )
          .split(/\W+/)
          .includes(t),
      ).length,
    }))
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
    text: match.section.body,
    citations: [
      {
        lessonId: lesson.id,
        sectionId: match.section.id,
        excerpt: match.section.body,
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
