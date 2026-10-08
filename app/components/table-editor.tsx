"use client";
import type { Block } from "../data/content";
type TableBlock = Extract<Block, { type: "table" }>;
export default function TableEditor({
  block,
  onChange,
}: {
  block: TableBlock;
  onChange: (block: TableBlock) => void;
}) {
  const width = Math.max(
    1,
    block.headers.length,
    ...block.rows.map((row) => row.length),
  );
  const headers = Array.from(
    { length: width },
    (_, i) => block.headers[i] ?? "",
  );
  const rows = block.rows.map((row) => headers.map((_, i) => row[i] ?? ""));
  return (
    <>
      <p>
        Nhập trực tiếp vào từng ô. Cột đầu tiên mô tả từng hàng; dùng bảng đơn
        giản, không gộp ô.
      </p>
      <div
        className="table-editor-scroll"
        role="region"
        aria-label={`Chỉnh sửa bảng: ${block.caption || "Bảng mới"}`}
        tabIndex={0}
      >
        <table>
          <caption>{block.caption || "Bảng mới"}</caption>
          <thead>
            <tr>
              {headers.map((header, col) => (
                <th key={col} scope="col">
                  <input
                    aria-label={`Tiêu đề cột ${col + 1}`}
                    value={header}
                    onChange={(e) =>
                      onChange({
                        ...block,
                        rows,
                        headers: headers.map((h, i) =>
                          i === col ? e.target.value : h,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="inline-link"
                    disabled={width <= 1}
                    aria-label={`Xóa cột ${col + 1}: ${header}`}
                    onClick={() =>
                      onChange({
                        ...block,
                        headers: headers.filter((_, i) => i !== col),
                        rows: rows.map((r) => r.filter((_, i) => i !== col)),
                      })
                    }
                  >
                    Xóa cột
                  </button>
                </th>
              ))}
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, col) => (
                  <td key={col}>
                    <input
                      aria-label={`Hàng ${ri + 1}, cột ${col + 1}${headers[col] ? `: ${headers[col]}` : ""}`}
                      value={cell}
                      onChange={(e) =>
                        onChange({
                          ...block,
                          headers,
                          rows: rows.map((r, i) =>
                            i === ri
                              ? r.map((c, j) =>
                                  j === col ? e.target.value : c,
                                )
                              : r,
                          ),
                        })
                      }
                    />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    className="inline-link"
                    aria-label={`Xóa hàng ${ri + 1}`}
                    onClick={() =>
                      onChange({
                        ...block,
                        headers,
                        rows: rows.filter((_, i) => i !== ri),
                      })
                    }
                  >
                    Xóa hàng
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="section-actions">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            onChange({
              ...block,
              headers,
              rows: [...rows, headers.map(() => "")],
            })
          }
        >
          Thêm hàng
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            onChange({
              ...block,
              headers: [...headers, ""],
              rows: rows.map((r) => [...r, ""]),
            })
          }
        >
          Thêm cột
        </button>
      </div>
    </>
  );
}
