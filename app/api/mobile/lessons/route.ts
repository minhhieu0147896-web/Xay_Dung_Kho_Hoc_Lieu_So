import type { NextRequest } from "next/server";
import { z } from "zod";
import type { MobileLessonListResponse } from "@/app/data/content";
import { initialLessons } from "@/app/data/lessons";
import { toMobileLessonSummary } from "@/app/services/content";
import {
  hasReading,
  normalize,
  semanticSearchLessons,
} from "@/app/services/learning";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

const querySchema = z.object({
  subject: z.string().trim().max(200).optional(),
  grade: z.coerce.number().int().min(1).max(12).optional(),
  onlyReadable: z.enum(["true", "false", "1", "0"]).optional(),
  q: z.string().trim().max(500).optional(),
});

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const parsedQuery = querySchema.safeParse({
      subject: sp.get("subject") ?? undefined,
      grade: sp.get("grade") ?? undefined,
      onlyReadable: sp.get("onlyReadable") ?? undefined,
      q: sp.get("q") ?? undefined,
    });

    if (!parsedQuery.success) {
      return reply(
        {
          error: "Tham số truy vấn danh sách bài học không hợp lệ.",
        },
        400,
      );
    }

    const { subject, grade, onlyReadable, q } = parsedQuery.data;

    let publishedLessons = initialLessons.filter(
      (lesson) => lesson.status === "published",
    );

    if (subject) {
      const targetSubject = normalize(subject);
      publishedLessons = publishedLessons.filter(
        (lesson) => normalize(lesson.subject) === targetSubject,
      );
    }

    if (typeof grade === "number") {
      publishedLessons = publishedLessons.filter(
        (lesson) => lesson.grade === grade,
      );
    }

    if (onlyReadable === "true" || onlyReadable === "1") {
      publishedLessons = publishedLessons.filter(hasReading);
    }

    if (q) {
      publishedLessons = semanticSearchLessons(publishedLessons, q);
    }

    const lessons = publishedLessons.map(toMobileLessonSummary);
    const payload: MobileLessonListResponse = {
      lessons,
      total: lessons.length,
      readableCount: lessons.filter((item) => item.hasReading).length,
      generatedAt: new Date().toISOString(),
    };

    return reply(payload, 200);
  } catch {
    return reply(
      { error: "Không thể tải danh sách bài học cho Mobile App." },
      500,
    );
  }
}
