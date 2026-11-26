import { blocksOf, blockText, sectionText } from "./content.ts";
import type { Answer, Lesson, Progress, Section } from "../data/lessons";

const SEARCH_STOPWORDS = new Set([
  "la",
  "gi",
  "nao",
  "tai",
  "sao",
  "cua",
  "va",
  "cho",
  "toi",
  "muon",
  "xem",
  "tim",
  "hieu",
  "biet",
  "hay",
  "trong",
  "co",
  "khong",
  "nhung",
  "cac",
  "duoc",
  "ve",
  "khi",
  "o",
  "mot",
  "the",
  "thu",
  "bao",
  "nhieu",
  "bai",
  "hoc",
  "phan",
  "muc",
  "chu",
  "de",
  "su",
  "kien",
  "dien",
  "ra",
  "nhu",
  "voi",
  "tu",
  "den",
  "mo",
  "doc",
  "nghe",
  "giup",
  "em",
  "minh",
]);

const SEMANTIC_CONCEPTS: { triggers: string[]; expansions: string[] }[] = [
  {
    triggers: [
      "lien hop quoc",
      "lhq",
      "hoa binh",
      "an ninh the gioi",
      "sau the chien 2",
      "sau chien tranh the gioi thu hai",
      "hoi nghi ianta",
      "ianta",
      "i-an-ta",
      "san francisco",
      "hien chuong",
      "to chuc giu hoa binh",
      "to chuc giu gin hoa binh",
    ],
    expansions: [
      "lien hop quoc",
      "hien chuong",
      "i-an-ta",
      "ianta",
      "hoa binh",
      "an ninh the gioi",
    ],
  },
  {
    triggers: [
      "tong khoi nghia",
      "thang tam",
      "cach mang thang tam",
      "cay da tan trao",
      "tan trao",
      "quan lenh so 1",
      "vo nguyen giap",
      "giai phong quan",
      "tuyen ngon doc lap",
      "ba dinh",
      "nhat dau hang",
      "nhat ban dau hang",
      "16/8",
      "19/8",
      "2/9",
      "gianh chinh quyen",
    ],
    expansions: [
      "cach mang thang tam",
      "tong khoi nghia",
      "tan trao",
      "quan lenh so 1",
      "tuyen ngon doc lap",
      "nhat ban dau hang",
      "ba dinh",
    ],
  },
  {
    triggers: [
      "doi moi",
      "dai hoi vi",
      "dai hoi 6",
      "1986",
      "bao cap",
      "kinh te thi truong",
      "dinh huong xa hoi chu nghia",
      "mo cua",
      "hoi nhap",
      "kinh te hang hoa",
      "nhieu thanh phan",
    ],
    expansions: [
      "doi moi",
      "1986",
      "dai hoi vi",
      "bao cap",
      "kinh te thi truong",
      "hang hoa nhieu thanh phan",
    ],
  },
  {
    triggers: ["chien tranh lanh", "hai cuc", "da cuc", "trat tu the gioi"],
    expansions: ["chien tranh lanh", "trat tu the gioi"],
  },
  {
    triggers: ["asean", "dong nam a", "cong dong asean"],
    expansions: ["asean", "dong nam a"],
  },
  {
    triggers: ["khang chien chong phap", "dien bien phu", "1954"],
    expansions: ["chong thuc dan phap"],
  },
  {
    triggers: ["khang chien chong my", "1975", "thong nhat dat nuoc"],
    expansions: ["chong my"],
  },
  {
    triggers: ["ho chi minh", "bac ho", "nguyen ai quoc"],
    expansions: ["ho chi minh"],
  },
];

function extractQueryTokens(term: string) {
  return [...new Set(term.match(/[a-z0-9]+/g) ?? [])].filter(
    (t) => !SEARCH_STOPWORDS.has(t) && (t.length > 1 || /^\d+$/.test(t)),
  );
}

function getSemanticExpansions(term: string) {
  const expanded = new Set<string>();
  for (const concept of SEMANTIC_CONCEPTS) {
    if (concept.triggers.some((tr) => term.includes(tr))) {
      for (const exp of concept.expansions) expanded.add(exp);
    }
  }
  return [...expanded];
}

function sectionHaystack(section: Section) {
  return normalize(
    [
      section.code ?? "",
      section.heading,
      sectionText(section),
      section.sourceText ?? "",
      ...(section.keywords ?? []),
    ].join(" "),
  );
}

