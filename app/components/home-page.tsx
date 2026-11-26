"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ArrowRight,
  BookOpen,
  ListFilter,
  Mic,
  MicOff,
  Video,
} from "lucide-react";
import type { Lesson, Progress } from "../data/lessons";
import {
  semanticSearchLessons,
  findBestMatchingSection,
  hasReading,
  hasVideo,
  contentLabel,
  lessonProgressSummary,
} from "../services/learning";
import { courseLessons, lessonLabel, type Course } from "./course-picker";

type SpeechRecognitionResultEvent = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionErrorEvent = {
  error?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export type OpenLessonOptions = {
  announcement?: string;
  speakAnnouncement?: boolean;
};

type Props = {
  lessons: Lesson[];
  course: Course;
  progress?: Record<string, Progress>;
  ready: boolean;
  query: string;
  onQuery: (value: string) => void;
  filter: "read" | "video" | "all";
  onFilter: (value: "read" | "video" | "all") => void;
  onOpen: (
    lesson: Lesson,
    sectionId?: string,
    options?: OpenLessonOptions,
  ) => void;
  voiceAutoOpen?: boolean;
  onVoiceAutoOpenChange?: (enabled: boolean) => void;
  onVoiceStart?: () => void;
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
  voiceAutoOpen = true,
  onVoiceAutoOpenChange,
  onVoiceStart,
  headingRef,
}: Props) {
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const available = courseLessons(lessons, course);
  const voiceAutoOpenRef = useRef(voiceAutoOpen);
  const availableRef = useRef(available);
  const filterRef = useRef(filter);
  const onOpenRef = useRef(onOpen);
  const onFilterRef = useRef(onFilter);

  useEffect(() => {
    voiceAutoOpenRef.current = voiceAutoOpen;
  }, [voiceAutoOpen]);
  useEffect(() => {
    availableRef.current = available;
  }, [available]);
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);
  useEffect(() => {
    onFilterRef.current = onFilter;
  }, [onFilter]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* Ignore stop errors on unmount. */
      }
    };
  }, []);

  function toggleVoiceSearch() {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* Ignore stop errors. */
      }
      setListening(false);
      setVoiceStatus("Đã dừng tìm kiếm bằng giọng nói.");
      return;
    }

    const win = window as WindowWithSpeech;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceStatus(
        "Trình duyệt hiện tại chưa hỗ trợ tìm kiếm bằng giọng nói. Bạn có thể nhập từ khóa trực tiếp vào ô tìm kiếm.",
      );
      return;
    }

    onVoiceStart?.();

    try {
      const recognition = new SpeechRec();
      recognition.lang = "vi-VN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setListening(true);
        setVoiceStatus(
          "Đang lắng nghe giọng nói tiếng Việt… Hãy đọc tên bài hoặc câu hỏi lịch sử.",
        );
      };
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
        if (!transcript) {
          setVoiceStatus("Chưa nhận diện được nội dung. Vui lòng thử nói lại.");
          return;
        }
        onQuery(transcript);
        if (voiceAutoOpenRef.current) {
          const currentAvailable = availableRef.current;
          const currentFilter = filterRef.current;
          const allMatches = semanticSearchLessons(
            currentAvailable,
            transcript,
          );
          const filteredMatches = allMatches.filter(
            (l) =>
              currentFilter === "all" ||
              (currentFilter === "video" ? hasVideo(l) : hasReading(l)),
          );
          const bestLesson = filteredMatches[0] ?? allMatches[0];
          if (bestLesson) {
            if (!filteredMatches[0] && currentFilter !== "all") {
              onFilterRef.current("all");
            }
            const matchedSection = findBestMatchingSection(
              bestLesson,
              transcript,
            );
            const targetLabel = matchedSection
              ? matchedSection.code
                ? `Mục ${matchedSection.code}, ${matchedSection.heading}`
                : matchedSection.heading
              : "";
            const spokenAnnouncement = targetLabel
              ? `Đang mở ${lessonLabel(bestLesson)}, ${targetLabel}.`
              : `Đang mở ${lessonLabel(bestLesson)}.`;
            setVoiceStatus(
              `Đã nhận giọng nói: “${transcript}”. ${spokenAnnouncement}`,
            );
            onOpenRef.current(bestLesson, matchedSection?.id, {
              announcement: spokenAnnouncement,
              speakAnnouncement: true,
            });
            return;
          }
          setVoiceStatus(
            `Đã nhận giọng nói: “${transcript}”, nhưng chưa tìm thấy bài học phù hợp. Bạn có thể thử nói từ khóa khác.`,
          );
          return;
        }
        setVoiceStatus(`Đã nhận giọng nói: “${transcript}”.`);
      };
      recognition.onerror = (event) => {
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          setVoiceStatus(
            "Trình duyệt chưa được cấp quyền micro. Vui lòng cho phép micro hoặc nhập từ khóa trực tiếp.",
          );
        } else if (event.error === "no-speech") {
          setVoiceStatus(
            "Chưa nghe rõ giọng nói. Bạn có thể bấm lại và nói gần micro.",
          );
        } else {
          setVoiceStatus(
            "Không thể thu âm lúc này. Bạn vẫn có thể nhập từ khóa vào ô tìm kiếm.",
          );
        }
        setListening(false);
      };
      recognition.onend = () => {
        setListening(false);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setListening(false);
      setVoiceStatus(
        "Không khởi động được chức năng tìm kiếm bằng giọng nói trên thiết bị này.",
      );
    }
  }

  const all = filter === "all";
  const visible = semanticSearchLessons(available, query).filter(
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
      <div className="lesson-search-wrap">
        <label className="lesson-search" htmlFor="catalog-search-input">
          Tìm trong môn học (từ khóa hoặc câu hỏi tự nhiên)
        </label>
        <div className="search-row">
          <input
            id="catalog-search-input"
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Số bài, tên bài hoặc câu hỏi (VD: cây đa Tân Trào, Liên hợp quốc)…"
          />
          <button
            type="button"
            className="secondary voice-search-btn"
            aria-pressed={listening}
            aria-label={
              listening
                ? "Dừng tìm kiếm bằng giọng nói"
                : "Tìm bằng giọng nói tiếng Việt"
            }
            onClick={toggleVoiceSearch}
          >
            {listening ? (
              <MicOff size={18} aria-hidden="true" />
            ) : (
              <Mic size={18} aria-hidden="true" />
            )}
            {listening ? "Đang nghe…" : "Tìm bằng giọng nói"}
          </button>
        </div>
        <label
          className="voice-auto-open-toggle"
          htmlFor="voice-auto-open-checkbox"
        >
          <input
            id="voice-auto-open-checkbox"
            type="checkbox"
            checked={voiceAutoOpen}
            onChange={(e) => onVoiceAutoOpenChange?.(e.target.checked)}
          />
          <span>Tự động mở bài khớp nhất khi tìm bằng giọng nói</span>
        </label>
        <p
          className={voiceStatus ? "voice-search-status" : "sr-only"}
          role="status"
          aria-live="polite"
        >
          {voiceStatus}
        </p>
      </div>
      <div className="catalog-filters" aria-label="Phạm vi học liệu">
        <button
          className="filter-btn filter-read"
          aria-pressed={filter === "read"}
          onClick={() => onFilter("read")}
        >
          <BookOpen size={16} aria-hidden="true" />
          Có bài đọc ({available.filter(hasReading).length})
        </button>
        <button
          className="filter-btn filter-video"
          aria-pressed={filter === "video"}
          onClick={() => onFilter("video")}
        >
          <Video size={16} aria-hidden="true" />
          Có video ({available.filter(hasVideo).length})
        </button>
        <button
          className="filter-btn filter-all"
          aria-pressed={all}
          onClick={() => onFilter("all")}
        >
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
                  const matched = query.trim()
                    ? findBestMatchingSection(l, query)
                    : undefined;
                  const summary = lessonProgressSummary(l, progress[l.id]);
                  const matchedLabel = matched
                    ? matched.code
                      ? `Khớp ngữ nghĩa: Mục ${matched.code} · ${matched.heading}`
                      : `Khớp ngữ nghĩa: ${matched.heading}`
                    : "";
                  const metaParts = [
                    contentLabel(l),
                    hasVideo(l) && hasReading(l) ? "Video tham khảo" : null,
                    l.questions.length > 0
                      ? `${l.questions.length} câu luyện tập`
                      : null,
                  ].filter(Boolean);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        className="lesson-row"
                        aria-label={
                          matched
                            ? `Mở ${lessonLabel(l)}, đi tới ${matched.code ? `Mục ${matched.code} ` : ""}${matched.heading}`
                            : `Mở ${lessonLabel(l)}`
                        }
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
                          <small className="lesson-meta-wrap">
                            <span className="lesson-meta-line">
                              {metaParts.join(" · ")}
                            </span>
                            {matchedLabel && (
                              <span className="meta-badge meta-badge-match">
                                {matchedLabel}
                              </span>
                            )}
                            {summary.label && (
                              <span
                                className={`meta-badge ${summary.state === "completed" ? "meta-badge-done" : "meta-badge-progress"}`}
                              >
                                {summary.label}
                              </span>
                            )}
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
