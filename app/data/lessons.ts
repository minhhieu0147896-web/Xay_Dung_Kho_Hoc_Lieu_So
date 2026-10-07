import type { Lesson } from "./content";
export type { Lesson, Section, Question, Progress, Answer } from "./content";
import book from "../../content/lich-su/lop-12/ket-noi-tri-thuc/sach.json" with { type: "json" };
import lesson6 from "../../content/lich-su/lop-12/ket-noi-tri-thuc/bai-06.json" with { type: "json" };
import lesson10 from "../../content/lich-su/lop-12/ket-noi-tri-thuc/bai-10.json" with { type: "json" };
export const sampleLessons = [lesson6, lesson10] as Lesson[];
export const initialLessons: Lesson[] = (book as Lesson[]).map((entry) => {
  const sample = sampleLessons.find((s) => s.id === entry.id);
  return sample
    ? {
        ...entry,
        ...sample,
        // Keep the textbook catalog's official placement and lesson title.
        title: entry.title,
        chapter: entry.chapter,
        textbook: entry.textbook,
      }
    : entry;
});
// Preserve edited text, publication state and progress IDs during migration.
export function mergeStoredLessons(stored: Lesson[]): Lesson[] {
  const merged = initialLessons.map((base) => {
    const saved = stored.find((l) => l.id === base.id);
    return saved
      ? {
          ...base,
          ...saved,
          title:
            !saved.textbook &&
            saved.title ===
              sampleLessons.find((sample) => sample.id === base.id)?.title
              ? base.title
              : saved.title,
          subject: saved.subject ?? base.subject,
          grade: saved.grade ?? base.grade,
          chapter: saved.textbook ? saved.chapter : base.chapter,
          textbook: saved.textbook ?? base.textbook,
        }
      : base;
  });
  return [
    ...merged,
    ...stored.filter((l) => !initialLessons.some((base) => base.id === l.id)),
  ];
}
