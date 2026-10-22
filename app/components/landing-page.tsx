"use client";
import type { RefObject } from "react";
import {
  ArrowRight,
  BookOpen,
  Compass,
  LogIn,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { Lesson, Progress } from "../data/lessons";
import {
  hasReading,
  hasVideo,
  contentLabel,
  lessonProgressSummary,
} from "../services/learning";
import { lessonLabel } from "./course-picker";

type Props = {
  lessons: Lesson[];
  progress: Record<string, Progress>;
  signedIn: boolean;
  userName: string;
  userRole: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onExploreCatalog: () => void;
  onSelectSubject: (subject: string) => void;
  onOpenLesson: (lesson: Lesson, sectionId?: string) => void;
  onOpenLogin: () => void;
  onOpenProgress: () => void;
};

const SUBJECT_LIST = [
  "Lịch sử",
  "Địa lí",
  "Ngữ văn",
  "Toán",
  "Tiếng Anh",
  "Vật lí",
  "Hóa học",
  "Sinh học",
];

export default function LandingPage({
  lessons,
  progress,
  signedIn,
  userName,
  userRole,
  headingRef,
  onExploreCatalog,
  onSelectSubject,
  onOpenLesson,
  onOpenLogin,
  onOpenProgress,
}: Props) {
  const published = lessons.filter((l) => l.status === "published");
  const featuredLessons = published.filter(
    (l) => hasReading(l) || hasVideo(l),
  );
  const inProgressLessons = published.filter(
    (l) => progress[l.id] !== undefined,
  );
  const recentLesson = inProgressLessons[0];

  return (
    <div className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-body">
          <p className="eyebrow">
            <Sparkles size={14} aria-hidden="true" /> THƯ VIỆN HỌC TẬP SỐ THPT ·
            KẾT NỐI TRI THỨC VỚI CUỘC SỐNG
          </p>
          <h1 id="landing-title" ref={headingRef} tabIndex={-1}>
            Học tập theo sách giáo khoa, tra cứu nguồn và luyện tập
          </h1>
          <p className="landing-lead">
            Đọc nội dung có cấu trúc hoặc nghe giọng đọc thiết bị, xem video bài
            giảng tham khảo, hỏi đáp có trích dẫn tới đúng đoạn nguồn và làm bài
            trắc nghiệm. Giao diện ưu tiên bàn phím, trình đọc màn hình và bố
            cục rõ ràng.
          </p>
          <div className="landing-hero-actions">
            <button className="primary" onClick={onExploreCatalog}>
              <Compass size={18} aria-hidden="true" />
              Khám phá Kho học liệu
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            {recentLesson ? (
              <button
                className="secondary"
                onClick={() =>
                  onOpenLesson(
                    recentLesson,
                    progress[recentLesson.id]?.lastSectionId,
                  )
                }
              >
                <PlayCircle size={18} aria-hidden="true" />
                Tiếp tục: {lessonLabel(recentLesson)}
              </button>
            ) : !signedIn ? (
              <button className="secondary" onClick={onOpenLogin}>
                <LogIn size={18} aria-hidden="true" />
                Đăng nhập tài khoản demo
              </button>
            ) : (
              <button className="secondary" onClick={onOpenProgress}>
                <BookOpen size={18} aria-hidden="true" />
                Xem học liệu đang học
              </button>
            )}
          </div>
        </div>
        <aside className="landing-status-box" aria-label="Thông tin nhanh">
          <h2>Trạng thái phiên học</h2>
          <p>
            {signedIn
              ? `Đang dùng tài khoản mẫu: ${userName} (${userRole}).`
              : "Bạn đang xem ở chế độ khách. Đăng nhập demo để lưu tiến độ và thử các vai trò Học sinh, Giáo viên, Quản trị."}
          </p>
          <dl className="landing-metrics">
            <div>
              <dt>Môn học mở đầu</dt>
              <dd>Lịch sử 12 ({published.length} bài mục lục)</dd>
            </div>
            <div>
              <dt>Học liệu sẵn có</dt>
              <dd>
                {published.filter(hasReading).length} bài đọc mẫu ·{" "}
                {published.filter(hasVideo).length} bài có video
              </dd>
            </div>
            <div>
              <dt>Tiến độ của bạn</dt>
              <dd>
                {inProgressLessons.length > 0
                  ? `Đang học ${inProgressLessons.length} bài trên thiết bị này`
                  : "Chưa có bài đang học"}
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="landing-section" aria-labelledby="subjects-heading">
        <div className="landing-section-header">
          <div>
            <span className="eyebrow">DANH MỤC THEO MÔN</span>
            <h2 id="subjects-heading">Chọn môn học Lớp 12</h2>
          </div>
          <p>Bấm vào môn học để mở danh sách bài trong Kho học liệu.</p>
        </div>
        <div className="landing-subject-grid">
          {SUBJECT_LIST.map((subject) => {
            const subjectLessons = published.filter(
              (l) => l.subject === subject,
            );
            const readCount = subjectLessons.filter(hasReading).length;
            const videoCount = subjectLessons.filter(hasVideo).length;
            const hasContent = subjectLessons.length > 0;
            return (
              <button
                key={subject}
                type="button"
                className={`landing-subject-card ${hasContent ? "has-content" : ""}`}
                onClick={() => onSelectSubject(subject)}
              >
                <div className="landing-subject-top">
                  <strong>
                    <BookOpen size={16} aria-hidden="true" /> {subject}
                  </strong>
                  <span>Lớp 12</span>
                </div>
                <small>
                  {hasContent
                    ? `${subjectLessons.length} bài mục lục · ${readCount} bài đọc · ${videoCount} video`
                    : "Chưa nhập học liệu"}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="featured-heading">
        <div className="landing-section-header">
          <div>
            <span className="eyebrow">BẮT ĐẦU NGAY</span>
            <h2 id="featured-heading">Bài học sẵn sàng trải nghiệm</h2>
          </div>
          <button className="secondary" onClick={onExploreCatalog}>
            Xem toàn bộ 17 bài trong mục lục
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <ol className="lesson-list">
          {featuredLessons.map((l) => {
            const summary = lessonProgressSummary(l, progress[l.id]);
            return (
              <li key={l.id}>
                <button
                  className="lesson-row"
                  onClick={() =>
                    onOpenLesson(l, progress[l.id]?.lastSectionId)
                  }
                >
                  <span
                    className={`catalog-lesson-number ${summary.state === "completed" ? "done" : summary.state === "in_progress" ? "in-progress" : ""}`}
                    aria-hidden="true"
                  >
                    {summary.state === "completed"
                      ? "✓"
                      : String(l.textbook?.lessonNumber ?? "").padStart(2, "0")}
                  </span>
                  <span className="catalog-lesson-info">
                    <strong>
                      {l.subject} {l.grade} · {lessonLabel(l)}
                    </strong>
                    <small>
                      {contentLabel(l)}
                      {hasVideo(l) && hasReading(l) && " · Video tham khảo"}
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

      <section className="landing-section" aria-labelledby="steps-heading">
        <div className="landing-section-header">
          <div>
            <span className="eyebrow">CÁCH SỬ DỤNG</span>
            <h2 id="steps-heading">Ba bước học tập trên hệ thống</h2>
          </div>
        </div>
        <div className="landing-steps-grid">
          <div className="landing-step-card">
            <span className="landing-step-num" aria-hidden="true">
              1
            </span>
            <h3>Tìm bài theo sách giáo khoa</h3>
            <p>
              Chọn môn, lọc nhanh bài có bản đọc hoặc video, tìm chính xác theo
              số bài hoặc từ khóa nội dung.
            </p>
          </div>
          <div className="landing-step-card">
            <span className="landing-step-num" aria-hidden="true">
              2
            </span>
            <h3>Đọc, nghe & hỏi đáp có trích dẫn</h3>
            <p>
              Đọc từng mục hoặc bật giọng đọc thiết bị (TTS), xem video tham
              khảo và tra cứu câu trả lời mở đúng đoạn nguồn.
            </p>
          </div>
          <div className="landing-step-card">
            <span className="landing-step-num" aria-hidden="true">
              3
            </span>
            <h3>Luyện tập & lưu tiến độ</h3>
            <p>
              Đánh dấu các mục đã đọc, làm câu hỏi trắc nghiệm qua bảng điều
              hướng câu hỏi và xem giải thích chi tiết.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
