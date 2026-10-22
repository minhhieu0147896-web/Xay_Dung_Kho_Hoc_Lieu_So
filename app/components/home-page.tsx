"use client";
import { sectionText } from "../services/content";
import type { RefObject } from "react";
import { ArrowRight, BookOpen, ListFilter, Video } from "lucide-react";
import type { Lesson, Progress } from "../data/lessons";
import {
  normalize,
  searchLessons,
  titleMatches,
  hasReading,
  hasVideo,
  contentLabel,
  lessonProgressSummary,
} from "../services/learning";
import { courseLessons, lessonLabel, type Course } from "./course-picker";

type Props = {
  lessons: Lesson[];
  course: Course;
  progress?: Record<string, Progress>;
  ready: boolean;
  query: string;
  onQuery: (value: string) => void;
  filter: "read" | "video" | "all";
  onFilter: (value: "read" | "video" | "all") => void;
  onOpen: (lesson: Lesson, sectionId?: string) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
};
export default function HomePage({
  lessons,
  course,
  progress = {},
  ready,
  query,
  onQuery,
  filter,
  onFilter,
  onOpen,
  headingRef,
}: Props) {
  const all = filter === "all";
  const available = courseLessons(lessons, course);
  const visible = searchLessons(available, query).filter(
    (l) => all || (filter === "video" ? hasVideo(l) : hasReading(l)),
  );
  const chapters =
    query.trim() || !all
      ? ["Kết quả tìm kiếm"]
      : [...new Set(visible.map((l) => l.chapter))];
  return (
    <div className="repository-page">
      <header className="repository-heading">
        <p className="eyebrow">KHO HỌC LIỆU</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {course.subject} {course.grade}
        </h1>
        <p>Chọn bài để đọc, nghe và luyện tập.</p>
      </header>
      <label className="lesson-search">
        Tìm trong môn học
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Số bài, tên bài hoặc nội dung…"
        />
      </label>
      <div className="catalog-filters" aria-label="Phạm vi học liệu">
        <button
          aria-pressed={filter === "read"}
          onClick={() => onFilter("read")}
        >
          <BookOpen size={16} aria-hidden="true" />
          Có bài đọc ({available.filter(hasReading).length})
        </button>
        <button
          aria-pressed={filter === "video"}
          onClick={() => onFilter("video")}
        >
          <Video size={16} aria-hidden="true" />
          Có video ({available.filter(hasVideo).length})
        </button>
        <button aria-pressed={all} onClick={() => onFilter("all")}>
          <ListFilter size={16} aria-hidden="true" />
          Toàn bộ mục lục ({available.length})
        </button>
      </div>
      <div className="repository-list-heading">
        <h2>
          {query.trim()
            ? "Kết quả tìm kiếm"
            : all
              ? "Mục lục trong sách"
              : filter === "video"
                ? "Bài học qua video"
                : "Bài có thể đọc ngay"}
        </h2>
        <span role="status">
          {ready ? `${visible.length} bài học` : "Đang tải…"}
        </span>
      </div>
      {ready &&
        chapters.map((chapter) => (
          <section className="chapter-group" key={chapter}>
            {!query.trim() && all && <h3>{chapter}</h3>}
            <ol className="lesson-list">
              {visible
                .filter((l) => !all || !!query.trim() || l.chapter === chapter)
                .map((l) => {
                  const matched =
                    query.trim() && !titleMatches(l, query)
                      ? l.sections.find((s) =>
                          normalize(s.heading + " " + sectionText(s)).includes(
                            normalize(query.trim()),
                          ),
                        )
                      : undefined;
                  const summary = lessonProgressSummary(l, progress[l.id]);
                  return (
                    <li key={l.id}>
                      <button
                        className="lesson-row"
                        onClick={() => onOpen(l, matched?.id)}
                      >
                        <span
                          className={`catalog-lesson-number ${summary.state === "completed" ? "done" : summary.state === "in_progress" ? "in-progress" : ""}`}
                          aria-hidden="true"
                        >
                          {summary.state === "completed"
                            ? "✓"
                            : String(l.textbook?.lessonNumber ?? "").padStart(
                                2,
                                "0",
                              )}
                        </span>
                        <span className="catalog-lesson-info">
                          <strong>{lessonLabel(l)}</strong>
                          <small>
                            {matched
                              ? `Tìm thấy trong: ${matched.heading}`
                              : contentLabel(l)}
                            {hasVideo(l) &&
                              hasReading(l) &&
                              " · Video tham khảo"}
                            {l.questions.length > 0 &&
                              ` · ${l.questions.length} câu luyện tập`}
                            {summary.label && ` · ${summary.label}`}
                          </small>
                        </span>
                        <ArrowRight size={18} aria-hidden="true" />
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
              ? "Thử từ khóa khác hoặc chọn Toàn bộ mục lục để tìm cả bài chưa có bản đọc."
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