function scoreSectionMatch(section: Section, query: string): number {
  const term = normalize(query.trim());
  if (!term) return 0;

  const headingNorm = normalize(section.heading);
  const keywordsNorm = normalize((section.keywords ?? []).join(" "));
  const bodyNorm = normalize(
    `${sectionText(section)} ${section.sourceText ?? ""}`,
  );
  const fullNorm = sectionHaystack(section);
  const fullWords = new Set(fullNorm.match(/[a-z0-9]+/g) ?? []);

  let score = 0;
  if (section.code && normalize(section.code) === term) score += 16;
  if (headingNorm.includes(term)) score += 12;
  if (keywordsNorm && keywordsNorm.includes(term)) score += 10;
  if (bodyNorm.includes(term)) score += 8;

  const expansions = getSemanticExpansions(term);
  for (const exp of expansions) {
    if (fullNorm.includes(exp)) {
      score += 4;
      if (headingNorm.includes(exp) || keywordsNorm.includes(exp)) score += 2;
    }
  }

  const tokens = extractQueryTokens(term);
  const hasWordToken = tokens.some((t) => /[a-z]/.test(t));
  if (tokens.length > 0 && hasWordToken) {
    const matchedTokens = tokens.filter((t) => fullWords.has(t));
    const numericTokens = tokens.filter((t) => /^\d+$/.test(t));
    const numbersOk =
      numericTokens.length === 0 ||
      numericTokens.every((n) => fullWords.has(n));
    if (numbersOk) {
      if (tokens.length <= 2 && matchedTokens.length === tokens.length) {
        score += matchedTokens.length * 4;
      } else if (
        matchedTokens.length >= Math.max(2, Math.ceil(tokens.length * 0.5))
      ) {
        score += matchedTokens.length * 3;
      }
    }
  }

  return score;
}

export function findBestMatchingSection(
  lesson: Lesson,
  query: string,
): Section | undefined {
  if (!query.trim() || !lesson.sections.length) return undefined;
  let best: Section | undefined;
  let bestScore = 0;
  for (const section of lesson.sections) {
    const score = scoreSectionMatch(section, query);
    if (score > bestScore) {
      bestScore = score;
      best = section;
    }
  }
  return bestScore > 0 ? best : undefined;
}

