"use client";
import { sectionText } from "../services/content";
import type { RefObject } from "react";
import type { Lesson } from "../data/lessons";
import { normalize, searchLessons } from "../services/learning";
import { courseLessons, lessonLabel, type Course } from "./course-picker";

type Props = {
  lessons: Lesson[];
  course: Course;
  ready: boolean;
  query: string;
  onQuery: (value: string) => void;
  onOpen: (lesson: Lesson, sectionId?: string) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
};
export default function HomePage({
  lessons,
  course,
  ready,
  query,
  onQuery,
  onOpen,
  headingRef,
}: Props) {
  const available = courseLessons(lessons, course);
  const visible = searchLessons(available, query);
  const chapters = [...new Set(visible.map((l) => l.chapter))];
  return (
    <div className="repository-page">
      <header className="repository-heading">
        <p className="eyebrow">KHO HỌC LIỆU</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {course.subject} {course.grade}
        </h1>
        <p>Chọn bài học, sau đó chọn cách học phù hợp với bạn.</p>
      </header>
      <label className="lesson-search">
        Tìm trong môn học
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Tìm tên bài hoặc nội dung…"
        />
      </label>
      <div className="repository-list-heading">
        <h2>Mục lục bài học</h2>
        <span role="status">
          {ready ? `${visible.length} bài học` : "Đang tải…"}
        </span>
      </div>
      {ready &&
        chapters.map((chapter) => (
          <section className="chapter-group" key={chapter}>
            <h3>{chapter}</h3>
            <ol className="lesson-list">
              {visible
                .filter((l) => l.chapter === chapter)
                .map((l) => {
                  const matched = query.trim()
                    ? l.sections.find((s) =>
                        normalize(s.heading + " " + sectionText(s)).includes(
                          normalize(query.trim()),
                        ),
                      )
                    : undefined;
                  return (
                    <li key={l.id}>
                      <button
                        className="lesson-row"
                        onClick={() => onOpen(l, matched?.id)}
                      >
                        <span>
                          <strong>{lessonLabel(l)}</strong>
                          <small>
                            {matched
                              ? `Tìm thấy trong: ${matched.heading}`
                              : l.sections.length
                                ? l.provenance?.kind === "demo" || !l.provenance
                                  ? "Có bài đọc mẫu"
                                  : "Có bài đọc"
                                : "Chưa có bản đọc trong ứng dụng"}
                          </small>
                        </span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </li>
                  );
                })}
            </ol>
          </section>
        ))}
      {ready && !visible.length && (
        <div className="repository-empty" role="status">
          <h3>
            {available.length
              ? "Không tìm thấy bài học"
              : "Chưa có học liệu cho môn này"}
          </h3>
          <p>
            {available.length
              ? "Thử một từ khóa khác hoặc xóa nội dung tìm kiếm."
              : "Chọn môn Lịch sử để xem mục lục lớp 12, bộ Kết nối tri thức."}
          </p>
          {query && (
            <button className="inline-link" onClick={() => onQuery("")}>
              Xóa tìm kiếm
            </button>
          )}
        </div>
      )}
      <p className="repository-note">
        Mục lục theo sách Kết nối tri thức. Nguồn và loại nội dung được ghi
        trong từng bài; dữ liệu mẫu không phải nguyên văn sách giáo khoa.
      </p>
    </div>
  );
}
