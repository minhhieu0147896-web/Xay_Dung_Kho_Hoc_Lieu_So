"use client";

import { useEffect, useRef, useState } from "react";
import HomePage from "./home-page";
import DemoLogin from "./demo-login";
import {
  initialLessons,
  type Lesson,
  type Progress,
  type Answer,
} from "../data/lessons";
import { askLesson, readStored, writeStored } from "../services/learning";

type View = "home" | "settings" | "progress" | "reader" | "teacher" | "admin";
const users = [
  { id: "student-1", name: "Minh Anh", role: "Học sinh" },
  { id: "student-2", name: "Hoàng Nam", role: "Học sinh" },
  { id: "teacher", name: "Cô Lan", role: "Giáo viên" },
  { id: "admin", name: "Quản trị", role: "Quản trị" },
];
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    book: "M3 4h6c2 0 3 1 3 2v15c0-2-2-3-4-3H3V4Zm18 0h-6c-2 0-3 1-3 2v15c0-2 2-3 4-3h5V4Z",
    home: "m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z",
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
    chart: "M4 20V10m8 10V4m8 16v-7",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    audio: "M4 9h4l5-4v14l-5-4H4V9Zm13-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14",
    check: "m5 12 4 4L20 5",
    sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    clock: "M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
    spark: "m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z",
    settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
    flag: "M5 22V3h14l-3 5 3 5H5",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.book} />
    </svg>
  );
}
export default function LearningApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [readerMode, setReaderMode] = useState<"read" | "ask" | "quiz">("read");
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("home");
  const [lessons, setLessons] = useState(initialLessons);
  const [userId, setUserId] = useState("student-1");
  const [allProgress, setAllProgress] = useState<
    Record<string, Record<string, Progress>>
  >({});
  const [large, setLarge] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initialLessons[0].id);
  const [logs, setLogs] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [speech, setSpeech] = useState("stopped");
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [rate, setRate] = useState("1");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [editor, setEditor] = useState<Lesson | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const askTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const user = users.find((u) => u.id === userId) ?? users[0];
  const progress = allProgress[userId] ?? {};
  const lesson = lessons.find((l) => l.id === selected) ?? lessons[0];
  const currentProgress = progress[lesson.id];
  const published = lessons.filter((l) => l.status === "published");
  const percent = (l: Lesson) =>
    Math.round(
      (((progress[l.id]?.completedSectionIds.length ?? 0) +
        (progress[l.id]?.quizScore !== undefined ? 1 : 0)) /
        (l.sections.length + 1)) *
        100,
    );
  useEffect(() => {
    const timer = setTimeout(() => {
      const storedLessons = readStored<Lesson[]>(
        "suhoc-lessons-v1",
        initialLessons,
      );
      if (
        Array.isArray(storedLessons) &&
        storedLessons.length &&
        storedLessons.every(
          (l) =>
            l.id && Array.isArray(l.sections) && Array.isArray(l.questions),
        )
      )
        setLessons(
          storedLessons.map((l) => ({
            ...l,
            subject: l.subject ?? "Lịch sử",
            grade: l.grade ?? 12,
          })),
        );
      setAllProgress(readStored("suhoc-progress-v1", {}));
      setLogs(readStored("suhoc-logs-v1", []));
      const savedUser = readStored("suhoc-user-v1", "student-1");
      if (users.some((u) => u.id === savedUser)) setUserId(savedUser);
      const prefs = readStored(`suhoc-prefs-v1-${savedUser}`, {
        large: false,
        contrast: false,
      });
      setLarge(prefs.large);
      setContrast(prefs.contrast);
      setSpeechAvailable("speechSynthesis" in window);
      setReady(true);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (askTimer.current) clearTimeout(askTimer.current);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  function persist(key: string, value: unknown) {
    if (!writeStored(key, value))
      setNotice(
        "Trình duyệt không cho phép lưu. Dữ liệu hiện chỉ được giữ trong phiên này.",
      );
  }
  function log(message: string) {
    const next = [
      `${new Date().toLocaleString("vi-VN")} · ${user.name}: ${message}`,
      ...logs,
    ].slice(0, 40);
    setLogs(next);
    persist("suhoc-logs-v1", next);
  }
  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeech("stopped");
  }
  function navigate(next: View) {
    stopSpeech();
    if (askTimer.current) clearTimeout(askTimer.current);
    setBusy(false);
    setView(next);
    setReaderMode("read");
    setAnswer(null);
    setQuestion("");
    setChoices({});
    setSubmitted(false);
    setNotice("");
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    });
  }
  function jump(id: string) {
    setReaderMode(id === "ask" ? "ask" : id === "quiz" ? "quiz" : "read");
    stopSpeech();
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.focus();
      el?.scrollIntoView({ behavior: "instant", block: "center" });
    });
  }
  function switchReader(mode: "read" | "ask" | "quiz") {
    stopSpeech();
    setReaderMode(mode);
    requestAnimationFrame(() =>
      document.getElementById(`panel-${mode}`)?.focus(),
    );
  }
  function openLesson(l: Lesson, sectionId?: string) {
    setSelected(l.id);
    navigate("reader");
    if (sectionId) jump(sectionId);
    else if (progress[l.id]?.lastSectionId) jump(progress[l.id].lastSectionId!);
  }
  function saveProgress(update: Partial<Progress>) {
    const next = {
      ...allProgress,
      [userId]: {
        ...progress,
        [lesson.id]: {
          ...currentProgress,
          completedSectionIds: currentProgress?.completedSectionIds ?? [],
          ...update,
          updatedAt: new Date().toISOString(),
        },
      },
    };
    setAllProgress(next);
    persist("suhoc-progress-v1", next);
  }
  function toggleSection(id: string) {
    const ids = currentProgress?.completedSectionIds ?? [];
    saveProgress({
      completedSectionIds: ids.includes(id)
        ? ids.filter((s) => s !== id)
        : [...ids, id],
      lastSectionId: id,
    });
  }
  function speak(text: string) {
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = Number(rate);
    utterance.onend = () => setSpeech("stopped");
    utterance.onerror = () => {
      setSpeech("stopped");
      setNotice(
        "Không phát được giọng đọc. Hãy kiểm tra giọng tiếng Việt trên thiết bị.",
      );
    };
    window.speechSynthesis.speak(utterance);
    setSpeech("playing");
  }
  function ask() {
    if (!question.trim()) return;
    setBusy(true);
    setAnswer(null);
    askTimer.current = setTimeout(() => {
      setAnswer(askLesson(lesson, question));
      setBusy(false);
      requestAnimationFrame(() => answerRef.current?.focus());
    }, 350);
  }
  function submitQuiz() {
    const score = lesson.questions.filter(
      (q) => choices[q.id] === q.correctOptionId,
    ).length;
    saveProgress({ quizScore: score });
    setSubmitted(true);
    log(
      `Hoàn thành quiz: ${lesson.title} (${score}/${lesson.questions.length})`,
    );
    requestAnimationFrame(() => resultRef.current?.focus());
  }
  function preference(kind: "large" | "contrast") {
    const prefs = {
      large: kind === "large" ? !large : large,
      contrast: kind === "contrast" ? !contrast : contrast,
    };
    setLarge(prefs.large);
    setContrast(prefs.contrast);
    persist(`suhoc-prefs-v1-${userId}`, prefs);
  }
  if (!signedIn) {
    return <DemoLogin onLogin={() => {
      setSignedIn(true);
      navigate("home");
    }} />;
  }
  return (
    <div
      className={`app-shell ${large ? "large-type" : ""} ${contrast ? "high-contrast" : ""}`}
    >
      <a href="#main" className="skip-link">
        Bỏ qua điều hướng
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-icon">
            <Icon name="book" size={25} />
          </span>
          <span>
            Học liệu số<span className="brand-sub">Thư viện học tập</span>
          </span>
        </a>
        <div className="workspace-label">Danh mục</div>
        <nav aria-label="Điều hướng chính">
          {(
            [
              { id: "home", label: "Kho học liệu", icon: "book" },
              { id: "progress", label: "Học liệu đang học", icon: "chart" },
              {
                id: "settings",
                label: "Cài đặt & tài khoản",
                icon: "settings",
              },
            ] as const
          ).map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              aria-current={view === n.id ? "page" : undefined}
              onClick={() => {
                setQuery("");
                navigate(n.id);
              }}
            >
              <Icon name={n.icon} />
              {n.label}
            </button>
          ))}
          {user.role === "Giáo viên" && (
            <button
              className={`nav-item ${view === "teacher" ? "active" : ""}`}
              onClick={() => navigate("teacher")}
            >
              <Icon name="settings" />
              Quản lý học liệu
            </button>
          )}
          {user.role === "Quản trị" && (
            <button
              className={`nav-item ${view === "admin" ? "active" : ""}`}
              onClick={() => navigate("admin")}
            >
              <Icon name="settings" />
              Quản trị demo
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" /> PHIÊN BẢN DEMO <span>v0.1</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>Kho học liệu số</span>
          <span>
            {user.name} · {user.role}
          </span>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className={view === "home" ? "home-main" : undefined}
        >
          {view !== "home" && (
            <div className="page-heading">
              <div>
                <h1 ref={headingRef} tabIndex={-1}>
                  {view === "settings"
                    ? "Cài đặt & tài khoản"
                    : view === "progress"
                      ? "Học liệu đang học"
                      : view === "reader"
                        ? lesson.title
                        : view === "teacher"
                          ? "Không gian giáo viên"
                          : "Quản trị bản demo"}
                </h1>
                <p>
                  {view === "settings"
                    ? "Điều chỉnh cách hiển thị và chọn tài khoản sử dụng."
                    : view === "progress"
                      ? "Tiếp tục đọc và xem kết quả luyện tập đã lưu."
                      : view === "reader"
                        ? lesson.chapter
                        : "Dữ liệu mẫu được lưu cục bộ trong trình duyệt này."}
                </p>
              </div>
            </div>
          )}
          {!ready && <p role="status">Đang tải không gian học tập…</p>}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {view === "home" && (
            <HomePage
              lessons={lessons}
              ready={ready}
              query={query}
              onQuery={setQuery}
              onOpen={openLesson}
              headingRef={headingRef}
            />
          )}
          {view === "settings" && (
            <section className="preferences-page" aria-label="Tùy chọn sử dụng">
              <h2>Hiển thị và hỗ trợ đọc</h2>
              <p>
                Các tùy chọn được lưu riêng cho từng tài khoản trên thiết bị
                này.
              </p>{" "}
              <div className="top-actions">
                <button
                  id="font-toggle"
                  className="utility"
                  aria-label="Chữ lớn"
                  aria-pressed={large}
                  onClick={() => preference("large")}
                >
                  Chữ lớn
                </button>
                <button
                  className="utility"
                  aria-label="Tương phản cao"
                  aria-pressed={contrast}
                  onClick={() => preference("contrast")}
                >
                  Tương phản
                </button>
                <div className="settings-account-heading">
                  <h2>Tài khoản</h2>
                  <p>
                    Tài khoản mẫu dùng để thử các vai trò, chưa phải đăng nhập
                    thật.
                  </p>
                </div>
                <label className="user-picker">
                  <span>Tài khoản mẫu</span>
                  <select
                    aria-label="Chọn tài khoản demo"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      persist("suhoc-user-v1", e.target.value);
                      const prefs = readStored(
                        `suhoc-prefs-v1-${e.target.value}`,
                        {
                          large: false,
                          contrast: false,
                        },
                      );
                      setLarge(prefs.large);
                      setContrast(prefs.contrast);
                      setEditor(null);
                      navigate("home");
                    }}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} · {u.role}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          )}
          {view === "progress" && (
            <>
              <div className="notice">
                Tiến độ của {user.name} được lưu trên trình duyệt này, không
                đồng bộ giữa các thiết bị.
              </div>
              {published.some((l) => progress[l.id]) ? (
                published
                  .filter((l) => progress[l.id])
                  .map((l) => (
                    <article className="progress-row" key={l.id}>
                      <div>
                        <span className="eyebrow">HỌC LIỆU</span>
                        <h2>{l.title}</h2>
                        <p>
                          {progress[l.id].completedSectionIds.length}/
                          {l.sections.length} mục đã học · Quiz:{" "}
                          {progress[l.id].quizScore !== undefined
                            ? `${progress[l.id].quizScore}/3 câu đúng`
                            : "chưa làm"}
                        </p>
                        <progress
                          value={percent(l)}
                          max={100}
                          aria-label={`Tiến độ ${l.title}`}
                        />
                        <span> {percent(l)}%</span>
                      </div>
                      <button className="primary" onClick={() => openLesson(l)}>
                        Tiếp tục học <Icon name="arrow" size={16} />
                      </button>
                    </article>
                  ))
              ) : (
                <div className="empty-state">
                  <Icon name="book" size={36} />
                  <h2>Hành trình của bạn bắt đầu từ đây</h2>
                  <p>
                    Đánh dấu mục đã đọc hoặc hoàn thành quiz để lưu tiến độ đầu
                    tiên.
                  </p>
                  <button className="primary" onClick={() => navigate("home")}>
                    Chọn một bài học
                  </button>
                </div>
              )}
            </>
          )}
          {view === "reader" && (
            <>
              <button
                className="inline-link back-link"
                onClick={() => navigate("home")}
              >
                ← Kho học liệu
              </button>
              <nav
                className="reader-navigation"
                aria-label="Hoạt động trong bài học"
              >
                {(
                  [
                    { id: "read", label: "Đọc bài" },
                    { id: "ask", label: "Hỏi đáp" },
                    { id: "quiz", label: "Luyện tập" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={readerMode === item.id}
                    aria-controls={`panel-${item.id}`}
                    onClick={() => switchReader(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <div
                className={`reader-layout ${readerMode !== "read" ? "single-panel" : ""}`}
              >
                <aside className="toc" hidden={readerMode !== "read"}>
                  <span className="eyebrow">TRONG BÀI HỌC NÀY</span>
                  <nav aria-label="Mục lục bài học">
                    {lesson.sections.map((s, i) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          jump(s.id);
                        }}
                      >
                        {currentProgress?.completedSectionIds.includes(s.id)
                          ? "✓"
                          : `0${i + 1}`}{" "}
                        <span>{s.heading}</span>
                      </a>
                    ))}
                  </nav>
                  <div className="toc-progress">
                    <span>Tiến độ bài học · {percent(lesson)}%</span>
                    <progress
                      value={percent(lesson)}
                      max={100}
                      aria-label="Tiến độ bài học"
                    />
                  </div>
                </aside>
                <div className="reading-body">
                  <section
                    id="panel-read"
                    tabIndex={-1}
                    aria-label="Đọc bài"
                    hidden={readerMode !== "read"}
                  >
                    <div className="audio-bar">
                      <Icon name="audio" />
                      <div>
                        <strong>Lắng nghe bài học</strong>
                        <small>
                          {speechAvailable
                            ? speech === "playing"
                              ? "Đang đọc"
                              : speech === "paused"
                                ? "Đã tạm dừng"
                                : "Giọng đọc của thiết bị"
                            : "Thiết bị chưa hỗ trợ TTS; bạn vẫn có thể dùng trình đọc màn hình."}
                        </small>
                      </div>
                      {speechAvailable && (
                        <>
                          <label className="sr-only" htmlFor="rate">
                            Tốc độ đọc
                          </label>
                          <select
                            id="rate"
                            value={rate}
                            onChange={(e) => {
                              stopSpeech();
                              setRate(e.target.value);
                            }}
                          >
                            <option value="0.8">0.8×</option>
                            <option value="1">1×</option>
                            <option value="1.2">1.2×</option>
                            <option value="1.5">1.5×</option>
                          </select>
                          <button
                            className="primary"
                            onClick={() => {
                              if (speech === "playing") {
                                window.speechSynthesis.pause();
                                setSpeech("paused");
                              } else if (speech === "paused") {
                                window.speechSynthesis.resume();
                                setSpeech("playing");
                              } else
                                speak(
                                  lesson.title +
                                    ". " +
                                    lesson.sections
                                      .map((s) => s.heading + ". " + s.body)
                                      .join(" "),
                                );
                            }}
                          >
                            {speech === "playing"
                              ? "Tạm dừng"
                              : speech === "paused"
                                ? "Tiếp tục"
                                : "Nghe bài"}
                          </button>
                          <button
                            className="secondary"
                            onClick={stopSpeech}
                            disabled={speech === "stopped"}
                          >
                            Dừng
                          </button>
                        </>
                      )}
                    </div>
                    <p className="source-note">{lesson.source}</p>
                    {lesson.sections.map((s, i) => (
                      <section className="reading-section" key={s.id}>
                        <span className="eyebrow">MỤC 0{i + 1}</span>
                        <h2 id={s.id} tabIndex={-1}>
                          {s.heading}
                        </h2>
                        <p>{s.body}</p>
                        <div className="section-actions">
                          <button
                            className={
                              currentProgress?.completedSectionIds.includes(
                                s.id,
                              )
                                ? "completed-button"
                                : "secondary"
                            }
                            aria-pressed={
                              currentProgress?.completedSectionIds.includes(
                                s.id,
                              ) ?? false
                            }
                            onClick={() => toggleSection(s.id)}
                          >
                            <Icon name="check" size={16} />
                            {currentProgress?.completedSectionIds.includes(s.id)
                              ? "Đã đọc mục này"
                              : "Đánh dấu đã đọc"}
                          </button>
                          {speechAvailable && (
                            <button
                              className="inline-link"
                              onClick={() => speak(s.heading + ". " + s.body)}
                            >
                              <Icon name="audio" size={16} />
                              Nghe mục này
                            </button>
                          )}
                        </div>
                      </section>
                    ))}
                    <div className="section-actions">
                      <button
                        className="secondary"
                        onClick={() => switchReader("ask")}
                      >
                        Hỏi về bài học
                      </button>
                      <button
                        className="primary"
                        onClick={() => switchReader("quiz")}
                      >
                        Chuyển sang luyện tập
                      </button>
                    </div>
                  </section>
                  <section
                    className="ask-panel"
                    id="panel-ask"
                    tabIndex={-1}
                    aria-labelledby="ask"
                    hidden={readerMode !== "ask"}
                  >
                    <span className="eyebrow green">
                      <Icon name="spark" size={15} /> HIỂU THÊM QUA CÂU HỎI
                    </span>
                    <h2 id="ask" tabIndex={-1}>
                      Bạn muốn tìm hiểu điều gì?
                    </h2>
                    <p>
                      Truy hồi đoạn nguồn bằng từ khóa, chưa sử dụng mô hình AI.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        ask();
                      }}
                    >
                      <label htmlFor="question">Câu hỏi về bài học này</label>
                      <textarea
                        id="question"
                        value={question}
                        maxLength={500}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={
                          lesson.id === "doi-moi"
                            ? "Trọng tâm của Đổi mới là gì?"
                            : "Hà Nội giành chính quyền ngày nào?"
                        }
                        required
                      />
                      <button
                        className="primary"
                        disabled={busy || !question.trim()}
                      >
                        {busy ? "Đang tìm đoạn nguồn…" : "Tìm câu trả lời"}
                        <Icon name="arrow" size={16} />
                      </button>
                    </form>
                    <p role="status" className="sr-only">
                      {busy
                        ? "Đang tìm đoạn nguồn"
                        : answer
                          ? "Đã có kết quả"
                          : ""}
                    </p>
                    {answer && (
                      <div className="answer" ref={answerRef} tabIndex={-1}>
                        <strong>
                          {answer.status === "ok"
                            ? "Đoạn học liệu phù hợp"
                            : "Chưa đủ căn cứ"}
                        </strong>
                        <p>{answer.text}</p>
                        {answer.citations.map((c) => (
                          <button
                            className="citation"
                            key={c.sectionId}
                            onClick={() => jump(c.sectionId)}
                          >
                            <Icon name="book" size={16} /> {lesson.title} ·{" "}
                            {
                              lesson.sections.find((s) => s.id === c.sectionId)
                                ?.heading
                            }{" "}
                            ↗
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                  <section
                    className="quiz-panel"
                    id="panel-quiz"
                    tabIndex={-1}
                    aria-labelledby="quiz"
                    hidden={readerMode !== "quiz"}
                  >
                    <span className="eyebrow green">ÔN LẠI ĐIỀU VỪA HỌC</span>
                    <h2 id="quiz" tabIndex={-1}>
                      Một chút luyện tập
                    </h2>
                    <p>3 câu hỏi · Chọn một đáp án cho mỗi câu.</p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitQuiz();
                      }}
                    >
                      {lesson.questions.map((q, i) => (
                        <fieldset key={q.id} disabled={submitted}>
                          <legend>
                            {i + 1}. {q.prompt}
                          </legend>
                          {q.options.map((option, j) => (
                            <label
                              className={`quiz-option ${choices[q.id] === j ? "selected" : ""}`}
                              key={j}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={j}
                                checked={choices[q.id] === j}
                                required
                                onChange={() =>
                                  setChoices({ ...choices, [q.id]: j })
                                }
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                          {submitted && (
                            <div className="explanation">
                              <strong>
                                {choices[q.id] === q.correctOptionId
                                  ? "✓ Chính xác"
                                  : "Chưa chính xác"}
                              </strong>
                              <p>{q.explanation}</p>
                              <a
                                href={`#${q.sourceSectionId}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  jump(q.sourceSectionId);
                                }}
                              >
                                Xem đoạn giải thích ↗
                              </a>
                            </div>
                          )}
                        </fieldset>
                      ))}
                      {!submitted && (
                        <button
                          className="primary"
                          disabled={
                            Object.keys(choices).length <
                            lesson.questions.length
                          }
                        >
                          Nộp bài và xem kết quả
                        </button>
                      )}
                    </form>
                    {submitted && (
                      <div
                        className="quiz-result"
                        ref={resultRef}
                        tabIndex={-1}
                      >
                        <Icon name="flag" />
                        <h3>
                          Bạn trả lời đúng {currentProgress?.quizScore}/3 câu
                        </h3>
                        <p>
                          Kết quả đã được ghi nhận. Bạn có thể đọc lại các đoạn
                          nguồn và thử một lần nữa.
                        </p>
                        <button
                          className="secondary"
                          onClick={() => {
                            setSubmitted(false);
                            setChoices({});
                            jump("quiz");
                          }}
                        >
                          Làm lại
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </>
          )}
          {view === "teacher" && user.role === "Giáo viên" && (
            <>
              <div className="notice">
                Quy trình biên tập mô phỏng. “Công bố” chỉ thay đổi dữ liệu trên
                thiết bị; không chứng nhận nội dung đã được chuyên gia duyệt.
              </div>
              {!editor ? (
                <>
                  {lessons.map((l) => (
                    <article className="progress-row" key={l.id}>
                      <div>
                        <span className="eyebrow">
                          {l.status === "published"
                            ? "ĐÃ CÔNG BỐ · DEMO"
                            : "BẢN NHÁP"}
                        </span>
                        <h2>{l.title}</h2>
                        <p>
                          {l.sections.length} mục · {l.questions.length} câu hỏi
                        </p>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => {
                          setEditor(structuredClone(l));
                          setReviewed(false);
                        }}
                      >
                        Biên tập
                      </button>
                    </article>
                  ))}
                </>
              ) : (
                <form
                  className="editor-panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const next = lessons.map((l) =>
                      l.id === editor.id ? editor : l,
                    );
                    setLessons(next);
                    persist("suhoc-lessons-v1", next);
                    log(`Lưu bài ${editor.title} (${editor.status})`);
                    setEditor(null);
                    setNotice("Đã lưu thay đổi học liệu trên trình duyệt.");
                  }}
                >
                  <h2>Biên tập bài học</h2>
                  <label>
                    Tiêu đề
                    <input
                      required
                      value={editor.title}
                      onChange={(e) =>
                        setEditor({ ...editor, title: e.target.value })
                      }
                    />
                  </label>
                  {editor.sections.map((s, i) => (
                    <label key={s.id}>
                      {s.heading}
                      <textarea
                        required
                        rows={5}
                        value={s.body}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            sections: editor.sections.map((x, j) =>
                              i === j ? { ...x, body: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  {editor.questions.map((q, i) => (
                    <label key={q.id}>
                      Câu hỏi {i + 1}
                      <input
                        required
                        value={q.prompt}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            questions: editor.questions.map((x, j) =>
                              i === j ? { ...x, prompt: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Trạng thái
                    <select
                      value={editor.status}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          status: e.target.value as Lesson["status"],
                        })
                      }
                    >
                      <option value="draft">Bản nháp</option>
                      <option value="published">Công bố trong demo</option>
                    </select>
                  </label>
                  {editor.status === "published" && (
                    <label className="check-label">
                      <input
                        type="checkbox"
                        required
                        checked={reviewed}
                        onChange={(e) => setReviewed(e.target.checked)}
                      />
                      Tôi đã kiểm tra nội dung và câu hỏi trước khi công bố
                      trong demo.
                    </label>
                  )}
                  <div className="section-actions">
                    <button className="primary">Lưu học liệu</button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setEditor(null)}
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
          {view === "admin" && user.role === "Quản trị" && (
            <>
              <div className="notice">
                Chuyển vai trò là mô phỏng, không phải xác thực hay phân quyền
                bảo mật.
              </div>
              <section className="admin-panel">
                <h2>Tài khoản mẫu</h2>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Tài khoản</th>
                        <th>Tên hiển thị</th>
                        <th>Vai trò</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>{u.name}</td>
                          <td>{u.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="admin-panel">
                <h2>Nhật ký sự kiện trên thiết bị</h2>
                {logs.length ? (
                  <ul className="event-list">
                    {logs.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Chưa có sự kiện. Hoàn thành quiz hoặc lưu học liệu để tạo
                    nhật ký.
                  </p>
                )}
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>Kho học liệu số</span>
            <span>Bản demo · Nội dung mẫu chưa được kiểm duyệt</span>{" "}
          </footer>
        </main>
      </div>
    </div>
  );
}
