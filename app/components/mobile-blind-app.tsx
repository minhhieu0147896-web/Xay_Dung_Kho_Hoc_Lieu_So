"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Contrast,
  Headphones,
  HelpCircle,
  Home,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Type,
  Volume2,
} from "lucide-react";
import type {
  Answer,
  Lesson,
  MobileLessonDetail,
  MobileLessonListResponse,
  MobileLessonSummary,
  Progress,
} from "../data/content";
import { initialLessons, mergeStoredLessons } from "../data/lessons";
import {
  mergeMobileLessonsWithLocal,
  resolveMobileLessonDetail,
  restoreWorkspace,
  toLessonFromMobileDetail,
  toMobileLessonSummary,
} from "../services/content";
import {
  askLesson,
  findBestMatchingSection,
  readStored,
  semanticSearchLessons,
  writeStored,
} from "../services/learning";

type MobileTab = "home" | "study" | "ask" | "quiz";

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

type AskAnswerState = Answer & {
  provider?: "openrouter" | "local-fallback";
  fallback?: boolean;
  model?: string;
  notice?: string;
  suggestedQuestions?: string[];
};

const MOBILE_PREFS_KEY = "suhoc-mobile-prefs-v1";
const SPEECH_RATES = ["0.8", "1", "1.2", "1.5"] as const;
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function readLocalPublishedLessons(): Lesson[] {
  try {
    const savedWorkspace = localStorage.getItem("suhoc-content-v2");
    if (savedWorkspace !== null) {
      return restoreWorkspace(JSON.parse(savedWorkspace)).published;
    }
    const oldRaw = localStorage.getItem("suhoc-lessons-v1");
    if (oldRaw !== null) {
      const old = JSON.parse(oldRaw);
      if (Array.isArray(old) && old.length > 0) {
        return mergeStoredLessons(old);
      }
    }
  } catch {
    /* Fallback to API or initial lessons if localStorage is unavailable or malformed. */
  }
  return [];
}

function formatLessonHeader(lesson: {
  lessonNumber?: number;
  title: string;
}) {
  return typeof lesson.lessonNumber === "number"
    ? `Bài ${lesson.lessonNumber}: ${lesson.title}`
    : lesson.title;
}

