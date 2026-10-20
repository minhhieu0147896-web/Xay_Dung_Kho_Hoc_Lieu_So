import { test } from "node:test";
import assert from "node:assert/strict";
import { initialLessons, mergeStoredLessons } from "../app/data/lessons.ts";
import {
  appendText,
  blockText,
  materialize,
  parseLesson,
  publicationIssues,
  publishDraft,
  restoreWorkspace,
  saveDraft,
} from "../app/services/content.ts";
import {
  askLesson,
  searchLessons,
  titleMatches,
  hasReading,
  contentLabel,
  lessonProgressSummary,
} from "../app/services/learning.ts";

test("number searches match exact textbook lesson and title matches start at the beginning", () => {
  for (const query of ["bài 6", "BAI 06", "6"])
    assert.deepEqual(
      searchLessons(initialLessons, query).map((l) => l.id),
      ["cach-mang-thang-tam"],
    );
  assert.equal(titleMatches(sample(), "cach mang thang tam"), true);
  assert.equal(titleMatches(sample(), "Ha Noi"), false);
  assert.deepEqual(searchLessons(initialLessons, "bài 999"), []);
});
test("title results rank before content results; chapter searches remain supported", () => {
  const bodyMatch = sample();
  bodyMatch.title = "Bài đọc khác";
  bodyMatch.textbook.lessonNumber = 99;
  const result = searchLessons([bodyMatch, sample()], "Cách mạng tháng Tám");
  assert.equal(result[0].title, sample().title);
  assert.ok(
    searchLessons(initialLessons, "Chủ đề 4").every((l) =>
      l.chapter.startsWith("Chủ đề 4"),
    ),
  );
});
test("catalog distinguishes readable content, video-only and empty syllabus entries", () => {
  assert.equal(initialLessons.filter(hasReading).length, 2);
  assert.equal(contentLabel(sample()), "Bài đọc mẫu");
  const empty = { ...sample(), sections: [] };
  assert.equal(contentLabel(empty), "Chưa nhập nội dung");
  assert.equal(
    contentLabel({ ...empty, youtubeVideoId: "abcdefghijk" }),
    "Chỉ có video tham khảo",
  );
  assert.equal(
    hasReading({
      ...empty,
      sections: [{ id: "empty", heading: "Mục", body: "  " }],
    }),
    false,
  );
});
const workspace = () => ({
  schemaVersion: 2,
  published: structuredClone(initialLessons),
  drafts: {},
  previous: {},
});
const sample = () => {
  const lesson = structuredClone(
    initialLessons.find((l) => l.id === "cach-mang-thang-tam"),
  );
  lesson.youtubeVideoId = "";
  return lesson;
};
test("draft edits, save/reload and publication are separate snapshots", () => {
  const original = workspace();
  const edited = sample();
  edited.sections[0].blocks[0].text = "Nội dung đã sửa";
  const saved = saveDraft(original, edited);
  assert.equal(original.drafts[edited.id], undefined);
  assert.notEqual(
    saved.published.find((l) => l.id === edited.id).sections[0].blocks[0].text,
    "Nội dung đã sửa",
  );
  const reloaded = restoreWorkspace(JSON.parse(JSON.stringify(saved)));
  assert.equal(
    reloaded.drafts[edited.id].lesson.sections[0].body,
    "Nội dung đã sửa",
  );
  assert.throws(() =>
    publishDraft(reloaded, edited, { source: true, accessibility: false }),
  );
  const result = publishDraft(reloaded, edited, {
    source: true,
    accessibility: true,
  });
  assert.equal(
    result.published.find((l) => l.id === edited.id).sections[0].body,
    "Nội dung đã sửa",
  );
  assert.equal(result.published.find((l) => l.id === edited.id).revision, 1);
  assert.equal(result.drafts[edited.id], undefined);
  assert.equal(
    result.previous[edited.id].sections[0].blocks[0].text,
    original.published.find((l) => l.id === edited.id).sections[0].blocks[0]
      .text,
  );
});
test("legacy body edits survive conversion and keep progress/citation identifiers", () => {
  const old = sample();
  old.sections.forEach((s) => delete s.blocks);
  delete old.provenance;
  old.sections[0].body = "Văn bản đã sửa trên bản cũ";
  const [saved] = mergeStoredLessons([old]).filter((l) => l.id === old.id);
  const migrated = materialize(saved);
  assert.equal(migrated.sections[0].body, old.sections[0].body);
  assert.equal(migrated.sections[0].blocks[0].text, old.sections[0].body);
  assert.equal(migrated.sections[0].id, old.sections[0].id);
});
test("publication detects missing image description, table headers, pages and transcript", () => {
  const lesson = sample();
  lesson.provenance.kind = "textbook";
  lesson.sections[0].blocks.push({
    id: "map1",
    type: "image",
    src: "/map.svg",
    alt: "Bản đồ",
    caption: "",
    complex: true,
    description: "",
  });
  lesson.sections[0].blocks.push({
    id: "table1",
    type: "table",
    caption: "",
    headers: [""],
    rows: [["a", "b"]],
  });
  lesson.youtubeVideoId = "HKNKn-Uc63Q";
  const issues = publicationIssues(lesson).join(" ");
  assert.match(issues, /thiếu trang nguồn/);
  assert.match(issues, /mô tả chi tiết/);
  assert.match(issues, /tiêu đề cột/);
  assert.match(issues, /chép lời/);
  assert.throws(() =>
    publishDraft(workspace(), lesson, { source: true, accessibility: true }),
  );
});
test("import rejects mismatched IDs, broken question references and unsafe image URLs", () => {
  assert.throws(() => parseLesson(sample(), "another-lesson"));
  const lesson = sample();
  lesson.questions[0].sourceSectionId = "missing";
  assert.throws(() => parseLesson(lesson));
  const bad = sample();
  bad.sections[0].blocks.push({
    id: "image",
    type: "image",
    src: "javascript:alert(1)",
    alt: "a",
    caption: "",
    complex: false,
    description: "",
  });
  assert.throws(() => parseLesson(bad));
  const duplicate = sample();
  duplicate.sections[0].blocks.push(duplicate.sections[0].blocks[0]);
  assert.throws(() => parseLesson(duplicate));
});
test("PDF extraction appends draft blocks and distinguishes file pages from printed pages", () => {
  const original = sample();
  const added = appendText(
    original,
    [{ page: 8, text: "Đoạn mới thứ nhất\n\nĐoạn mới thứ hai" }],
    "nguon.pdf",
  );
  assert.equal(original.sections.length, 3);
  assert.equal(added.sections.length, 4);
  assert.equal(added.sections[3].blocks[0].filePage, 8);
  assert.equal(added.sections[3].blocks[0].page, undefined);
  assert.deepEqual(added.sections[0].blocks, original.sections[0].blocks);
  assert.match(publicationIssues(added).join(" "), /phiên bản|trang nguồn/);
});
test("search and retrieval use block content and cite the matching paragraph", () => {
  const lesson = sample();
  lesson.sections[0].blocks = [
    { id: "unrelated", type: "paragraph", text: "Một đoạn khác." },
    {
      id: "source-detail",
      type: "paragraph",
      page: 42,
      text: "Thủ đô Sao Mai có bảy thư viện.",
    },
  ];
  lesson.sections[0].body = "stale text";
  assert.equal(searchLessons([lesson], "Sao Mai").length, 1);
  const answer = askLesson(lesson, "Sao Mai có bao nhiêu thư viện?");
  assert.equal(answer.citations[0].blockId, "source-detail");
  assert.equal(answer.citations[0].page, 42);
  assert.match(answer.text, /bảy thư viện/);
  assert.equal(
    blockText({
      id: "tbl",
      type: "table",
      caption: "Bảng mẫu",
      headers: ["Nơi", "Ngày"],
      rows: [["Hà Nội", "19/8"]],
    }),
    "Bảng mẫu\nNơi: Hà Nội; Ngày: 19/8",
  );
});
test("lessonProgressSummary computes not_started, in_progress and completed states accurately", () => {
  const lesson = sample();
  assert.deepEqual(lessonProgressSummary(lesson), {
    totalSections: 3,
    completedSections: 0,
    totalQuestions: 3,
    quizScore: undefined,
    quizDone: false,
    percent: 0,
    state: "not_started",
    label: "",
  });
  const partial = lessonProgressSummary(lesson, {
    completedSectionIds: ["thang-tam-boi-canh"],
    updatedAt: "2026-10-19T00:00:00Z",
  });
  assert.equal(partial.state, "in_progress");
  assert.equal(partial.percent, 25);
  assert.equal(partial.label, "Đang học: Đã đọc 1/3 mục");
  const full = lessonProgressSummary(lesson, {
    completedSectionIds: lesson.sections.map((s) => s.id),
    quizScore: 3,
    updatedAt: "2026-10-19T00:00:00Z",
  });
  assert.equal(full.state, "completed");
  assert.equal(full.percent, 100);
  assert.equal(full.label, "Đã hoàn thành (Đã đọc 3/3 mục · Luyện tập 3/3)");
});
