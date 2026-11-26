import type { NextRequest } from "next/server";
import { z } from "zod";
import { initialLessons } from "@/app/data/lessons";
import { toMobileLessonDetail } from "@/app/services/content";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

const lessonIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/);

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE_HEADERS });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await context.params;
    let decodedId = resolvedParams.id;
    try {
      decodedId = decodeURIComponent(resolvedParams.id);
    } catch {
      return reply({ error: "Mã bài học trên đường dẫn không hợp lệ." }, 400);
    }

    const parsedId = lessonIdSchema.safeParse(decodedId);
    if (!parsedId.success) {
      return reply({ error: "Mã bài học không hợp lệ." }, 400);
    }

    const lesson = initialLessons.find(
      (item) => item.status === "published" && item.id === parsedId.data,
    );

    if (!lesson) {
      return reply(
        { error: "Không tìm thấy bài học đã công bố tương ứng." },
        404,
      );
    }

    return reply(toMobileLessonDetail(lesson), 200);
  } catch {
    return reply(
      { error: "Không thể tải chi tiết bài học cho Mobile App." },
      500,
    );
  }
}
