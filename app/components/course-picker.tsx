import type { Lesson } from "../data/lessons";

export type Course = { subject: string; grade: number; book: string };
export const defaultCourse: Course = {
  subject: "Lịch sử",
  grade: 12,
  book: "ket-noi-tri-thuc",
};
export const bookId = (lesson: Lesson) => lesson.textbook?.id ?? "demo";
export function courseLessons(lessons: Lesson[], course: Course) {
  return lessons
    .filter(
      (l) =>
        l.status === "published" &&
        l.subject === course.subject &&
        l.grade === course.grade &&
        bookId(l) === course.book,
    )
    .sort(
      (a, b) =>
        (a.textbook?.lessonNumber ?? 0) - (b.textbook?.lessonNumber ?? 0),
    );
}
export function lessonLabel(lesson: Lesson) {
  return lesson.textbook
    ? `Bài ${lesson.textbook.lessonNumber}. ${lesson.title}`
    : lesson.title;
}
export default function CoursePicker({
  lessons,
  value,
  onChange,
}: {
  lessons: Lesson[];
  value: Course;
  onChange: (value: Course) => void;
}) {
  const published = lessons.filter((l) => l.status === "published");
  const subjects = [
    ...new Set([
      "Lịch sử",
      "Toán",
      "Ngữ văn",
      "Tiếng Anh",
      "Vật lí",
      "Hóa học",
      "Sinh học",
      "Địa lí",
      ...published.map((l) => l.subject),
    ]),
  ];
  const books = [
    ...new Map([
      ["ket-noi-tri-thuc", "Kết nối tri thức với cuộc sống"],
      ...published
        .filter((l) => l.subject === value.subject && l.grade === value.grade)
        .map((l): [string, string] => [
          bookId(l),
          l.textbook?.title ?? "Học liệu mẫu",
        ]),
    ] as [string, string][]).entries(),
  ];
  return (
    <section
      className="course-picker"
      aria-label="Chọn môn, lớp và sách giáo khoa"
    >
      <label>
        Môn học
        <select
          value={value.subject}
          onChange={(e) => onChange({ ...value, subject: e.target.value })}
        >
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Lớp
        <select
          value={value.grade}
          onChange={(e) =>
            onChange({ ...value, grade: Number(e.target.value) })
          }
        >
          <option value={12}>Lớp 12</option>
        </select>
      </label>
      <label>
        Sách giáo khoa
        <select
          value={value.book}
          onChange={(e) => onChange({ ...value, book: e.target.value })}
        >
          {books.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
