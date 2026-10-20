"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import LandingPage from "./landing-page";
import HomePage from "./home-page";
import LessonVideo from "./lesson-video";
import StudyOutline from "./study-outline";
import CoursePicker, {
  defaultCourse,
  courseLessons,
  lessonLabel,
  bookId,
  type Course,
} from "./course-picker";
import LessonEditor from "./lesson-editor";
import ContentBlocks from "./content-blocks";
import type { Workspace } from "../data/content";
import {
  saveDraft,
  publishDraft,
  restoreWorkspace,
  sectionText,
} from "../services/content";
import DemoLogin from "./demo-login";
import {
  initialLessons,
  mergeStoredLessons,
  type Lesson,
  type Progress,
  type Answer,
} from "../data/lessons";
import {
  askLesson,
  readStored,
  writeStored,
  contentLabel,
  lessonProgressSummary,
} from "../services/learning";

type View =
  | "landing"
  | "home"
  | "settings"
  | "progress"
  | "reader"
  | "teacher"
  | "admin";

const users = [
  { id: "student-1", name: "Minh Anh", role: "Học sinh" },
  { id: "student-2", name: "Hoàng Nam", role: "Học sinh" },
  { id: "teacher", name: "Cô Lan", role: "Giáo viên" },
  { id: "admin", name: "Quản trị", role: "Quản trị" },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    video: "M3 5h18v14H3zM10 9l5 3-5 3V9Z",
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
  const [showLogin, setShowLogin] = useState(false);
  const [readerMode, setReaderMode] = useState<"read" | "ask" | "quiz">("read");
  const [course, setCourse] = useState<Course>(defaultCourse);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("landing");
  const [workspace, setWorkspace] = useState<Workspace>({
    schemaVersion: 2,
    published: initialLessons,
    drafts: {},
    previous: {},
  });
  const lessons = workspace.published;
  const [userId, setUserId] = useState("student-1");
  const [allProgress, setAllProgress] = useState<
    Record<string, Record<string, Progress>>
  >({});
  const [large, setLarge] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [query, setQuery] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<"read" | "video" | "all">(
    "read",
  );
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
  const [storageProblem, setStorageProblem] = useState(false);
  const lastUrl = useRef("/");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const askTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const user = users.find((u) => u.id === userId) ?? users[0];
  const progress = allProgress[userId] ?? {};
  const lesson = lessons.find((l) => l.id === selected) ?? lessons[0];
  const currentProgress = progress[lesson.id];
  const syllabus = courseLessons(lessons, course);
  const lessonIndex = syllabus.findIndex((l) => l.id === lesson.id);
  const published = lessons.filter((l) => l.status === "published");
  const percent = (l: Lesson) =>
    lessonProgressSummary(l, progress[l.id]).percent;

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedWorkspace = localStorage.getItem("suhoc-content-v2");
        if (savedWorkspace !== null)
          setWorkspace(restoreWorkspace(JSON.parse(savedWorkspace)));
        else {
          const oldRaw = localStorage.getItem("suhoc-lessons-v1");
          const old = oldRaw === null ? initialLessons : JSON.parse(oldRaw);
          if (!Array.isArray(old) || !old.length)
            throw new Error("Dữ liệu cũ không hợp lệ.");
          const migrated = mergeStoredLessons(old);
          setWorkspace(
            restoreWorkspace({
              schemaVersion: 2,
              published: migrated,
              drafts: {},
              previous: {},
            }),
          );
        }
      } catch {
        setStorageProblem(true);
        setNotice(
          "Không đọc được học liệu đã lưu. Đang hiển thị mẫu; chức năng lưu bị khóa để không ghi đè dữ liệu cần khôi phục.",
        );
      }
      setAllProgress(readStored("suhoc-progress-v1", {}));
      try {
        const catalog = JSON.parse(
          sessionStorage.getItem("suhoc-catalog-view-v1") ?? "null",
        );
        if (catalog && ["read", "video", "all"].includes(catalog.filter)) {
          setCatalogFilter(catalog.filter);
          if (typeof catalog.query === "string") setQuery(catalog.query);
          if (
            typeof catalog.course?.subject === "string" &&
            typeof catalog.course?.grade === "number" &&
            typeof catalog.course?.book === "string"
          )
            setCourse(catalog.course);
        }
      } catch {
        /* Keep defaults if this optional view preference cannot be read. */
      }
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
      try {
        setSignedIn(sessionStorage.getItem("suhoc-demo-session") === "yes");
      } catch {
        /* Session-only fallback. */
      }
      setReady(true);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (askTimer.current) clearTimeout(askTimer.current);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        "suhoc-catalog-view-v1",
        JSON.stringify({ filter: catalogFilter, query, course }),
      );
    } catch {
      /* The catalogue still works in memory when storage is unavailable. */
    }
  }, [ready, catalogFilter, query, course]);

  function updateUrl(next: View, id = selected, mode = "read", sectionId = "") {
    const params = new URLSearchParams();
    if (next === "reader") {
      params.set("bai", id);
      if (mode !== "read") params.set("hoat-dong", mode);
    } else if (next === "home") {
      params.set("trang", "kho");
    } else if (next !== "landing") {
      params.set("trang", next);
    }
    const url =
      "/" +
      (params.size ? `?${params}` : "") +
      (sectionId ? `#${encodeURIComponent(sectionId)}` : "");
    if (
      url !==
      window.location.pathname + window.location.search + window.location.hash
    )
      window.history.pushState(null, "", url);
    lastUrl.current = url;
  }

  const restoreLocation = useEffectEvent(() => {
    if (editor) {
      const error = commitEditor(editor, false, {
        source: false,
        accessibility: false,
      });
      if (error) {
        setNotice(error);
        window.history.replaceState(null, "", lastUrl.current);
        return;
      }
      setEditor(null);
    }
    stopSpeech();
    const params = new URLSearchParams(window.location.search);
    const target = lessons.find((l) => l.id === params.get("bai"));
    const page = params.get("trang");
    const next: View = target
      ? "reader"
      : page === "kho" || page === "home"
        ? "home"
        : page === "settings" ||
            page === "progress" ||
            (page === "teacher" && user.role === "Giáo viên") ||
            (page === "admin" && user.role === "Quản trị")
          ? page
          : "landing";
    setView(next);
    if (target) {
      if (target.id !== selected) {
        if (askTimer.current) clearTimeout(askTimer.current);
        setBusy(false);
        setAnswer(null);
        setQuestion("");
        setChoices({});
        setSubmitted(false);
      }
      setSelected(target.id);
      setCourse({
        subject: target.subject,
        grade: target.grade,
        book: bookId(target),
      });
    }
    const mode = params.get("hoat-dong");
    setReaderMode(mode === "ask" || mode === "quiz" ? mode : "read");
    lastUrl.current =
      window.location.pathname + window.location.search + window.location.hash;
    if (params.has("bai") && !target)
      setNotice(
        "Không tìm thấy bài trong đường dẫn. Bạn có thể chọn lại trong kho học liệu.",
      );
    let anchor = "";
    try {
      anchor = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      /* Ignore malformed external fragments. */
    }
    requestAnimationFrame(() => {
      const element = anchor
        ? document.getElementById(anchor)
        : headingRef.current;
      element?.focus();
      if (anchor) element?.scrollIntoView({ block: "center" });
      else window.scrollTo({ top: 0 });
    });
  });

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => restoreLocation(), 0);
    const onBack = () => restoreLocation();
    window.addEventListener("popstate", onBack);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", onBack);
    };
  }, [ready]);

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

  function commitEditor(
    input: Lesson,
    publish: boolean,
    review: { source: boolean; accessibility: boolean },
  ): string | null {
    if (storageProblem)
      return "Dữ liệu lưu có lỗi; cần khôi phục trước khi ghi tiếp.";
    try {
      const next = publish
        ? publishDraft(workspace, input, review)
        : saveDraft(workspace, input);
      if (!writeStored("suhoc-content-v2", next))
        return "Chưa lưu được: bộ nhớ trình duyệt bị chặn hoặc đã đầy. Hãy tải bản sao trong Nguồn & nhập tệp để giữ bản biên tập.";
      setWorkspace(next);
      if (publish) {
        setEditor(null);
        setNotice(
          "Đã công bố bản mới trên trình duyệt này; bản trước được giữ để khôi phục.",
        );
        requestAnimationFrame(() => headingRef.current?.focus());
      }
      log(`${publish ? "Công bố" : "Lưu nháp"}: ${input.title}`);
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Không lưu được học liệu.";
    }
  }

  function navigate(next: View, lessonId = selected) {
    if (editor && next !== "teacher") {
      const error = commitEditor(editor, false, {
        source: false,
        accessibility: false,
      });
      if (error) {
        setNotice(error);
        return;
      }
      setEditor(null);
    }
    stopSpeech();
    if (askTimer.current) clearTimeout(askTimer.current);
    setBusy(false);
    setView(next);
    updateUrl(next, lessonId);
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

  function jump(id: string, lessonId = selected) {
    updateUrl(
      "reader",
      lessonId,
      id === "ask" ? "ask" : id === "quiz" ? "quiz" : "read",
      id,
    );
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
    updateUrl("reader", selected, mode);
    requestAnimationFrame(() =>
      document.getElementById(`panel-${mode}`)?.focus(),
    );
  }

  function openLesson(l: Lesson, sectionId?: string) {
    setCourse({ subject: l.subject, grade: l.grade, book: bookId(l) });
    setSelected(l.id);
    navigate("reader", l.id);
    if (sectionId) jump(sectionId, l.id);
  }

  function changeCourse(next: Course) {
    setCourse(next);
    setQuery("");
    setCatalogFilter("read");
    navigate("home");
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
      requestAnimationFrame(() => {
        if (answerRef.current?.offsetParent) answerRef.current.focus();
      });
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

  if (!ready)
    return (
      <p role="status" className="loading-page">
        Đang mở kho học liệu…
      </p>
    );

  if (showLogin) {
    return (
      <DemoLogin
        onLogin={() => {
          setSignedIn(true);
          setShowLogin(false);
          try {
            sessionStorage.setItem("suhoc-demo-session", "yes");
          } catch {
            /* Keep the current in-memory session. */
          }
          requestAnimationFrame(() => {
            let anchor = "";
            try {
              anchor = decodeURIComponent(window.location.hash.slice(1));
            } catch {
              /* Ignore malformed fragments. */
            }
            const target = anchor
              ? document.getElementById(anchor)
              : headingRef.current;
            target?.focus();
            if (anchor) target?.scrollIntoView({ block: "center" });
          });
        }}
        onCancel={() => {
          setShowLogin(false);
          requestAnimationFrame(() => headingRef.current?.focus());
        }}
      />
    );
  }

  return (
    <div
      className={`app-shell textbook-app ${large ? "large-type" : ""} ${contrast ? "high-contrast" : ""}`}
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
            navigate("landing");
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
              { id: "landing", label: "Trang chủ", icon: "home" },
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
              className={`nav-item ${view === n.id || (n.id === "home" && view === "reader") ? "active" : ""}`}
              aria-current={
                view === n.id || (n.id === "home" && view === "reader")
                  ? "page"
                  : undefined
              }
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
        <div className="sidebar-auth">
          {signedIn ? (
            <>
              <span className="auth-badge" aria-label="Tài khoản đang dùng">
                <span className="status-dot" aria-hidden="true" />
                {user.name} · {user.role}
              </span>
              <button
                type="button"
                className="secondary auth-btn"
                onClick={() => {
                  setSignedIn(false);
                  try {
                    sessionStorage.removeItem("suhoc-demo-session");
                  } catch {
                    /* Ignore session storage errors. */
                  }
                  setNotice("Đã đăng xuất khỏi phiên thử nghiệm.");
                }}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary auth-btn"
              onClick={() => setShowLogin(true)}
            >
              Đăng nhập
            </button>
          )}
        </div>
        <div className="sidebar-bottom">
          <span className="status-dot" /> PHIÊN BẢN DEMO <span>v0.1</span>
        </div>
      </aside>
      <div className="main-shell">
        {view === "home" && (
          <CoursePicker
            lessons={lessons}
            value={course}
            onChange={changeCourse}
          />
        )}
        <main
          id="main"
          tabIndex={-1}
          className={
            view === "home" || view === "landing"
              ? "home-main"
              : view === "reader"
                ? "reader-main"
                : undefined
          }
        >
          {view !== "landing" && view !== "home" && view !== "reader" && (
            <div className="page-heading">
              <div>
                <h1 ref={headingRef} tabIndex={-1}>
                  {view === "settings"
                    ? "Cài đặt & tài khoản"
                    : view === "progress"
                      ? "Học liệu đang học"
                      : view === "teacher"
                        ? "Không gian giáo viên"
                        : "Quản trị bản demo"}
                </h1>
                <p>
                  {view === "settings"
                    ? "Điều chỉnh cách hiển thị và chọn tài khoản sử dụng."
                    : view === "progress"
                      ? "Tiếp tục đọc và xem kết quả luyện tập đã lưu."
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
          {view === "landing" && (
            <LandingPage
              lessons={lessons}
              progress={progress}
              signedIn={signedIn}
              userName={user.name}
              userRole={user.role}
              headingRef={headingRef}
              onExploreCatalog={() => navigate("home")}
              onSelectSubject={(subject) =>
                changeCourse({ ...course, subject })
              }
              onOpenLesson={openLesson}
              onOpenLogin={() => setShowLogin(true)}
              onOpenProgress={() => navigate("progress")}
            />
          )}
          {view === "home" && (
            <HomePage
              lessons={lessons}
              course={course}
              progress={progress}
              ready={ready}
              query={query}
              onQuery={setQuery}
              filter={catalogFilter}
              onFilter={setCatalogFilter}
              onOpen={openLesson}
              headingRef={headingRef}
            />
          )}
          {view === "settings" && (
            <section className="preferences-page" aria-label="Tùy chọn sử dụng">
              <div className="settings-group">
                <h2>Hiển thị và hỗ trợ đọc</h2>
                <p>
                  Các tùy chọn được lưu riêng cho từng tài khoản trên thiết bị
                  này.
                </p>
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
                </div>
              </div>
              <div className="settings-group">
                <h2>Tài khoản</h2>
                <p>
                  Tài khoản mẫu dùng để thử các vai trò, chưa phải đăng nhập
                  thật.
                </p>
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
                        <h2>{lessonLabel(l)}</h2>
                        <p>
                          {
                            l.sections.filter((s) =>
                              progress[l.id].completedSectionIds.includes(s.id),
                            ).length
                          }
                          /{l.sections.length} mục đã học · Quiz:{" "}
                          {progress[l.id].quizScore !== undefined
                            ? `${progress[l.id].quizScore}/${l.questions.length} câu đúng`
                            : "chưa làm"}
                        </p>
                        <div className="progress-bar-row">
                          <progress
                            value={percent(l)}
                            max={100}
                            aria-label={`Tiến độ ${l.title}`}
                          />
                          <span>{percent(l)}%</span>
                        </div>
                      </div>
                      <button
                        className="primary"
                        aria-label={`Tiếp tục học: ${lessonLabel(l)}`}
                        onClick={() =>
                          openLesson(l, progress[l.id]?.lastSectionId)
                        }
                      >
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
              <div className="study-layout">
                <div className="reading-body study-content">
                  <header className="lesson-heading">
                    <div className="reader-shortcuts">
                      <button
                        className="inline-link"
                        onClick={() => navigate("home")}
                      >
                        ← Đổi bài / môn
                      </button>
                      <a href="#book-navigation">Danh sách bài</a>
                      <button
                        className="inline-link"
                        onClick={() => switchReader("read")}
                      >
                        Tới bài đọc ↓
                      </button>
                    </div>
                    <p className="eyebrow">
                      {lesson.subject} {lesson.grade} / Bài{" "}
                      {lesson.textbook?.lessonNumber ?? ""}
                    </p>
                    <h1 ref={headingRef} tabIndex={-1}>
                      {lesson.title}
                    </h1>
                    <p>{lesson.textbook?.title}</p>
                  </header>
                  <LessonVideo
                    key={lesson.id}
                    lesson={lesson}
                    audioActive={speech !== "stopped"}
                  />
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
                  <section
                    id="panel-read"
                    tabIndex={-1}
                    aria-label="Đọc bài"
                    hidden={readerMode !== "read"}
                  >
                    <details
                      className="listen-controls"
                      hidden={!lesson.sections.length}
                    >
                      <summary>Nghe bài · Giọng đọc của thiết bị</summary>
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
                                        .map(
                                          (s) =>
                                            s.heading + ". " + sectionText(s),
                                        )
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
                    </details>
                    <details className="reading-source">
                      <summary>
                        {contentLabel(lesson)} · Nguồn và phạm vi sử dụng
                      </summary>
                      <p className="source-note">{lesson.source}</p>
                      {lesson.provenance && (
                        <p className="source-note">
                          {lesson.provenance.kind === "demo"
                            ? "Dữ liệu mẫu"
                            : lesson.provenance.kind === "textbook"
                              ? "Nội dung sách"
                              : "Học liệu diễn giải"}{" "}
                          · {lesson.provenance.title} ·{" "}
                          {lesson.provenance.edition}
                        </p>
                      )}
                    </details>
                    {!lesson.sections.length && (
                      <div className="resource-panel">
                        <h2>Chưa nhập nội dung bài đọc</h2>
                        <p>
                          Bài này đã có trong mục lục. Nội dung sách giáo khoa
                          chưa được nhập vào ứng dụng.
                        </p>
                        <a
                          className="secondary"
                          href="https://hanhtrangso.nxbgd.vn/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Tra cứu sách tại Hành trang số ↗
                        </a>
                      </div>
                    )}
                    {lesson.sections.map((s, i) => (
                      <section className="reading-section" key={s.id}>
                        <span className="eyebrow">MỤC 0{i + 1}</span>
                        <h2 id={s.id} tabIndex={-1}>
                          {s.heading}
                        </h2>
                        <ContentBlocks section={s} />
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
                            aria-label={`${currentProgress?.completedSectionIds.includes(s.id) ? "Đã đọc mục này" : "Đánh dấu đã đọc"}: ${s.heading}`}
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
                              onClick={() =>
                                speak(s.heading + ". " + sectionText(s))
                              }
                              aria-label={`Nghe mục này: ${s.heading}`}
                            >
                              <Icon name="audio" size={16} />
                              Nghe mục này
                            </button>
                          )}
                        </div>
                      </section>
                    ))}
                    {lesson.sections.length > 0 && (
                      <section
                        className="study-next-step"
                        aria-label="Bước học tiếp theo"
                      >
                        <div>
                          <span className="eyebrow">BƯỚC TIẾP THEO</span>
                          <h3>
                            Đã đọc{" "}
                            {
                              lesson.sections.filter((s) =>
                                currentProgress?.completedSectionIds.includes(
                                  s.id,
                                ),
                              ).length
                            }
                            /{lesson.sections.length} mục trong bài
                          </h3>
                          <p>
                            {lesson.questions.length > 0
                              ? currentProgress?.quizScore !== undefined
                                ? `Bạn đã hoàn thành luyện tập (${currentProgress.quizScore}/${lesson.questions.length} câu đúng). Bạn có thể ôn lại hoặc hỏi đáp theo đoạn nguồn.`
                                : `Chuyển sang làm ${lesson.questions.length} câu hỏi luyện tập để kiểm tra mức độ nắm bài.`
                              : "Bạn có thể chuyển sang mục Hỏi đáp để tra cứu nhanh các đoạn nguồn trong bài."}
                          </p>
                        </div>
                        <div className="study-next-actions">
                          {lesson.questions.length > 0 && (
                            <button
                              className="primary"
                              onClick={() => switchReader("quiz")}
                            >
                              Luyện tập ({lesson.questions.length} câu){" "}
                              <Icon name="arrow" size={16} />
                            </button>
                          )}
                          <button
                            className="secondary"
                            onClick={() => switchReader("ask")}
                          >
                            Hỏi đáp theo đoạn nguồn
                          </button>
                        </div>
                      </section>
                    )}
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
                      AI chưa được kết nối. Bạn có thể thử tìm đoạn nguồn bằng
                      từ khóa trong các bài có nội dung mẫu.
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
                        disabled={
                          busy || !question.trim() || !lesson.sections.length
                        }
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
                            key={c.blockId ?? c.sectionId}
                            onClick={() =>
                              jump(
                                c.blockId ? `source-${c.blockId}` : c.sectionId,
                              )
                            }
                          >
                            <Icon name="book" size={16} /> {lesson.title} ·{" "}
                            {
                              lesson.sections.find((s) => s.id === c.sectionId)
                                ?.heading
                            }{" "}
                            {c.page ? ` · trang ${c.page}` : ""} ↗
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
                    <p>
                      {lesson.questions.length
                        ? `${lesson.questions.length} câu hỏi · Chọn một đáp án cho mỗi câu.`
                        : "Chưa có câu hỏi luyện tập cho bài này."}
                    </p>
                    {lesson.questions.length > 0 && (
                      <div
                        className="quiz-palette"
                        aria-label="Danh sách câu hỏi"
                      >
                        <div className="quiz-palette-status" role="status">
                          {submitted
                            ? `Kết quả: đúng ${currentProgress?.quizScore ?? 0}/${lesson.questions.length} câu`
                            : `Đã chọn ${Object.keys(choices).length}/${lesson.questions.length} câu`}
                        </div>
                        <div className="quiz-palette-list">
                          {lesson.questions.map((q, i) => {
                            const picked = choices[q.id] !== undefined;
                            const right =
                              submitted && choices[q.id] === q.correctOptionId;
                            const stateClass = submitted
                              ? right
                                ? "correct"
                                : "incorrect"
                              : picked
                                ? "answered"
                                : "";
                            const stateLabel = submitted
                              ? right
                                ? "Đúng"
                                : "Chưa chính xác"
                              : picked
                                ? "Đã chọn đáp án"
                                : "Chưa chọn đáp án";
                            return (
                              <button
                                type="button"
                                key={q.id}
                                className={`quiz-palette-item ${stateClass}`}
                                aria-label={`Câu ${i + 1}: ${stateLabel}`}
                                onClick={() => {
                                  const el = document.getElementById(
                                    `question-${q.id}`,
                                  );
                                  el?.focus();
                                  el?.scrollIntoView({
                                    behavior: "instant",
                                    block: "center",
                                  });
                                }}
                              >
                                <span aria-hidden="true">
                                  Câu {i + 1}
                                  {submitted
                                    ? right
                                      ? " ✓"
                                      : " ✕"
                                    : picked
                                      ? " •"
                                      : ""}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitQuiz();
                      }}
                    >
                      {lesson.questions.map((q, i) => (
                        <fieldset
                          key={q.id}
                          id={`question-${q.id}`}
                          tabIndex={-1}
                          disabled={submitted}
                        >
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
                      {!submitted && lesson.questions.length > 0 && (
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
                          Bạn trả lời đúng {currentProgress?.quizScore}/
                          {lesson.questions.length} câu
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
                  <nav className="lesson-pagination" aria-label="Chuyển bài">
                    <button
                      className="inline-link"
                      disabled={lessonIndex <= 0}
                      onClick={() => openLesson(syllabus[lessonIndex - 1])}
                    >
                      ← Bài trước
                    </button>
                    <button
                      className="inline-link"
                      disabled={
                        lessonIndex < 0 || lessonIndex >= syllabus.length - 1
                      }
                      onClick={() => openLesson(syllabus[lessonIndex + 1])}
                    >
                      Bài tiếp theo →
                    </button>
                  </nav>
                </div>
                <StudyOutline
                  lessons={syllabus}
                  lesson={lesson}
                  progress={currentProgress}
                  allProgress={progress}
                  percent={percent(lesson)}
                  onOpen={openLesson}
                  onJump={jump}
                />
              </div>
            </>
          )}
          {view === "teacher" && user.role === "Giáo viên" && (
            <>
              {!editor && (
                <div className="notice">
                  Bản nháp được lưu riêng với bài đang công bố. “Công bố” chỉ
                  thay đổi dữ liệu trên thiết bị; không chứng nhận nội dung đã
                  được chuyên gia duyệt.
                </div>
              )}
              {!editor ? (
                <>
                  {lessons.map((l) => (
                    <article className="progress-row" key={l.id}>
                      <div>
                        <span className="eyebrow">
                          {l.status === "published"
                            ? contentLabel(l)
                            : "Bản nháp"}
                        </span>
                        <h2>{lessonLabel(l)}</h2>
                        {workspace.drafts[l.id] && (
                          <p>
                            Có bản nháp riêng · lưu{" "}
                            {new Date(
                              workspace.drafts[l.id].savedAt,
                            ).toLocaleString("vi-VN")}
                          </p>
                        )}
                        {workspace.previous[l.id] && (
                          <button
                            className="inline-link"
                            onClick={() =>
                              setEditor({
                                ...structuredClone(workspace.previous[l.id]),
                                status: "draft",
                              })
                            }
                          >
                            Mở bản công bố trước để khôi phục
                          </button>
                        )}
                        <p>
                          {l.sections.length} mục · {l.questions.length} câu hỏi
                        </p>
                      </div>
                      <button
                        className="secondary"
                        aria-label={`Biên tập: ${lessonLabel(l)}`}
                        onClick={() => {
                          setEditor(
                            structuredClone(
                              workspace.drafts[l.id]?.lesson ?? l,
                            ),
                          );
                        }}
                      >
                        Biên tập
                      </button>
                    </article>
                  ))}
                </>
              ) : (
                <LessonEditor
                  key={editor.id}
                  lesson={editor}
                  onChange={setEditor}
                  onCommit={commitEditor}
                  onClose={() => {
                    setEditor(null);
                    requestAnimationFrame(() => headingRef.current?.focus());
                  }}
                />
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
