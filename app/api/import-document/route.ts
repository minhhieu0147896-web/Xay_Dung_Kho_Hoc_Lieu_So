import { getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export const runtime = "nodejs";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_TEXT = 150000;
const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

// Local-demo extractor only. No persistent uploads and no outbound document service.
// Production needs authenticated teacher authorization before enabling this route.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production")
    return reply(
      {
        error:
          "Nhập PDF/Word hiện chỉ mở ở bản chạy cục bộ (npm run dev). Bản triển khai cần xác thực giáo viên.",
      },
      403,
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return reply({ error: "Nguồn yêu cầu không hợp lệ." }, 403);
  const format = request.headers.get("x-document-format");
  if (format !== "pdf" && format !== "docx")
    return reply({ error: "Chỉ hỗ trợ PDF và DOCX ở bộ trích xuất này." }, 415);
  if (Number(request.headers.get("content-length")) > MAX_BYTES)
    return reply({ error: "Tệp vượt quá 10 MB." }, 413);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Chưa nhận được tệp." }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return reply({ error: "Tệp vượt quá 10 MB." }, 413);
      }
      chunks.push(value);
    }
    const data = Buffer.concat(chunks);
    if (format === "docx") {
      if (data.subarray(0, 2).toString() !== "PK")
        return reply({ error: "Tệp không phải DOCX hợp lệ." }, 400);
      const { value } = await mammoth.extractRawText({ buffer: data });
      if (!value.trim())
        return reply(
          {
            error:
              "Tệp Word không có văn bản đọc được. Hình và bảng cần nhập, đối chiếu riêng.",
          },
          422,
        );
      if (value.length > MAX_TEXT)
        return reply(
          { error: "Nội dung quá dài. Hãy tách riêng một bài rồi nhập lại." },
          413,
        );
      return reply({
        pages: [{ text: value }],
        warnings: [
          "Word chỉ trích xuất văn bản; không giữ bố cục, hình, cấu trúc bảng hoặc số trang. Hãy kiểm tra bản gốc và bổ sung thủ công.",
        ],
      });
    }
    if (data.subarray(0, 5).toString() !== "%PDF-")
      return reply({ error: "Tệp không phải PDF hợp lệ." }, 400);
    const pdf = await getDocumentProxy(new Uint8Array(data));
    try {
      const from = Number(request.headers.get("x-page-from") || 1);
      const to = Number(request.headers.get("x-page-to") || from);
      if (
        !Number.isInteger(from) ||
        !Number.isInteger(to) ||
        from < 1 ||
        to < from ||
        to > pdf.numPages ||
        to - from >= 30
      )
        return reply(
          {
            error: `Chọn từ 1 đến 30 trang liên tiếp trong tệp có ${pdf.numPages} trang.`,
          },
          400,
        );
      const pages = [];
      let length = 0;
      for (let n = from; n <= to; n++) {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("");
        length += text.length;
        if (length > MAX_TEXT)
          return reply(
            { error: "Nội dung quá dài. Hãy chọn ít trang hơn." },
            413,
          );
        pages.push({ page: n, text });
        page.cleanup();
      }
      if (pages.every((p) => !p.text.trim()))
        return reply(
          {
            error:
              "Không tìm thấy chữ có thể trích xuất. PDF có thể là bản scan; cần OCR hoặc nhập văn bản thủ công. Chưa tạo bản nháp mới.",
          },
          422,
        );
      return reply({
        pages,
        warnings: [
          "Số trang tệp có thể khác số trang in trong sách. Hãy điền trang nguồn sau khi đối chiếu.",
          "Thứ tự chữ, hình và bảng chưa được kiểm tra. Bổ sung mô tả hình và cấu trúc bảng trước khi công bố.",
          ...(pages.some((p) => !p.text.trim())
            ? [
                "Có trang không trích được chữ; kiểm tra để tránh bỏ sót nội dung.",
              ]
            : []),
        ],
      });
    } finally {
      await pdf.loadingTask.destroy();
    }
  } catch {
    return reply(
      {
        error:
          "Không đọc được tài liệu. Kiểm tra tệp hỏng, khóa mật khẩu hoặc thử tách riêng một bài.",
      },
      422,
    );
  }
}