export default function MobileBlindApp() {
  const [tab, setTab] = useState<MobileTab>("home");
  const [large, setLarge] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [rate, setRate] = useState<string>("1");

  const [summaries, setSummaries] = useState<MobileLessonSummary[]>([]);
  const [mergedLessons, setMergedLessons] = useState<Lesson[]>(initialLessons);
  const [loadingList, setLoadingList] = useState(true);
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeLesson, setActiveLesson] = useState<MobileLessonDetail | null>(
    null,
  );
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(0);

  const [statusMessage, setStatusMessage] = useState(
    "Chạm nút Micro lớn bên dưới để nói tên bài muốn học.",
  );
  const [ttsState, setTtsState] = useState<"stopped" | "playing" | "paused">(
    "stopped",
  );
  const [ttsTarget, setTtsTarget] = useState<string>("");
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [listeningMode, setListeningMode] = useState<"none" | "search" | "ask">(
    "none",
  );

  // Ask AI state (preserved across tab switches for the same lesson)
  const [askInput, setAskInput] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askAnswer, setAskAnswer] = useState<AskAnswerState | null>(null);

  // Quiz state (preserved across tab switches for the same lesson)
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizChoices, setQuizChoices] = useState<Record<string, number>>({});

  // Progress synced with suhoc-progress-v1
  const [activeUserId, setActiveUserId] = useState("student-1");
  const [allProgress, setAllProgress] = useState<
    Record<string, Record<string, Progress>>
  >({});

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const loadSeqRef = useRef(0);
  const askSeqRef = useRef(0);
  const mainRef = useRef<HTMLElement | null>(null);
  const askResultRef = useRef<HTMLDivElement | null>(null);
  const mergedLessonsRef = useRef<Lesson[]>(mergedLessons);
  const activeLessonRef = useRef<MobileLessonDetail | null>(activeLesson);
  const rateRef = useRef(rate);

  useEffect(() => {
    mergedLessonsRef.current = mergedLessons;
  }, [mergedLessons]);

  useEffect(() => {
    activeLessonRef.current = activeLesson;
  }, [activeLesson]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setTtsState("stopped");
    setTtsTarget("");
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* Ignore recognition stop errors. */
    }
    recognitionRef.current = null;
    setListeningMode("none");
  }, []);

  const speakText = useCallback(
    (text: string, target: string, onEnd?: () => void) => {
      const clean = text.trim();
      if (!clean) return;
      stopListening();
      stopSpeech();
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setStatusMessage(
          "Trình duyệt này không hỗ trợ giọng đọc tự động (TTS). Bạn vẫn có thể đọc chữ lớn hoặc dùng trình đọc màn hình.",
        );
        return;
      }
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "vi-VN";
      utterance.rate = Number(rateRef.current) || 1;
      utterance.onstart = () => {
        setTtsState("playing");
        setTtsTarget(target);
      };
      utterance.onend = () => {
        setTtsState("stopped");
        setTtsTarget("");
        onEnd?.();
      };
      utterance.onerror = () => {
        setTtsState("stopped");
        setTtsTarget("");
      };
      window.speechSynthesis.speak(utterance);
    },
    [stopListening, stopSpeech],
  );

  const savePrefs = useCallback(
    (next: { large: boolean; contrast: boolean; rate: string }) => {
      writeStored(MOBILE_PREFS_KEY, next);
    },
    [],
  );

  const updateLessonProgress = useCallback(
    (lessonId: string, updater: (prev: Progress) => Progress) => {
      setAllProgress((current) => {
        const userMap = current[activeUserId] ?? {};
        const prev: Progress = userMap[lessonId] ?? {
          completedSectionIds: [],
          updatedAt: new Date().toISOString(),
        };
        const updated: Progress = {
          ...updater(prev),
          updatedAt: new Date().toISOString(),
        };
        const nextAll = {
          ...current,
          [activeUserId]: {
            ...userMap,
            [lessonId]: updated,
          },
        };
        writeStored("suhoc-progress-v1", nextAll);
        return nextAll;
      });
    },
    [activeUserId],
  );

  const openMobileLesson = useCallback(
    async (
      lessonId: string,
      options?: {
        voiceQuery?: string;
        targetSectionId?: string;
        autoSpeak?: boolean;
        switchToStudy?: boolean;
      },
    ) => {
      const seq = ++loadSeqRef.current;
      stopListening();
      stopSpeech();
      setLoadingLesson(true);

      const isSameLesson = activeLessonRef.current?.id === lessonId;
      let apiDetail: MobileLessonDetail | null = null;

      try {
        const res = await fetch(
          `/api/mobile/lessons/${encodeURIComponent(lessonId)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          apiDetail = (await res.json()) as MobileLessonDetail;
        }
      } catch {
        /* Fallback to local storage / initial data below. */
      }

      if (seq !== loadSeqRef.current) return;

      const localPublished = readLocalPublishedLessons();
      const localLesson =
        localPublished.find((l) => l.id === lessonId) ??
        initialLessons.find((l) => l.id === lessonId);
      const resolved = resolveMobileLessonDetail(apiDetail, localLesson);

      setLoadingLesson(false);
      if (!resolved) {
        const msg =
          "Không tải được nội dung bài học này. Bạn vui lòng chọn bài khác.";
        setStatusMessage(msg);
        if (options?.autoSpeak) speakText(msg, "status");
        return;
      }

      let nextSectionIndex = 0;
      if (options?.targetSectionId) {
        const foundIdx = resolved.sections.findIndex(
          (s) => s.id === options.targetSectionId,
        );
        if (foundIdx >= 0) nextSectionIndex = foundIdx;
      } else if (options?.voiceQuery) {
        const matched = findBestMatchingSection(
          toLessonFromMobileDetail(resolved),
          options.voiceQuery,
        );
        if (matched) {
          const foundIdx = resolved.sections.findIndex(
            (s) => s.id === matched.id,
          );
          if (foundIdx >= 0) nextSectionIndex = foundIdx;
        }
      }

      setActiveLesson(resolved);
      setSectionIndex(nextSectionIndex);

      if (!isSameLesson) {
        askSeqRef.current += 1;
        setAskBusy(false);
        setAskInput("");
        setAskAnswer(null);
        setQuizIndex(0);
        setQuizChoices({});
      }

      if (options?.switchToStudy !== false) {
        setTab("study");
        requestAnimationFrame(() => {
          mainRef.current?.focus();
          mainRef.current?.scrollTo({ top: 0 });
        });
      }

      const sec = resolved.sections[nextSectionIndex];
      const sectionLabel = sec
        ? `Mục ${sec.code}: ${sec.heading}`
        : resolved.hasReading
          ? ""
          : "Bài này hiện chưa có nội dung đọc.";
      const announcement = sectionLabel
        ? `Đang mở ${formatLessonHeader(resolved)}, ${sectionLabel}.`
        : `Đang mở ${formatLessonHeader(resolved)}.`;

      setStatusMessage(announcement);
      if (options?.autoSpeak) {
        speakText(announcement, "status");
      }
    },
    [speakText, stopListening, stopSpeech],
  );

  // Initial load: restore preferences, progress, localStorage workspace & fetch /api/mobile/lessons
  useEffect(() => {
    let cancelled = false;
    const savedPrefs = readStored(MOBILE_PREFS_KEY, {
      large: false,
      contrast: false,
      rate: "1",
    });
    const savedUser = readStored("suhoc-user-v1", "student-1");
    const savedProgress = readStored<Record<string, Record<string, Progress>>>(
      "suhoc-progress-v1",
      {},
    );

    const timer = setTimeout(() => {
      if (cancelled) return;
      setLarge(Boolean(savedPrefs.large));
      setContrast(Boolean(savedPrefs.contrast));
      if (
        typeof savedPrefs.rate === "string" &&
        SPEECH_RATES.includes(
          savedPrefs.rate as (typeof SPEECH_RATES)[number],
        )
      ) {
        setRate(savedPrefs.rate);
      }
      setActiveUserId(typeof savedUser === "string" ? savedUser : "student-1");
      setAllProgress(savedProgress);
      setSpeechAvailable("speechSynthesis" in window);
    }, 0);

    async function loadCatalog() {
      const localPublished = readLocalPublishedLessons();
      let apiSummaries: MobileLessonSummary[] = [];

      try {
        const res = await fetch("/api/mobile/lessons", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as MobileLessonListResponse;
          if (Array.isArray(data.lessons)) {
            apiSummaries = data.lessons;
          }
        }
      } catch {
        /* Offline fallback below */
      }

      if (cancelled) return;

      if (apiSummaries.length === 0) {
        const fallbackSource =
          localPublished.length > 0 ? localPublished : initialLessons;
        apiSummaries = fallbackSource
          .filter((l) => l.status === "published")
          .map(toMobileLessonSummary);
      }

      const merged = mergeMobileLessonsWithLocal(apiSummaries, localPublished);
      setSummaries(merged.summaries);
      setMergedLessons(merged.lessons);
      setLoadingList(false);

      const firstReadable =
        merged.summaries.find((l) => l.hasReading) ?? merged.summaries[0];
      if (firstReadable) {
        void openMobileLesson(firstReadable.id, {
          autoSpeak: false,
          switchToStudy: false,
        });
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      loadSeqRef.current += 1;
      askSeqRef.current += 1;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      try {
        recognitionRef.current?.stop();
      } catch {
        /* Ignore cleanup errors. */
      }
    };
  }, [openMobileLesson]);

  const handleVoiceSearchMatch = useCallback(
    (transcript: string) => {
      const clean = transcript.trim();
      setSearchQuery(clean);
      const matches = semanticSearchLessons(mergedLessonsRef.current, clean);
      const readableMatches = matches.filter((l) => {
        const found = summaries.find((s) => s.id === l.id);
        return found ? found.hasReading : l.sections.length > 0;
      });
      const best = readableMatches[0] ?? matches[0];
      if (best) {
        void openMobileLesson(best.id, {
          voiceQuery: clean,
          autoSpeak: true,
          switchToStudy: true,
        });
      } else {
        const msg = `Đã nghe "${clean}", nhưng chưa tìm thấy bài học phù hợp. Bạn có thể thử nói từ khóa khác như Tổng khởi nghĩa tháng Tám hoặc Đổi mới.`;
        setStatusMessage(msg);
        speakText(msg, "status");
      }
    },
    [openMobileLesson, speakText, summaries],
  );

  const submitAskQuestion = useCallback(
    async (questionText: string) => {
      const trimmed = questionText.trim();
      const current = activeLessonRef.current;
      if (!current) {
        setStatusMessage("Hãy chọn một bài học trước khi đặt câu hỏi cho AI.");
        return;
      }
      if (!trimmed) {
        setStatusMessage("Hãy nói hoặc nhập câu hỏi bạn muốn hỏi về bài học.");
        return;
      }

      const seq = ++askSeqRef.current;
      stopSpeech();
      setAskBusy(true);
      setAskInput(trimmed);
      setStatusMessage("Đang tìm câu trả lời từ trợ giảng AI…");

      let result: AskAnswerState | null = null;

      try {
        const res = await fetch("/api/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ask_lesson",
            question: trimmed,
            lessonId: current.id,
            lessonTitle: current.title,
            sections: current.sections,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as AskAnswerState;
          if (data && typeof data.text === "string") {
            result = data;
          }
        }
      } catch {
        /* Fallback to local retrieval below */
      }

      if (seq !== askSeqRef.current) return;

      if (!result) {
        const local = askLesson(toLessonFromMobileDetail(current), trimmed);
        result = {
          ...local,
          provider: "local-fallback",
          fallback: true,
          notice:
            "Không kết nối được máy chủ AI, đã chuyển sang truy hồi đoạn nguồn cục bộ.",
        };
      }

      setAskBusy(false);
      setAskAnswer(result);
      setStatusMessage("Đã có câu trả lời. Đang đọc to câu trả lời.");
      requestAnimationFrame(() => askResultRef.current?.focus());
      speakText(result.text, "answer");
    },
    [speakText, stopSpeech],
  );

  function startVoiceRecognition(mode: "search" | "ask") {
    if (listeningMode === mode) {
      stopListening();
      setStatusMessage("Đã dừng thu âm giọng nói.");
      return;
    }

    stopSpeech();
    stopListening();

    const win = window as WindowWithSpeech;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      const msg =
        "Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Bạn có thể nhập chữ vào ô dự phòng bên dưới.";
      setStatusMessage(msg);
      speakText(msg, "status");
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = "vi-VN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListeningMode(mode);
        setStatusMessage(
          mode === "search"
            ? "Đang lắng nghe… Hãy nói tên bài học hoặc sự kiện lịch sử."
            : "Đang lắng nghe câu hỏi… Hãy đọc rõ câu hỏi của bạn.",
        );
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
        setListeningMode("none");
        if (!transcript) {
          const msg = "Chưa nghe rõ nội dung. Bạn vui lòng bấm lại và nói rõ.";
          setStatusMessage(msg);
          speakText(msg, "status");
          return;
        }
        if (mode === "search") {
          handleVoiceSearchMatch(transcript);
        } else {
          void submitAskQuestion(transcript);
        }
      };

      recognition.onerror = (event) => {
        setListeningMode("none");
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          setStatusMessage(
            "Trình duyệt chưa được cấp quyền micro. Hãy cho phép micro hoặc dùng ô nhập chữ dự phòng.",
          );
        } else if (event.error === "no-speech") {
          setStatusMessage(
            "Chưa nghe thấy giọng nói. Bạn hãy bấm lại và nói gần micro.",
          );
        } else {
          setStatusMessage(
            "Không thể thu âm lúc này. Bạn có thể nhập chữ vào ô dự phòng.",
          );
        }
      };

      recognition.onend = () => {
        setListeningMode("none");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setListeningMode("none");
      setStatusMessage(
        "Không khởi động được micro trên thiết bị này. Hãy dùng ô nhập chữ dự phòng.",
      );
    }
  }

  function handleTabChange(nextTab: MobileTab) {
    stopListening();
    stopSpeech();
    setTab(nextTab);
    requestAnimationFrame(() => {
      mainRef.current?.focus();
      mainRef.current?.scrollTo({ top: 0 });
    });
  }

  const currentSections = activeLesson?.sections ?? [];
  const currentSection = currentSections[sectionIndex];
  const currentQuestions = activeLesson?.questions ?? [];
  const currentQuestion = currentQuestions[quizIndex];
  const currentLessonProgress = activeLesson
    ? allProgress[activeUserId]?.[activeLesson.id]
    : undefined;
  const isCurrentSectionDone = Boolean(
    currentSection &&
      currentLessonProgress?.completedSectionIds.includes(currentSection.id),
  );

  function togglePlayCurrentSection() {
    if (!currentSection) return;
    if (ttsTarget === "section" && ttsState === "playing") {
      if ("speechSynthesis" in window) window.speechSynthesis.pause();
      setTtsState("paused");
      setStatusMessage("Đã tạm dừng giọng đọc.");
      return;
    }
    if (ttsTarget === "section" && ttsState === "paused") {
      if ("speechSynthesis" in window) window.speechSynthesis.resume();
      setTtsState("playing");
      setStatusMessage("Tiếp tục đọc bài.");
      return;
    }
    const textToRead = `Mục ${currentSection.code}: ${currentSection.heading}. ${currentSection.studyText || currentSection.body}`;
    setStatusMessage(`Đang đọc Mục ${currentSection.code}: ${currentSection.heading}.`);
    speakText(textToRead, "section", () => {
      if (activeLesson) {
        updateLessonProgress(activeLesson.id, (prev) => ({
          ...prev,
          lastSectionId: currentSection.id,
          completedSectionIds: prev.completedSectionIds.includes(
            currentSection.id,
          )
            ? prev.completedSectionIds
            : [...prev.completedSectionIds, currentSection.id],
        }));
      }
    });
  }

  function goToSection(nextIdx: number) {
    if (nextIdx < 0 || nextIdx >= currentSections.length) return;
    stopSpeech();
    setSectionIndex(nextIdx);
    const sec = currentSections[nextIdx];
    setStatusMessage(`Đã chuyển sang Mục ${sec.code}: ${sec.heading}.`);
    requestAnimationFrame(() => {
      mainRef.current?.focus();
      mainRef.current?.scrollTo({ top: 0 });
    });
  }

  function jumpToSectionById(sectionId: string) {
    if (!activeLesson) return;
    const idx = activeLesson.sections.findIndex((s) => s.id === sectionId);
    stopSpeech();
    stopListening();
    if (idx >= 0) {
      setSectionIndex(idx);
      const sec = activeLesson.sections[idx];
      setStatusMessage(`Đang xem Mục ${sec.code}: ${sec.heading}.`);
    }
    setTab("study");
    requestAnimationFrame(() => {
      mainRef.current?.focus();
      mainRef.current?.scrollTo({ top: 0 });
    });
  }

  function readCurrentQuestionAloud() {
    if (!currentQuestion) return;
    const optionLines = currentQuestion.options
      .map(
        (opt, i) =>
          `Đáp án ${OPTION_LETTERS[i] ?? i + 1}: ${opt}.`,
      )
      .join(" ");
    const fullSpeech = `Câu hỏi số ${quizIndex + 1}: ${currentQuestion.prompt}. ${optionLines}`;
    setStatusMessage(`Đang đọc câu hỏi ${quizIndex + 1} và các đáp án.`);
    speakText(fullSpeech, "quiz-question");
  }

  function handleSelectQuizOption(optionIdx: number) {
    if (!currentQuestion || !activeLesson) return;
    const nextChoices = { ...quizChoices, [currentQuestion.id]: optionIdx };
    setQuizChoices(nextChoices);

    const isCorrect = optionIdx === currentQuestion.correctOptionId;
    const correctLetter =
      OPTION_LETTERS[currentQuestion.correctOptionId] ??
      String(currentQuestion.correctOptionId + 1);
    const correctText =
      currentQuestion.options[currentQuestion.correctOptionId] ?? "";

    const feedbackSpeech = isCorrect
      ? `Chính xác! ${currentQuestion.explanation}`
      : `Chưa đúng. Đáp án đúng là ${correctLetter}: ${correctText}. ${currentQuestion.explanation}`;

    setStatusMessage(
      isCorrect
        ? `Câu ${quizIndex + 1}: Chính xác! ${currentQuestion.explanation}`
        : `Câu ${quizIndex + 1}: Chưa đúng. Đáp án đúng là ${correctLetter}. ${currentQuestion.explanation}`,
    );
    speakText(feedbackSpeech, "quiz-feedback");

    // Persist score if all questions have been answered
    const answeredCount = currentQuestions.filter(
      (q) => nextChoices[q.id] !== undefined,
    ).length;
    if (answeredCount === currentQuestions.length && currentQuestions.length > 0) {
      const score = currentQuestions.filter(
        (q) => nextChoices[q.id] === q.correctOptionId,
      ).length;
      updateLessonProgress(activeLesson.id, (prev) => ({
        ...prev,
        quizScore: score,
      }));
    }
  }

  // Filter lessons for the Home screen
  const searchedIds = searchQuery.trim()
    ? new Set(
        semanticSearchLessons(mergedLessons, searchQuery.trim()).map(
          (l) => l.id,
        ),
      )
    : null;

  const visibleSummaries = summaries.filter((item) => {
    if (searchedIds && !searchedIds.has(item.id)) return false;
    if (!searchQuery.trim() && !showAllLessons && !item.hasReading) return false;
    return true;
  });

  const answeredQuizCount = currentQuestions.filter(
    (q) => quizChoices[q.id] !== undefined,
  ).length;
  const correctQuizCount = currentQuestions.filter(
    (q) => quizChoices[q.id] === q.correctOptionId,
  ).length;

  return (
    <div
      className={`mobile-app-stage ${large ? "large-type" : ""} ${contrast ? "high-contrast" : ""}`}
    >
      <div className="mobile-app-shell">
        <a href="#mobile-main" className="skip-link">
          Bỏ qua điều hướng
        </a>

        <header className="mobile-app-header">
          <div className="mobile-app-header-top">
            <div className="mobile-app-brand">
              <span className="mobile-app-brand-badge" aria-hidden="true">
                <Headphones size={18} />
              </span>
              <span>Học Liệu Số · Mobile</span>
            </div>
            <Link
              href="/"
              className="mobile-app-web-link"
              aria-label="Quay về giao diện Web Kho học liệu"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Bản Web
            </Link>
          </div>

          <div
            className="mobile-app-a11y-bar"
            role="group"
            aria-label="Tùy chỉnh hiển thị nhanh"
          >
            <button
              type="button"
              className="mobile-app-toggle"
              aria-pressed={large}
              aria-label="Bật hoặc tắt chế độ chữ lớn"
              onClick={() => {
                const next = !large;
                setLarge(next);
                savePrefs({ large: next, contrast, rate });
              }}
            >
              <Type size={16} aria-hidden="true" />
              Chữ lớn
            </button>
            <button
              type="button"
              className="mobile-app-toggle"
              aria-pressed={contrast}
              aria-label="Bật hoặc tắt chế độ tương phản cao"
              onClick={() => {
                const next = !contrast;
                setContrast(next);
                savePrefs({ large, contrast: next, rate });
              }}
            >
              <Contrast size={16} aria-hidden="true" />
              Tương phản cao
            </button>
          </div>
        </header>

        <p
          className="mobile-app-status"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>

        <main
          id="mobile-main"
          ref={mainRef}
          tabIndex={-1}
          className="mobile-app-main"
        >
          {tab === "home" && (
            <>
              <div>
                <h1 className="mobile-app-screen-title">
                  Trang chủ Giọng nói
                </h1>
                <p className="mobile-app-subtitle">
                  Nói tên bài học hoặc sự kiện lịch sử để mở thẳng sang mục
                  đọc âm thanh.
                </p>
              </div>

              <button
                type="button"
                className="mobile-app-mic-hero"
                aria-pressed={listeningMode === "search"}
                aria-label={
                  listeningMode === "search"
                    ? "Đang lắng nghe giọng nói, chạm để dừng"
                    : "Chạm để nói bài muốn học bằng giọng nói tiếng Việt"
                }
                onClick={() => startVoiceRecognition("search")}
              >
                {listeningMode === "search" ? (
                  <MicOff size={34} aria-hidden="true" />
                ) : (
                  <Mic size={34} aria-hidden="true" />
                )}
                <span>
                  {listeningMode === "search"
                    ? "Đang lắng nghe… Chạm để dừng"
                    : "Chạm để nói bài muốn học"}
                </span>
                <span className="mobile-app-mic-sub">
                  Nhận diện tiếng Việt · Tự động mở đúng mục bài học
                </span>
              </button>

              <section
                className="mobile-app-card"
                aria-label="Tìm nhanh bằng từ khóa hoặc gợi ý"
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      handleVoiceSearchMatch(searchQuery);
                    }
                  }}
                >
                  <label
                    htmlFor="mobile-search-input"
                    className="mobile-app-label"
                  >
                    Hoặc nhập tên bài / sự kiện lịch sử
                  </label>
                  <div className="mobile-app-search-row">
                    <input
                      id="mobile-search-input"
                      type="search"
                      className="mobile-app-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="VD: Tổng khởi nghĩa tháng Tám, Cây đa Tân Trào…"
                    />
                    <button
                      type="submit"
                      className="mobile-app-btn mobile-app-btn-primary"
                      aria-label="Tìm và mở bài khớp nhất"
                    >
                      <Search size={18} aria-hidden="true" />
                      Tìm
                    </button>
                  </div>
                </form>

                <div
                  className="mobile-app-chips"
                  aria-label="Câu lệnh mẫu để thử nhanh"
                >
                  {[
                    "Tổng khởi nghĩa tháng Tám",
                    "Cây đa Tân Trào",
                    "Đổi mới",
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      className="mobile-app-chip"
                      aria-label={`Thử tìm nhanh: ${sample}`}
                      onClick={() => handleVoiceSearchMatch(sample)}
                    >
                      “{sample}”
                    </button>
                  ))}
                </div>
              </section>

              <section aria-label="Danh sách bài học rút gọn">
                <div className="mobile-app-list-head">
                  <h2>
                    Bài học ({visibleSummaries.length}/{summaries.length})
                  </h2>
                  <button
                    type="button"
                    className="mobile-app-btn"
                    aria-pressed={showAllLessons}
                    aria-label="Bật hoặc tắt hiển thị tất cả bài học kể cả bài chưa có nội dung đọc"
                    onClick={() => setShowAllLessons((v) => !v)}
                  >
                    {showAllLessons ? "Chỉ bài có bản đọc" : "Hiện tất cả bài"}
                  </button>
                </div>

                {loadingList ? (
                  <p className="mobile-app-subtitle">
                    Đang đồng bộ danh sách bài học…
                  </p>
                ) : visibleSummaries.length === 0 ? (
                  <p className="mobile-app-subtitle">
                    Không tìm thấy bài học nào khớp với từ khóa hiện tại.
                  </p>
                ) : (
                  <ul className="mobile-app-lesson-list">
                    {visibleSummaries.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`mobile-app-lesson-card ${activeLesson?.id === item.id ? "is-active" : ""}`}
                          aria-label={`Mở ${formatLessonHeader(item)}, ${item.hasReading ? `${item.sectionCount} mục đọc` : "chưa có nội dung đọc"}`}
                          onClick={() =>
                            void openMobileLesson(item.id, {
                              autoSpeak: true,
                              switchToStudy: true,
                            })
                          }
                        >
                          <span className="mobile-app-lesson-title">
                            {formatLessonHeader(item)}
                          </span>
                          <span className="mobile-app-lesson-meta">
                            {item.subject} {item.grade} ·{" "}
                            {item.hasReading
                              ? `${item.sectionCount} mục đọc`
                              : "Chưa có bản đọc"}
                            {item.questionCount
                              ? ` · ${item.questionCount} câu hỏi`
                              : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {tab === "study" && (
            <>
              {loadingLesson ? (
                <p role="status">Đang tải nội dung bài học…</p>
              ) : !activeLesson ? (
                <section className="mobile-app-card">
                  <h1 className="mobile-app-screen-title">Chưa chọn bài học</h1>
                  <p className="mobile-app-subtitle">
                    Hãy quay lại Trang chủ Giọng nói để nói tên bài hoặc chọn
                    một bài học.
                  </p>
                  <button
                    type="button"
                    className="mobile-app-btn mobile-app-btn-primary mobile-app-btn-lg"
                    onClick={() => handleTabChange("home")}
                  >
                    Về Trang chủ Giọng nói
                  </button>
                </section>
              ) : (
                <>
                  <div>
                    <span className="mobile-app-progress-pill">
                      {currentSections.length > 0 && currentSection
                        ? `Mục ${sectionIndex + 1}/${currentSections.length} · Mã mục ${currentSection.code}`
                        : `${activeLesson.subject} ${activeLesson.grade}`}
                    </span>
                    <h1
                      className="mobile-app-screen-title"
                      style={{ marginTop: 8 }}
                    >
                      {formatLessonHeader(activeLesson)}
                    </h1>
                    {currentSection && (
                      <h2
                        style={{
                          margin: "6px 0 0",
                          fontSize: "1.12em",
                          fontWeight: 700,
                        }}
                      >
                        Mục {currentSection.code}: {currentSection.heading}
                      </h2>
                    )}
                  </div>

                  {currentSection ? (
                    <>
                      <section
                        className="mobile-app-card"
                        aria-label="Điều khiển trình phát âm thanh bài học"
                      >
                        <div className="mobile-app-player-controls">
                          <button
                            type="button"
                            className="mobile-app-btn mobile-app-player-btn"
                            disabled={sectionIndex <= 0}
                            aria-label="Chuyển về mục trước"
                            onClick={() => goToSection(sectionIndex - 1)}
                          >
                            <ArrowLeft size={20} aria-hidden="true" />
                            <span>Mục trước</span>
                          </button>

                          <button
                            type="button"
                            className="mobile-app-btn mobile-app-btn-primary mobile-app-player-btn"
                            aria-pressed={
                              ttsTarget === "section" && ttsState === "playing"
                            }
                            aria-label={
                              ttsTarget === "section" && ttsState === "playing"
                                ? "Tạm dừng đọc mục hiện tại"
                                : ttsTarget === "section" &&
                                    ttsState === "paused"
                                  ? "Tiếp tục đọc mục hiện tại"
                                  : `Nghe mục ${currentSection.code}: ${currentSection.heading}`
                            }
                            onClick={togglePlayCurrentSection}
                          >
                            {ttsTarget === "section" &&
                            ttsState === "playing" ? (
                              <Pause size={22} aria-hidden="true" />
                            ) : (
                              <Play size={22} aria-hidden="true" />
                            )}
                            <span>
                              {ttsTarget === "section" &&
                              ttsState === "playing"
                                ? "Tạm dừng"
                                : ttsTarget === "section" &&
                                    ttsState === "paused"
                                  ? "Tiếp tục"
                                  : "Nghe mục"}
                            </span>
                          </button>

                          <button
                            type="button"
                            className="mobile-app-btn mobile-app-player-btn"
                            disabled={
                              sectionIndex >= currentSections.length - 1
                            }
                            aria-label="Chuyển sang mục tiếp theo"
                            onClick={() => goToSection(sectionIndex + 1)}
                          >
                            <ArrowRight size={20} aria-hidden="true" />
                            <span>Mục sau</span>
                          </button>
                        </div>

                        <div className="mobile-app-search-row">
                          <button
                            type="button"
                            className="mobile-app-btn"
                            style={{ flex: "1 1 140px" }}
                            aria-label="Nghe tóm tắt bài học"
                            onClick={() => {
                              const summarySpeech = `Tóm tắt ${formatLessonHeader(activeLesson)}. ${activeLesson.summary}`;
                              setStatusMessage("Đang đọc tóm tắt bài học.");
                              speakText(summarySpeech, "summary");
                            }}
                          >
                            <Volume2 size={18} aria-hidden="true" />
                            Nghe tóm tắt
                          </button>

                          {ttsState !== "stopped" && (
                            <button
                              type="button"
                              className="mobile-app-btn mobile-app-btn-danger"
                              aria-label="Dừng giọng đọc hiện tại"
                              onClick={() => {
                                stopSpeech();
                                setStatusMessage("Đã dừng giọng đọc.");
                              }}
                            >
                              <Square size={16} aria-hidden="true" />
                              Dừng đọc
                            </button>
                          )}
                        </div>

                        <div>
                          <span className="mobile-app-label">Tốc độ đọc</span>
                          <div
                            className="mobile-app-speed-row"
                            role="group"
                            aria-label="Chọn tốc độ giọng đọc"
                          >
                            {SPEECH_RATES.map((r) => (
                              <button
                                key={r}
                                type="button"
                                className="mobile-app-speed-btn"
                                aria-pressed={rate === r}
                                aria-label={`Tốc độ đọc ${r} lần`}
                                onClick={() => {
                                  setRate(r);
                                  savePrefs({ large, contrast, rate: r });
                                  setStatusMessage(
                                    `Đã đặt tốc độ đọc ${r} lần.`,
                                  );
                                }}
                              >
                                {r}×
                              </button>
                            ))}
                          </div>
                        </div>

                        {!speechAvailable && (
                          <p className="mobile-app-subtitle">
                            Thiết bị này không hỗ trợ Web Speech TTS; bạn có
                            thể đọc trực tiếp bằng chữ lớn hoặc trình đọc màn
                            hình.
                          </p>
                        )}
                      </section>

                      <article
                        className="mobile-app-card"
                        aria-label={`Nội dung học Mục ${currentSection.code}`}
                      >
                        <div className="mobile-app-reading-body">
                          {(currentSection.studyText || currentSection.body)
                            .split(/\n+/)
                            .filter((p) => p.trim())
                            .map((para, idx) => (
                              <p key={`${currentSection.id}-p-${idx}`}>
                                {para}
                              </p>
                            ))}
                        </div>

                        <button
                          type="button"
                          className={`mobile-app-btn mobile-app-btn-full ${isCurrentSectionDone ? "mobile-app-btn-primary" : ""}`}
                          aria-pressed={isCurrentSectionDone}
                          aria-label={`Đánh dấu đã học xong Mục ${currentSection.code}: ${currentSection.heading}`}
                          onClick={() => {
                            updateLessonProgress(activeLesson.id, (prev) => {
                              const exists = prev.completedSectionIds.includes(
                                currentSection.id,
                              );
                              return {
                                ...prev,
                                lastSectionId: currentSection.id,
                                completedSectionIds: exists
                                  ? prev.completedSectionIds.filter(
                                      (id) => id !== currentSection.id,
                                    )
                                  : [
                                      ...prev.completedSectionIds,
                                      currentSection.id,
                                    ],
                              };
                            });
                            setStatusMessage(
                              isCurrentSectionDone
                                ? `Đã bỏ đánh dấu hoàn thành Mục ${currentSection.code}.`
                                : `Đã đánh dấu hoàn thành Mục ${currentSection.code}.`,
                            );
                          }}
                        >
                          <CheckCircle2 size={18} aria-hidden="true" />
                          {isCurrentSectionDone
                            ? "Đã hoàn thành mục này"
                            : "Đánh dấu đã nghe xong mục này"}
                        </button>

                        {currentSection.sourceText?.trim() && (
                          <details className="mobile-app-details">
                            <summary>Xem đối chiếu Nội dung gốc (SGK)</summary>
                            <p style={{ margin: "8px 0 0", lineHeight: 1.65 }}>
                              {currentSection.sourceText}
                            </p>
                          </details>
                        )}
                      </article>

                      {currentSections.length > 1 && (
                        <section
                          className="mobile-app-card"
                          aria-label="Chuyển nhanh giữa các mục trong bài"
                        >
                          <span className="mobile-app-label">
                            Mục lục nhanh của bài
                          </span>
                          <div className="mobile-app-citation-list">
                            {currentSections.map((sec, idx) => (
                              <button
                                key={sec.id}
                                type="button"
                                className={`mobile-app-btn mobile-app-btn-full ${idx === sectionIndex ? "mobile-app-btn-primary" : ""}`}
                                style={{ justifyContent: "flex-start" }}
                                aria-current={
                                  idx === sectionIndex ? "step" : undefined
                                }
                                onClick={() => goToSection(idx)}
                              >
                                Mục {sec.code}: {sec.heading}
                              </button>
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  ) : (
                    <section className="mobile-app-card">
                      <p>
                        Bài học này hiện chưa có nội dung đọc chi tiết. Bạn có
                        thể chọn Bài 6 hoặc Bài 10 ở Trang chủ Giọng nói.
                      </p>
                      <button
                        type="button"
                        className="mobile-app-btn mobile-app-btn-primary mobile-app-btn-lg"
                        onClick={() => handleTabChange("home")}
                      >
                        Chọn bài khác
                      </button>
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {tab === "ask" && (
            <>
              <div>
                <h1 className="mobile-app-screen-title">
                  Hỏi AI bằng giọng nói
                </h1>
                <p className="mobile-app-subtitle">
                  {activeLesson
                    ? `Đang hỏi trong: ${formatLessonHeader(activeLesson)}`
                    : "Chưa có bài học đang mở."}
                </p>
              </div>

              {!activeLesson ? (
                <section className="mobile-app-card">
                  <p>
                    Hãy chọn một bài học có nội dung đọc trước khi đặt câu hỏi.
                  </p>
                  <button
                    type="button"
                    className="mobile-app-btn mobile-app-btn-primary mobile-app-btn-lg"
                    onClick={() => handleTabChange("home")}
                  >
                    Về Trang chủ chọn bài
                  </button>
                </section>
              ) : (
                <>
                  <button
                    type="button"
                    className="mobile-app-mic-hero"
                    style={{ minHeight: 84 }}
                    aria-pressed={listeningMode === "ask"}
                    aria-label={
                      listeningMode === "ask"
                        ? "Đang nghe câu hỏi, chạm để dừng"
                        : "Chạm để nói câu hỏi gửi trợ giảng AI"
                    }
                    onClick={() => startVoiceRecognition("ask")}
                  >
                    {listeningMode === "ask" ? (
                      <MicOff size={28} aria-hidden="true" />
                    ) : (
                      <Mic size={28} aria-hidden="true" />
                    )}
                    <span>
                      {listeningMode === "ask"
                        ? "Đang nghe câu hỏi… Chạm để dừng"
                        : "Chạm để nói câu hỏi"}
                    </span>
                  </button>

                  <section
                    className="mobile-app-card"
                    aria-label="Nhập câu hỏi bằng văn bản"
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitAskQuestion(askInput);
                      }}
                    >
                      <label
                        htmlFor="mobile-ask-input"
                        className="mobile-app-label"
                      >
                        Hoặc gõ câu hỏi về bài học
                      </label>
                      <textarea
                        id="mobile-ask-input"
                        className="mobile-app-textarea"
                        value={askInput}
                        onChange={(e) => setAskInput(e.target.value)}
                        placeholder="VD: Sự kiện ở cây đa Tân Trào chiều 16/8/1945 diễn ra như thế nào?"
                      />
                      <button
                        type="submit"
                        disabled={askBusy}
                        className="mobile-app-btn mobile-app-btn-primary mobile-app-btn-full mobile-app-btn-lg"
                        style={{ marginTop: 10 }}
                      >
                        <Sparkles size={18} aria-hidden="true" />
                        {askBusy ? "Đang tìm câu trả lời…" : "Gửi câu hỏi"}
                      </button>
                    </form>
                  </section>

                  {askAnswer && (
                    <section
                      ref={askResultRef}
                      tabIndex={-1}
                      className="mobile-app-card"
                      aria-label="Câu trả lời từ trợ giảng"
                    >
                      <span className="mobile-app-source-badge">
                        {askAnswer.provider === "openrouter" ||
                        askAnswer.mode === "ai_grounded"
                          ? "Trợ giảng AI (OpenRouter)"
                          : "Truy hồi đoạn nguồn (Bộ xử lý cục bộ)"}
                      </span>

                      <p className="mobile-app-answer-text">{askAnswer.text}</p>

                      {askAnswer.notice && (
                        <p className="mobile-app-subtitle">
                          {askAnswer.notice}
                        </p>
                      )}

                      <div className="mobile-app-search-row">
                        <button
                          type="button"
                          className="mobile-app-btn mobile-app-btn-primary"
                          style={{ flex: "1 1 140px" }}
                          aria-label="Nghe lại câu trả lời bằng giọng nói"
                          onClick={() => speakText(askAnswer.text, "answer")}
                        >
                          <Volume2 size={18} aria-hidden="true" />
                          Nghe lại câu trả lời
                        </button>
                        {ttsState !== "stopped" && (
                          <button
                            type="button"
                            className="mobile-app-btn mobile-app-btn-danger"
                            aria-label="Dừng đọc câu trả lời"
                            onClick={() => {
                              stopSpeech();
                              setStatusMessage("Đã dừng đọc câu trả lời.");
                            }}
                          >
                            <Square size={16} aria-hidden="true" />
                            Dừng đọc
                          </button>
                        )}
                      </div>

                      {askAnswer.citations.length > 0 && (
                        <div className="mobile-app-citation-list">
                          <span className="mobile-app-label">
                            Trích dẫn mục nguồn (chạm để mở)
                          </span>
                          {askAnswer.citations.map((cite, idx) => {
                            const sec = activeLesson.sections.find(
                              (s) => s.id === cite.sectionId,
                            );
                            const label = sec
                              ? `Nhảy về Mục ${sec.code}: ${sec.heading}`
                              : `Nhảy về mục nguồn ${idx + 1}`;
                            return (
                              <button
                                key={`${cite.sectionId}-${cite.blockId ?? idx}`}
                                type="button"
                                className="mobile-app-btn mobile-app-btn-full mobile-app-btn-lg"
                                style={{ justifyContent: "flex-start" }}
                                onClick={() =>
                                  jumpToSectionById(cite.sectionId)
                                }
                              >
                                <BookOpen size={18} aria-hidden="true" />
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {askAnswer.suggestedQuestions &&
                        askAnswer.suggestedQuestions.length > 0 && (
                          <div className="mobile-app-citation-list">
                            <span className="mobile-app-label">
                              Câu hỏi gợi ý tiếp theo
                            </span>
                            {askAnswer.suggestedQuestions.map((sq) => (
                              <button
                                key={sq}
                                type="button"
                                className="mobile-app-btn mobile-app-btn-full"
                                style={{ justifyContent: "flex-start", textAlign: "left" }}
                                onClick={() => void submitAskQuestion(sq)}
                              >
                                {sq}
                              </button>
                            ))}
                          </div>
                        )}
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {tab === "quiz" && (
            <>
              <div>
                <h1 className="mobile-app-screen-title">
                  Luyện tập Âm thanh
                </h1>
                <p className="mobile-app-subtitle">
                  {activeLesson
                    ? `${formatLessonHeader(activeLesson)} · ${currentQuestions.length} câu hỏi`
                    : "Chưa có bài học đang mở."}
                </p>
              </div>

              {!activeLesson || currentQuestions.length === 0 ? (
                <section className="mobile-app-card">
                  <p>
                    Bài học hiện tại chưa có câu hỏi luyện tập. Hãy chọn Bài 6
                    hoặc Bài 10 ở Trang chủ để luyện tập bằng âm thanh.
                  </p>
                  <button
                    type="button"
                    className="mobile-app-btn mobile-app-btn-primary mobile-app-btn-lg"
                    onClick={() => handleTabChange("home")}
                  >
                    Về Trang chủ chọn bài
                  </button>
                </section>
              ) : (
                currentQuestion && (
                  <>
                    <section className="mobile-app-card">
                      <span className="mobile-app-progress-pill">
                        Câu {quizIndex + 1}/{currentQuestions.length} · Đã trả
                        lời {answeredQuizCount}/{currentQuestions.length}
                      </span>

                      <div className="mobile-app-search-row">
                        <button
                          type="button"
                          className="mobile-app-btn mobile-app-btn-primary mobile-app-btn-lg"
                          style={{ flex: "1 1 180px" }}
                          aria-label={`Đọc câu hỏi số ${quizIndex + 1} và ${currentQuestion.options.length} đáp án`}
                          onClick={readCurrentQuestionAloud}
                        >
                          <Volume2 size={20} aria-hidden="true" />
                          Đọc câu hỏi & {currentQuestion.options.length} đáp án
                        </button>
                        {ttsState !== "stopped" && (
                          <button
                            type="button"
                            className="mobile-app-btn mobile-app-btn-danger"
                            aria-label="Dừng giọng đọc câu hỏi"
                            onClick={() => {
                              stopSpeech();
                              setStatusMessage("Đã dừng giọng đọc.");
                            }}
                          >
                            <Square size={16} aria-hidden="true" />
                            Dừng
                          </button>
                        )}
                      </div>

                      <fieldset className="mobile-app-quiz-fieldset">
                        <legend className="sr-only">
                          Câu hỏi {quizIndex + 1}: {currentQuestion.prompt}
                        </legend>
                        <p className="mobile-app-quiz-prompt">
                          {currentQuestion.prompt}
                        </p>

                        {currentQuestion.options.map((opt, idx) => {
                          const letter = OPTION_LETTERS[idx] ?? String(idx + 1);
                          const selectedChoice = quizChoices[currentQuestion.id];
                          const hasAnswered = selectedChoice !== undefined;
                          const isSelected = selectedChoice === idx;
                          const isCorrectOption =
                            idx === currentQuestion.correctOptionId;

                          let stateClass = "";
                          if (hasAnswered) {
                            if (isCorrectOption) stateClass = "is-correct";
                            else if (isSelected) stateClass = "is-wrong";
                          }

                          return (
                            <button
                              key={`${currentQuestion.id}-opt-${idx}`}
                              type="button"
                              className={`mobile-app-option-btn ${stateClass}`}
                              aria-pressed={isSelected}
                              aria-label={`Chọn đáp án ${letter}: ${opt}`}
                              onClick={() => handleSelectQuizOption(idx)}
                            >
                              <span
                                className="mobile-app-option-letter"
                                aria-hidden="true"
                              >
                                {letter}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </fieldset>

                      {quizChoices[currentQuestion.id] !== undefined && (
                        <div
                          className={`mobile-app-feedback ${
                            quizChoices[currentQuestion.id] ===
                            currentQuestion.correctOptionId
                              ? "is-ok"
                              : "is-err"
                          }`}
                          role="status"
                        >
                          <strong>
                            {quizChoices[currentQuestion.id] ===
                            currentQuestion.correctOptionId
                              ? "Chính xác!"
                              : `Chưa đúng — Đáp án đúng là ${
                                  OPTION_LETTERS[
                                    currentQuestion.correctOptionId
                                  ] ?? currentQuestion.correctOptionId + 1
                                }.`}
                          </strong>
                          <p style={{ margin: "6px 0 10px" }}>
                            {currentQuestion.explanation}
                          </p>
                          <div className="mobile-app-search-row">
                            <button
                              type="button"
                              className="mobile-app-btn"
                              onClick={() =>
                                speakText(
                                  currentQuestion.explanation,
                                  "quiz-explanation",
                                )
                              }
                            >
                              <Volume2 size={16} aria-hidden="true" />
                              Nghe lại giải thích
                            </button>
                            <button
                              type="button"
                              className="mobile-app-btn"
                              onClick={() =>
                                jumpToSectionById(
                                  currentQuestion.sourceSectionId,
                                )
                              }
                            >
                              <BookOpen size={16} aria-hidden="true" />
                              Xem mục nguồn
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mobile-app-quiz-nav">
                        <button
                          type="button"
                          className="mobile-app-btn mobile-app-btn-lg"
                          disabled={quizIndex <= 0}
                          aria-label="Chuyển về câu hỏi trước"
                          onClick={() => {
                            stopSpeech();
                            setQuizIndex((i) => Math.max(0, i - 1));
                          }}
                        >
                          <ArrowLeft size={18} aria-hidden="true" />
                          Câu trước
                        </button>
                        <button
                          type="button"
                          className="mobile-app-btn mobile-app-btn-primary mobile-app-btn-lg"
                          disabled={quizIndex >= currentQuestions.length - 1}
                          aria-label="Chuyển sang câu hỏi tiếp theo"
                          onClick={() => {
                            stopSpeech();
                            setQuizIndex((i) =>
                              Math.min(currentQuestions.length - 1, i + 1),
                            );
                          }}
                        >
                          Câu tiếp
                          <ArrowRight size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </section>

                    {answeredQuizCount === currentQuestions.length && (
                      <section
                        className="mobile-app-card"
                        aria-label="Tổng kết điểm luyện tập"
                      >
                        <h2 style={{ margin: 0, fontSize: "1.15em" }}>
                          Kết quả luyện tập: {correctQuizCount}/
                          {currentQuestions.length} câu đúng
                        </h2>
                        <button
                          type="button"
                          className="mobile-app-btn mobile-app-btn-full"
                          onClick={() => {
                            stopSpeech();
                            setQuizChoices({});
                            setQuizIndex(0);
                            setStatusMessage("Đã đặt lại bài luyện tập.");
                          }}
                        >
                          <RotateCcw size={18} aria-hidden="true" />
                          Làm lại bài luyện tập
                        </button>
                      </section>
                    )}
                  </>
                )
              )}
            </>
          )}
        </main>

        <nav
          className="mobile-app-bottom-nav"
          aria-label="Điều hướng ứng dụng di động"
        >
          {(
            [
              {
                id: "home",
                label: "Trang chủ",
                ariaLabel: "Trang chủ Giọng nói",
                Icon: Home,
              },
              {
                id: "study",
                label: "Đang học",
                ariaLabel: "Đang học trình phát âm thanh",
                Icon: Headphones,
              },
              {
                id: "ask",
                label: "Hỏi AI",
                ariaLabel: "Hỏi AI bằng giọng nói",
                Icon: HelpCircle,
              },
              {
                id: "quiz",
                label: "Luyện tập",
                ariaLabel: "Luyện tập âm thanh",
                Icon: CheckCircle2,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className="mobile-app-nav-btn"
              aria-current={tab === item.id ? "page" : undefined}
              aria-label={item.ariaLabel}
              onClick={() => handleTabChange(item.id)}
            >
              <item.Icon size={22} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