export function semanticSearchLessons(lessons: Lesson[], query: string) {
  const term = normalize(query.trim());
  const numberOnly = /^(?:bai\s*)?\d+$/.test(term);
  const chapterOnly = /^chu\s+de\s+\d+$/.test(term);
  const expansions = term ? getSemanticExpansions(term) : [];
  const tokens = term ? extractQueryTokens(term) : [];
  const hasWordToken = tokens.some((t) => /[a-z]/.test(t));
  const numericTokens = tokens.filter((t) => /^\d+$/.test(t));
  const explicitLessonMatch = term.match(/(?:^|\s)bai\s+0*(\d+)(?:\s|$)/);
  const explicitLessonNum = explicitLessonMatch
    ? Number(explicitLessonMatch[1])
    : null;

  return lessons
    .filter((l) => l.status === "published")
    .map((lesson, index) => {
      if (!term) return { lesson, index, score: 100 };
      if (titleMatches(lesson, query)) return { lesson, index, score: 100 };
      if (numberOnly) return { lesson, index, score: 0 };
      if (
        explicitLessonNum !== null &&
        lesson.textbook?.lessonNumber === explicitLessonNum
      ) {
        return { lesson, index, score: 90 };
      }

      const chapterNorm = normalize(lesson.chapter);
      if (chapterNorm.includes(term)) return { lesson, index, score: 70 };
      if (chapterOnly) return { lesson, index, score: 0 };

      const contentNorm = normalize(
        [
          lesson.summary,
          ...lesson.sections.map((s) => sectionHaystack(s)),
        ].join(" "),
      );
      if (contentNorm.includes(term)) return { lesson, index, score: 50 };

      const titleAndSummaryNorm = normalize(
        `${lesson.title} ${lesson.chapter} ${lesson.summary}`,
      );
      const fullNorm = `${titleAndSummaryNorm} ${contentNorm}`;
      const fullWords = new Set(fullNorm.match(/[a-z0-9]+/g) ?? []);

      let semanticScore = 0;
      for (const exp of expansions) {
        if (titleAndSummaryNorm.includes(exp)) semanticScore += 12;
        else if (contentNorm.includes(exp)) semanticScore += 8;
      }

      const bestSec = findBestMatchingSection(lesson, query);
      if (bestSec) {
        semanticScore += Math.min(20, scoreSectionMatch(bestSec, query));
      }

      if (tokens.length > 0 && hasWordToken) {
        const numbersOk =
          numericTokens.length === 0 ||
          numericTokens.every((n) => fullWords.has(n));
        const matchedTokens = tokens.filter((t) => fullWords.has(t));
        if (numbersOk) {
          if (tokens.length <= 2 && matchedTokens.length === tokens.length) {
            semanticScore += matchedTokens.length * 6;
          } else if (
            matchedTokens.length >= Math.max(2, Math.ceil(tokens.length * 0.5))
          ) {
            semanticScore += matchedTokens.length * 4;
          }
        }
      }

      return { lesson, index, score: semanticScore };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.lesson);
}

export type LearningPathItem = {
  section: Section;
  reason: string;
  wrongCount?: number;
};

export type PersonalLearningPath = {
  masteredSections: LearningPathItem[];
  reviewSections: LearningPathItem[];
  recommendedSection?: Section;
  nextStepLabel: string;
};

export function buildPersonalLearningPath(
  lesson: Lesson,
  progress?: Progress,
  choices?: Record<string, number>,
  submitted?: boolean,
): PersonalLearningPath {
  const masteredSections: LearningPathItem[] = [];
  const reviewSections: LearningPathItem[] = [];
  const completedIds = new Set(progress?.completedSectionIds ?? []);

  for (const section of lesson.sections) {
    const isRead = completedIds.has(section.id);
    const linkedQuestions = lesson.questions.filter(
      (q) => q.sourceSectionId === section.id,
    );

    if (submitted && choices && linkedQuestions.length > 0) {
      const wrongCount = linkedQuestions.filter(
        (q) => choices[q.id] !== q.correctOptionId,
      ).length;
      const rightCount = linkedQuestions.length - wrongCount;

      if (wrongCount > 0) {
        reviewSections.push({
          section,
          wrongCount,
          reason: `Cần củng cố: trả lời chưa chính xác ${wrongCount}/${linkedQuestions.length} câu luyện tập thuộc mục này.`,
        });
      } else if (!isRead) {
        reviewSections.push({
          section,
          wrongCount: 0,
          reason: `Đã trả lời đúng ${rightCount}/${linkedQuestions.length} câu, nên đọc lại và đánh dấu hoàn thành mục.`,
        });
      } else {
        masteredSections.push({
          section,
          reason: `Đã đọc và trả lời đúng ${rightCount}/${linkedQuestions.length} câu luyện tập.`,
        });
      }
    } else if (isRead) {
      masteredSections.push({
        section,
        reason: "Đã hoàn thành đọc mục này.",
      });
    } else {
      reviewSections.push({
        section,
        wrongCount: 0,
        reason: "Chưa đánh dấu hoàn thành đọc mục này.",
      });
    }
  }

  reviewSections.sort((a, b) => (b.wrongCount ?? 0) - (a.wrongCount ?? 0));
  const recommendedSection = reviewSections[0]?.section;

  let nextStepLabel = "Bài học này chưa có nội dung đọc.";
  if (recommendedSection) {
    const codeLabel = recommendedSection.code
      ? `Mục ${recommendedSection.code}`
      : recommendedSection.heading;
    nextStepLabel =
      (reviewSections[0]?.wrongCount ?? 0) > 0
        ? `Ưu tiên ôn lại ${codeLabel}: ${recommendedSection.heading}.`
        : `Tiếp tục đọc ${codeLabel}: ${recommendedSection.heading}.`;
  } else if (
    lesson.sections.length > 0 &&
    lesson.questions.length > 0 &&
    progress?.quizScore === undefined &&
    !submitted
  ) {
    nextStepLabel = `Bạn đã đọc đủ ${lesson.sections.length} mục. Hãy làm ${lesson.questions.length} câu luyện tập để kiểm tra kiến thức.`;
  } else if (lesson.sections.length > 0) {
    nextStepLabel =
      "Bạn đã nắm vững toàn bộ các mục của bài học này. Có thể chuyển sang bài học tiếp theo.";
  }

  return {
    masteredSections,
    reviewSections,
    recommendedSection,
    nextStepLabel,
  };
}
export function lessonProgressSummary(lesson: Lesson, progress?: Progress) {
  const totalSections = lesson.sections.length;
  const completedSections = lesson.sections.filter((s) =>
    progress?.completedSectionIds.includes(s.id),
  ).length;
  const totalQuestions = lesson.questions.length;
  const quizDone = totalQuestions > 0 && progress?.quizScore !== undefined;
  const totalSteps = totalSections + (totalQuestions > 0 ? 1 : 0);
  const completedSteps = completedSections + (quizDone ? 1 : 0);
  const percent =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const state: "completed" | "in_progress" | "not_started" =
    totalSteps > 0 && completedSteps === totalSteps
      ? "completed"
      : completedSteps > 0
        ? "in_progress"
        : "not_started";
  const parts: string[] = [];
  if (totalSections > 0 && (completedSections > 0 || quizDone))
    parts.push(`Đã đọc ${completedSections}/${totalSections} mục`);
  if (quizDone) parts.push(`Luyện tập ${progress?.quizScore}/${totalQuestions}`);
  return {
    totalSections,
    completedSections,
    totalQuestions,
    quizScore: progress?.quizScore,
    quizDone,
    percent,
    state,
    label:
      state === "completed"
        ? `Đã hoàn thành (${parts.join(" · ")})`
        : state === "in_progress"
          ? `Đang học: ${parts.join(" · ")}`
          : "",
  };
}
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}
export function titleMatches(lesson: Lesson, query: string) {
  const term = normalize(query.trim());
  const number = term.match(/^(?:bai\s*)?0*(\d+)$/);
  return number
    ? lesson.textbook?.lessonNumber === Number(number[1])
    : normalize(
        `Bài ${lesson.textbook?.lessonNumber ?? ""} ${lesson.title}`,
      ).includes(term);
}
export function hasReading(lesson: Lesson) {
  return lesson.sections.some((s) => sectionText(s).trim().length > 0);
}
export function hasVideo(lesson: Lesson) {
  return (
    /^[a-zA-Z0-9_-]{11}$/.test(lesson.youtubeVideoId ?? "") ||
    Boolean(lesson.videoUrl?.trim())
  );
}
export function contentLabel(lesson: Lesson) {
  if (hasReading(lesson))
    return lesson.provenance?.kind === "demo" || !lesson.provenance
      ? "Bài đọc mẫu"
      : "Có bài đọc";
  return hasVideo(lesson) ? "Chỉ có video tham khảo" : "Chưa nhập nội dung";
}
export function searchLessons(lessons: Lesson[], query: string) {
  return semanticSearchLessons(lessons, query);
}
export function askLesson(lesson: Lesson, question: string): Answer {
  const stop = new Set([
    "la",
    "gi",
    "nao",
    "tai",
    "sao",
    "cua",
    "va",
    "cho",
    "toi",
    "biet",
    "hay",
    "trong",
    "co",
    "khong",
    "nhung",
    "cac",
    "duoc",
    "ve",
    "khi",
    "o",
    "mot",
    "the",
    "thu",
    "bao",
    "nhieu",
  ]);
  const tokens = [
    ...new Set(normalize(question).match(/[a-z0-9]+/g) ?? []),
  ].filter((t) => !stop.has(t) && t.length > 1);
  const ranked = lesson.sections
    .flatMap((section) =>
      blocksOf(section).map((block) => ({
        section,
        block,
        score: tokens.filter((token) =>
          normalize(
            section.heading +
              " " +
              blockText(block) +
              " " +
              lesson.questions
                .filter((q) => q.sourceSectionId === section.id)
                .map((q) => q.prompt)
                .join(" "),
          )
            .split(/\W+/)
            .includes(token),
        ).length,
      })),
    )
    .sort((a, b) => b.score - a.score);
  const match = ranked[0];
  if (
    !tokens.length ||
    !match ||
    match.score < Math.max(2, Math.ceil(tokens.length * 0.65))
  )
    return {
      text: "Chưa đủ thông tin trong bài học để trả lời câu hỏi này. Bạn có thể xem mục lục hoặc hỏi về một nội dung cụ thể của bài.",
      citations: [],
      mode: "retrieval",
      status: "insufficient_evidence",
    };
  return {
    text: blockText(match.block),
    citations: [
      {
        lessonId: lesson.id,
        sectionId: match.section.id,
        blockId: match.block.id,
        page: match.block.page,
        excerpt: blockText(match.block),
      },
    ],
    mode: "retrieval",
    status: "ok",
  };
}
export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
