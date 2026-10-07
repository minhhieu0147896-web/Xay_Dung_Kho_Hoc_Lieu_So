import test from "node:test";
import assert from "node:assert/strict";
import {
  initialLessons,
  sampleLessons,
  mergeStoredLessons,
} from "../app/data/lessons.ts";
import { askLesson, searchLessons } from "../app/services/learning.ts";

test("upgrading the old demo preserves edits, draft status and citation IDs", () => {
  const edited = {
    ...structuredClone(sampleLessons[0]),
    title: "Bài đã biên tập",
    status: "draft",
  };
  edited.sections[0].body = "Nội dung người dùng đã sửa";
  const merged = mergeStoredLessons([edited, sampleLessons[1]]);
  assert.equal(merged.length, 17);
  const migrated = merged.find((l) => l.id === edited.id);
  assert.equal(migrated.title, edited.title);
  assert.equal(migrated.status, "draft");
  assert.deepEqual(migrated.sections, edited.sections);
  assert.equal(migrated.textbook.lessonNumber, 6);
  assert.equal(
    merged.find((l) => l.id === "doi-moi").textbook.lessonNumber,
    10,
  );
  assert.equal(searchLessons(merged, "Bài đã biên tập").length, 0);
});

test("upgrading does not duplicate new lessons or overwrite an edited textbook", () => {
  const first = mergeStoredLessons(sampleLessons);
  first[0].youtubeVideoId = "";
  first[0].title = "Tiêu đề tùy chỉnh";
  const second = mergeStoredLessons(first);
  assert.equal(new Set(second.map((l) => l.id)).size, 17);
  assert.equal(second[0].youtubeVideoId, "");
  assert.equal(second[0].title, "Tiêu đề tùy chỉnh");
  assert.deepEqual(second, first);
});

test("textbook search still reaches the original source paragraph without accents", () => {
  const found = searchLessons(initialLessons, "Ha Noi");
  assert.equal(found.length, 1);
  assert.equal(found[0].textbook.lessonNumber, 6);
  const answer = askLesson(found[0], "Hà Nội giành chính quyền ngày nào?");
  assert.equal(answer.status, "ok");
  for (const citation of answer.citations) {
    assert.ok(
      found[0].sections.some((section) => section.id === citation.sectionId),
    );
  }
});

test("lessons awaiting content do not fabricate answers or quiz questions", () => {
  const empty = initialLessons.filter((l) => !l.sections.length);
  assert.equal(empty.length, 15);
  for (const lesson of empty) {
    assert.equal(lesson.questions.length, 0);
    assert.equal(
      askLesson(lesson, "Bài học này nói gì?").status,
      "insufficient_evidence",
    );
  }
});
