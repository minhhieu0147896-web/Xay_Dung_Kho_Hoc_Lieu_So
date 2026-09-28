"use client";
import { useState, type RefObject } from "react";
import type { Lesson } from "../data/lessons";
import { normalize, searchLessons } from "../services/learning";
type Props = {
  lessons: Lesson[];
  ready: boolean;
  query: string;
  onQuery: (value: string) => void;
  onOpen: (lesson: Lesson, sectionId?: string) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
};
export default function HomePage({
  lessons,
  ready,
  query,
  onQuery,
  onOpen,
  headingRef,
}: Props) {
  const [subject, setSubject] = useState("");
  const published = lessons.filter((l) => l.status === "published");
  const subjects = [...new Set(published.map((l) => l.subject))];
  const visible = searchLessons(lessons, query).filter(
    (l) => !subject || l.subject === subject,
  );
  return (
    <div className="repository-page">
      <header className="repository-heading">
        <h1 ref={headingRef} tabIndex={-1}>
          Kho học liệu
        </h1>
        <p>Tra cứu và đọc tài liệu theo môn học.</p>
      </header>
      <section aria-label="Tra cứu học liệu" className="repository-search">
        <label>
          Môn học
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Tất cả môn học</option>
            {subjects.map((s) => (
              <option value={s} key={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="repository-query">
          Tìm kiếm
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Nhập tên tài liệu hoặc nội dung cần tìm"
          />
        </label>
      </section>
      <div className="repository-list-heading">
        <h2>{subject || "Tất cả học liệu"}</h2>
        <span role="status">
          {ready ? visible.length + " tài liệu" : "Đang tải…"}
        </span>
      </div>
      {ready && (
        <div className="repository-list">
          {visible.map((l) => {
            const matched = query.trim()
              ? l.sections.find((s) =>
                  normalize(s.heading + " " + s.body).includes(
                    normalize(query.trim()),
                  ),
                )
              : undefined;
            return (
              <article className="repository-item" key={l.id}>
                <div className="document-mark" aria-hidden="true">
                  <svg
                    width="27"
                    height="32"
                    viewBox="0 0 27 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  >
                    <path d="M4 2h13l6 6v22H4zM17 2v7h6M8 15h11M8 20h11M8 25h7" />
                  </svg>
                </div>
                <div>
                  <p className="document-subject">
                    {l.subject} · Lớp {l.grade}
                  </p>
                  <h3>
                    <button onClick={() => onOpen(l, matched?.id)}>
                      {l.title}
                    </button>
                  </h3>
                  <p className="document-summary">{l.summary}</p>
                  <p className="document-details">
                    {l.sections.length} mục nội dung · {l.questions.length} câu
                    luyện tập
                  </p>
                  {matched && (
                    <p className="document-match">
                      Nội dung tìm thấy: {matched.heading}
                    </p>
                  )}
                </div>
                <span className="document-type">Bài đọc</span>
              </article>
            );
          })}
        </div>
      )}
      {ready && !visible.length && (
        <div className="repository-empty">
          <h3>Không có tài liệu phù hợp</h3>
          <p>Thử thay đổi môn học hoặc nội dung tìm kiếm.</p>
        </div>
      )}
      <p className="repository-note">
        Bản demo hiện có học liệu môn Lịch sử lớp 12. Các môn khác sẽ xuất hiện
        khi có tài liệu được công bố.
      </p>
    </div>
  );
}
