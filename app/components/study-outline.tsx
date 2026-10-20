"use client";
import type { Lesson, Progress } from "../data/content";
import {
  contentLabel,
  hasVideo,
  lessonProgressSummary,
} from "../services/learning";
import { lessonLabel } from "./course-picker";

export default function StudyOutline({
  lessons,
  lesson,
  progress,
  allProgress = {},
  percent,
  onOpen,
  onJump,
}: {
  lessons: Lesson[];
  lesson: Lesson;
  progress?: Progress;
  allProgress?: Record<string, Progress>;
  percent: number;
  onOpen: (lesson: Lesson) => void;
  onJump: (id: string) => void;
}) {
  const currentSummary = lessonProgressSummary(lesson, progress);
  return (
    <aside className="study-outline" aria-label="Mục lục và tiến độ học">
      <header className="study-outline-heading">
        <p className="eyebrow">
          {lesson.subject} {lesson.grade}
        </p>
        <h2 id="book-navigation" tabIndex={-1}>
          Nội dung môn học
        </h2>
        <p>
          {lessons.length} bài theo sách · {lesson.textbook?.title}
        </p>
      </header>
      <section className="study-current" aria-labelledby="current-lesson-title">
        <div className="study-progress-label">
          <h3 id="current-lesson-title">
            Bài {lesson.textbook?.lessonNumber} đang học
          </h3>
          <span>{percent}%</span>
        </div>
        <progress
          value={percent}
          max={100}
          aria-label="Tiến độ đọc và luyện tập của bài hiện tại"
        />
        <p className="study-progress-help">
          {currentSummary.totalSections > 0
            ? `Đã đọc ${currentSummary.completedSections}/${currentSummary.totalSections} mục`
            : "Chưa có mục đọc"}
          {currentSummary.totalQuestions > 0 &&
            (currentSummary.quizDone
              ? ` · Luyện tập ${currentSummary.quizScore}/${currentSummary.totalQuestions} câu đúng`
              : ` · Chưa làm luyện tập (${currentSummary.totalQuestions} câu)`)}
        </p>
        {lesson.sections.length > 0 && (
          <nav aria-label="Các mục trong bài đang học">
            {lesson.sections.map((section, i) => {
              const done = progress?.completedSectionIds.includes(section.id);
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onJump(section.id);
                  }}
                >
                  <span
                    className={done ? "section-step done" : "section-step"}
                    aria-hidden="true"
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span>
                    {section.heading}
                    {done && <small>Đã đọc</small>}
                  </span>
                </a>
              );
            })}
          </nav>
        )}
      </section>
      <nav className="study-syllabus" aria-label="Các bài trong sách">
        {[...new Set(lessons.map((l) => l.chapter))].map((chapter) => (
          <details
            key={`${lesson.id}-${chapter}`}
            open={chapter === lesson.chapter}
          >
            <summary>{chapter}</summary>
            {lessons
              .filter((l) => l.chapter === chapter)
              .map((l) => {
                const itemSummary = lessonProgressSummary(
                  l,
                  l.id === lesson.id ? progress : allProgress[l.id],
                );
                return (
                  <button
                    key={l.id}
                    className="study-lesson"
                    aria-label={`${lessonLabel(l)}. ${l.id === lesson.id ? "Đang học. " : ""}${contentLabel(l)}${hasVideo(l) && l.sections.length > 0 ? ". Có video" : ""}${itemSummary.label ? `. ${itemSummary.label}` : ""}`}
                    aria-current={l.id === lesson.id ? "page" : undefined}
                    onClick={() => {
                      if (l.id !== lesson.id) onOpen(l);
                    }}
                  >
                    <span
                      className={`study-lesson-number ${itemSummary.state === "completed" ? "done" : itemSummary.state === "in_progress" ? "in-progress" : ""}`}
                      aria-hidden="true"
                    >
                      {itemSummary.state === "completed"
                        ? "✓"
                        : String(l.textbook?.lessonNumber ?? "").padStart(
                            2,
                            "0",
                          )}
                    </span>
                    <span>
                      <strong>{l.title}</strong>
                      <small>
                        {l.id === lesson.id ? "Đang học · " : ""}
                        {contentLabel(l)}
                        {hasVideo(l) && l.sections.length > 0 ? " · Video" : ""}
                        {itemSummary.label ? ` · ${itemSummary.label}` : ""}
                      </small>
                    </span>
                  </button>
                );
              })}
          </details>
        ))}
      </nav>
    </aside>
  );
}
