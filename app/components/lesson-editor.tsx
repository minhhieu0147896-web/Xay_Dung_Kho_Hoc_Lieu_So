"use client";
import { useEffect, useRef, useState } from "react";
import type { Block, Lesson } from "../data/content";
import {
  appendText,
  blocksOf,
  materialize,
  parseLesson,
  publicationIssues,
} from "../services/content";
import ContentBlocks from "./content-blocks";

type Review = { source: boolean; accessibility: boolean };
type Props = {
  lesson: Lesson;
  onChange: (lesson: Lesson) => void;
  onCommit: (lesson: Lesson, publish: boolean, review: Review) => string | null;
  onClose: () => void;
};
const newId = () => `content-${crypto.randomUUID()}`;
const blankReview = { source: false, accessibility: false };
export default function LessonEditor({
  lesson,
  onChange,
  onCommit,
  onClose,
}: Props) {
  const [draft, setDraft] = useState(() => materialize(lesson));
  const [preview, setPreview] = useState(false);
  const [review, setReview] = useState<Review>(blankReview);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const controller = useRef<AbortController | null>(null);
  const errors = publicationIssues(draft);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) return;
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => setFileUrl(url), 0);
    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
  }, [file]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(next: Lesson) {
    setDraft(next);
    onChange(next);
    setDirty(true);
    setReview(blankReview);
    setMessage("");
    setError("");
  }
  function changeBlock(sectionId: string, block: Block) {
    change({
      ...draft,
      sections: draft.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              blocks: blocksOf(s).map((b) => (b.id === block.id ? block : b)),
            }
          : s,
      ),
    });
  }
  function addBlock(sectionId: string, type: Block["type"]) {
    const id = newId();
    const block: Block =
      type === "paragraph"
        ? { id, type, text: "" }
        : type === "list"
          ? { id, type, ordered: false, items: [""] }
          : type === "image"
            ? {
                id,
                type,
                src: "",
                alt: "",
                caption: "",
                complex: true,
                description: "",
              }
            : { id, type, caption: "", headers: ["", ""], rows: [["", ""]] };
    change({
      ...draft,
      sections: draft.sections.map((s) =>
        s.id === sectionId ? { ...s, blocks: [...blocksOf(s), block] } : s,
      ),
    });
    requestAnimationFrame(() => document.getElementById(`edit-${id}`)?.focus());
  }
  async function importFile() {
    if (!file) return;
    setError("");
    setWarnings([]);
    if (file.size > 10 * 1024 * 1024) {
      setError("Tệp phải nhỏ hơn hoặc bằng 10 MB.");
      return;
    }
    setLoading(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "json") {
        const imported = parseLesson(
          JSON.parse((await file.text()).replace(/^\uFEFF/, "")),
          draft.id,
        );
        if (abort.signal.aborted) return;
        change({
          ...draft,
          ...imported,
          id: draft.id,
          subject: draft.subject,
          grade: draft.grade,
          textbook: draft.textbook,
          chapter: draft.chapter,
          status: "draft",
        });
        setWarnings([
          "JSON thay nội dung bản đang biên tập. Bài đang công bố vẫn giữ nguyên; hãy kiểm tra trước khi lưu.",
        ]);
      } else if (extension === "txt") {
        const text = await file.text();
        if (abort.signal.aborted) return;
        if (!text.trim() || text.length > 150000)
          throw new Error(
            "Văn bản trống hoặc dài hơn 150.000 ký tự. Hãy nhập riêng từng bài.",
          );
        change(appendText(draft, [{ text }], file.name));
        setWarnings([
          "Đã thêm văn bản vào cuối bài. Hãy chia mục và bổ sung trang nguồn.",
        ]);
      } else if (extension === "pdf" || extension === "docx") {
        const response = await fetch("/api/import-document", {
          method: "POST",
          body: file,
          signal: abort.signal,
          headers: {
            "Content-Type": "application/octet-stream",
            "x-document-format": extension,
            "x-page-from": from,
            "x-page-to": to,
          },
        });
        const result = await response.json();
        if (abort.signal.aborted) return;
        if (!response.ok)
          throw new Error(result.error || "Không nhập được tài liệu.");
        change(appendText(draft, result.pages, file.name));
        setWarnings(result.warnings);
      } else throw new Error("Chọn tệp PDF, DOCX, TXT hoặc JSON.");
      setMessage("Đã nhập vào bản biên tập; chưa lưu hoặc công bố.");
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : "Không đọc được tài liệu.");
    } finally {
      if (!abort.signal.aborted) setLoading(false);
    }
  }
  function commit(publish: boolean) {
    const error = onCommit(materialize(draft), publish, review);
    if (error) {
      setError(error);
      return;
    }
    setDirty(false);
    setError("");
    setMessage(
      publish
        ? "Đã công bố bản mới trên trình duyệt này. Bản công bố trước được giữ để khôi phục."
        : "Đã lưu bản nháp. Học sinh vẫn đọc bản đang công bố.",
    );
    if (publish) setReview(blankReview);
  }
  function exportJson() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(materialize(draft), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="authoring" aria-label="Biên tập học liệu">
      <div className="authoring-toolbar">
        <button
          type="button"
          className="inline-link"
          disabled={loading}
          onClick={() => {
            if (dirty) {
              const error = onCommit(materialize(draft), false, blankReview);
              if (error) {
                setError(error);
                return;
              }
            }
            onClose();
          }}
        >
          ← Danh sách bài {dirty ? "(lưu nháp trước khi về)" : ""}
        </button>
        <span>{dirty ? "Có thay đổi chưa lưu" : "Bản biên tập"}</span>
      </div>
      <h2 ref={titleRef} tabIndex={-1}>
        {draft.title}
      </h2>
      <p className="source-note">
        Lưu và công bố trong bản demo chỉ có hiệu lực trên trình duyệt này. Xuất
        JSON để giữ một bản sao trên máy.
      </p>
      <div className="authoring-tabs" aria-label="Chế độ biên tập">
        <button
          className="secondary"
          aria-pressed={!preview}
          disabled={loading}
          onClick={() => setPreview(false)}
        >
          1. Nhập và biên tập
        </button>
        <button
          className="secondary"
          aria-pressed={preview}
          disabled={loading}
          onClick={() => {
            setPreview(true);
            requestAnimationFrame(() => previewRef.current?.focus());
          }}
        >
          2. Xem trước và kiểm tra
        </button>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <p role="status">{loading ? "Đang trích xuất tài liệu…" : message}</p>
      <fieldset
        className="authoring-fields"
        disabled={loading}
        hidden={preview}
      >
        <legend className="sr-only">Nhập và biên tập</legend>
        <details className="import-panel">
          <summary>Nhập từ tài liệu hoặc bản sao JSON</summary>
          <p>
            PDF/Word: trích xuất chữ trên máy chủ của ứng dụng, không gửi tới
            dịch vụ AI. TXT/PDF/Word thêm vào cuối bản nháp; JSON thay nội dung
            bản nháp. Tối đa 10 MB.
          </p>
          <label>
            Tài liệu nguồn
            <input
              type="file"
              accept=".pdf,.docx,.txt,.json"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setFileUrl("");
                setError("");
              }}
            />
          </label>
          {file?.name.toLowerCase().endsWith(".pdf") && (
            <div className="source-fields">
              <label>
                Từ trang tệp
                <input
                  type="number"
                  min={1}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                Đến trang tệp
                <input
                  type="number"
                  min={1}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
          )}
          <button
            type="button"
            className="secondary"
            disabled={!file}
            onClick={importFile}
          >
            Nhập vào bản biên tập
          </button>
          <p>
            PDF scan chưa hỗ trợ OCR. Hình, bảng và thứ tự đọc cần đối chiếu thủ
            công.
          </p>
          {!!warnings.length && (
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </details>
        {fileUrl && (
          <details className="source-document">
            <summary>Đối chiếu PDF nguồn đang chọn</summary>
            <p>
              Tệp chỉ được giữ trong phiên này. Lưu bản gốc riêng để đối chiếu
              về sau.
            </p>
            <a href={fileUrl} target="_blank" rel="noreferrer">
              Mở PDF nguồn ở thẻ mới
            </a>
            <iframe title="PDF nguồn để đối chiếu" src={fileUrl} />
          </details>
        )}
        <label>
          Tên bài
          <input
            value={draft.title}
            onChange={(e) => change({ ...draft, title: e.target.value })}
          />
        </label>
        <div className="source-fields">
          <label>
            Loại nội dung
            <select
              value={draft.provenance?.kind ?? "demo"}
              onChange={(e) =>
                change({
                  ...draft,
                  provenance: {
                    title: "",
                    edition: "",
                    ...draft.provenance,
                    kind: e.target.value as "demo" | "textbook" | "adaptation",
                  },
                })
              }
            >
              <option value="demo">Dữ liệu mẫu</option>
              <option value="textbook">Nội dung từ sách giáo khoa</option>
              <option value="adaptation">Diễn giải / học liệu bổ sung</option>
            </select>
          </label>
          <label>
            Phiên bản / năm xuất bản
            <input
              value={draft.provenance?.edition ?? ""}
              onChange={(e) =>
                change({
                  ...draft,
                  provenance: {
                    kind: "demo",
                    title: "",
                    ...draft.provenance,
                    edition: e.target.value,
                  },
                })
              }
            />
          </label>
        </div>
        <label>
          Tên tài liệu nguồn
          <input
            value={draft.provenance?.title ?? ""}
            onChange={(e) =>
              change({
                ...draft,
                provenance: {
                  kind: "demo",
                  edition: "",
                  ...draft.provenance,
                  title: e.target.value,
                },
              })
            }
          />
        </label>
        <label>
          Ghi chú nguồn và phạm vi sử dụng
          <textarea
            rows={2}
            value={draft.source}
            onChange={(e) => change({ ...draft, source: e.target.value })}
          />
        </label>
        {draft.sections.map((section, sectionIndex) => (
          <fieldset className="section-editor" key={section.id}>
            <legend>Mục {sectionIndex + 1}</legend>
            <label>
              Tiêu đề mục {sectionIndex + 1}
              <input
                value={section.heading}
                onChange={(e) =>
                  change({
                    ...draft,
                    sections: draft.sections.map((s) =>
                      s.id === section.id
                        ? { ...s, heading: e.target.value }
                        : s,
                    ),
                  })
                }
              />
            </label>
            <div className="section-actions">
              <button
                type="button"
                className="inline-link"
                disabled={sectionIndex === 0}
                onClick={() => {
                  const sections = [...draft.sections];
                  [sections[sectionIndex - 1], sections[sectionIndex]] = [
                    sections[sectionIndex],
                    sections[sectionIndex - 1],
                  ];
                  change({ ...draft, sections });
                }}
              >
                Đưa mục lên
              </button>
              <button
                type="button"
                className="inline-link"
                disabled={draft.questions.some(
                  (q) => q.sourceSectionId === section.id,
                )}
                onClick={() =>
                  change({
                    ...draft,
                    sections: draft.sections.filter((s) => s.id !== section.id),
                  })
                }
              >
                Bỏ mục khỏi bản nháp
              </button>
            </div>
            {blocksOf(section).map((block, blockIndex) => (
              <fieldset className="block-editor" key={block.id}>
                <legend id={`edit-${block.id}`} tabIndex={-1}>
                  Khối {blockIndex + 1} ·{" "}
                  {
                    {
                      paragraph: "Đoạn văn",
                      list: "Danh sách",
                      image: "Hình ảnh",
                      table: "Bảng",
                    }[block.type]
                  }
                </legend>
                {block.type === "paragraph" && (
                  <label>
                    Nội dung đoạn
                    <textarea
                      rows={5}
                      value={block.text}
                      onChange={(e) =>
                        changeBlock(section.id, {
                          ...block,
                          text: e.target.value,
                        })
                      }
                    />
                  </label>
                )}
                {block.type === "list" && (
                  <>
                    <label>
                      <input
                        type="checkbox"
                        checked={block.ordered}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            ordered: e.target.checked,
                          })
                        }
                      />{" "}
                      Danh sách đánh số
                    </label>
                    <label>
                      Mỗi ý một dòng
                      <textarea
                        rows={4}
                        value={block.items.join("\n")}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            items: e.target.value.split("\n"),
                          })
                        }
                      />
                    </label>
                  </>
                )}
                {block.type === "image" && (
                  <>
                    <label>
                      Đường dẫn ảnh (HTTPS hoặc /đường-dẫn)
                      <input
                        value={block.src}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            src: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Mô tả ngắn cho người không thấy ảnh
                      <input
                        value={block.alt}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            alt: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Chú thích ảnh
                      <input
                        value={block.caption}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            caption: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={block.complex}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            complex: e.target.checked,
                          })
                        }
                      />{" "}
                      Bản đồ, biểu đồ hoặc hình phức tạp
                    </label>
                    <label>
                      Mô tả chi tiết thông tin trong hình
                      <textarea
                        rows={4}
                        value={block.description}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            description: e.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                )}
                {block.type === "table" && (
                  <>
                    <label>
                      Tên bảng
                      <input
                        value={block.caption}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            caption: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Tiêu đề cột, ngăn bằng dấu |
                      <input
                        value={block.headers.join("|")}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            headers: e.target.value.split("|"),
                          })
                        }
                      />
                    </label>
                    <label>
                      Dữ liệu: mỗi hàng một dòng, các ô ngăn bằng dấu |
                      <textarea
                        rows={4}
                        value={block.rows.map((r) => r.join("|")).join("\n")}
                        onChange={(e) =>
                          changeBlock(section.id, {
                            ...block,
                            rows: e.target.value
                              .split("\n")
                              .map((r) => r.split("|")),
                          })
                        }
                      />
                    </label>
                    <p>
                      Cột đầu tiên là tiêu đề hàng. Bảng có ô gộp cần chuyển
                      thành các bảng đơn giản.
                    </p>
                  </>
                )}
                <label>
                  Trang in trong tài liệu nguồn
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={block.page ?? ""}
                    onChange={(e) =>
                      changeBlock(section.id, {
                        ...block,
                        page: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </label>
                {block.filePage && (
                  <p className="source-note">
                    Trích từ trang tệp {block.filePage}; cần đối chiếu với trang
                    in trong sách.
                  </p>
                )}
                <div className="section-actions">
                  <button
                    type="button"
                    className="inline-link"
                    disabled={blockIndex === 0}
                    onClick={() => {
                      const blocks = [...blocksOf(section)];
                      [blocks[blockIndex - 1], blocks[blockIndex]] = [
                        blocks[blockIndex],
                        blocks[blockIndex - 1],
                      ];
                      change({
                        ...draft,
                        sections: draft.sections.map((s) =>
                          s.id === section.id ? { ...s, blocks } : s,
                        ),
                      });
                    }}
                  >
                    Đưa khối lên
                  </button>
                  <button
                    type="button"
                    className="inline-link"
                    onClick={() =>
                      change({
                        ...draft,
                        sections: draft.sections.map((s) =>
                          s.id === section.id
                            ? {
                                ...s,
                                blocks: blocksOf(s).filter(
                                  (b) => b.id !== block.id,
                                ),
                              }
                            : s,
                        ),
                      })
                    }
                  >
                    Bỏ khối khỏi bản nháp
                  </button>
                </div>
              </fieldset>
            ))}
            <div className="section-actions">
              {(["paragraph", "list", "image", "table"] as const).map(
                (type) => (
                  <button
                    type="button"
                    className="secondary"
                    key={type}
                    onClick={() => addBlock(section.id, type)}
                  >
                    Thêm{" "}
                    {
                      {
                        paragraph: "đoạn",
                        list: "danh sách",
                        image: "hình",
                        table: "bảng",
                      }[type]
                    }
                  </button>
                ),
              )}
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => {
            const id = newId();
            change({
              ...draft,
              sections: [
                ...draft.sections,
                {
                  id,
                  heading: "Mục mới",
                  body: "",
                  blocks: [{ id: `${id}-p1`, type: "paragraph", text: "" }],
                },
              ],
            });
          }}
        >
          Thêm mục
        </button>
        <details className="media-editor">
          <summary>Video và bản chép lời</summary>
          <label>
            Mã video YouTube
            <input
              value={draft.youtubeVideoId ?? ""}
              onChange={(e) =>
                change({
                  ...draft,
                  youtubeVideoId: e.target.value.trim(),
                  youtubeSource: undefined,
                })
              }
            />
          </label>
          <label>
            Nguồn video
            <input
              value={draft.youtubeSource ?? ""}
              onChange={(e) =>
                change({ ...draft, youtubeSource: e.target.value })
              }
            />
          </label>
          <label>
            Bản chép lời, gồm mô tả thông tin trực quan cần thiết
            <textarea
              rows={6}
              value={draft.transcript ?? ""}
              onChange={(e) => change({ ...draft, transcript: e.target.value })}
            />
          </label>
        </details>
        <details className="questions-editor">
          <summary>Câu hỏi luyện tập ({draft.questions.length})</summary>
          {draft.questions.map((q, i) => (
            <fieldset key={q.id}>
              <legend>Câu {i + 1}</legend>
              <label>
                Câu hỏi
                <textarea
                  value={q.prompt}
                  onChange={(e) =>
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id ? { ...x, prompt: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Các lựa chọn (mỗi dòng một lựa chọn)
                <textarea
                  value={q.options.join("\n")}
                  onChange={(e) =>
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id
                          ? { ...x, options: e.target.value.split("\n") }
                          : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Đáp án đúng
                <select
                  value={q.correctOptionId}
                  onChange={(e) =>
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id
                          ? { ...x, correctOptionId: Number(e.target.value) }
                          : x,
                      ),
                    })
                  }
                >
                  {q.options.map((o, j) => (
                    <option key={j} value={j}>
                      {j + 1}. {o}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Giải thích
                <textarea
                  value={q.explanation}
                  onChange={(e) =>
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id
                          ? { ...x, explanation: e.target.value }
                          : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Mục nguồn
                <select
                  value={q.sourceSectionId}
                  onChange={(e) =>
                    change({
                      ...draft,
                      questions: draft.questions.map((x) =>
                        x.id === q.id
                          ? { ...x, sourceSectionId: e.target.value }
                          : x,
                      ),
                    })
                  }
                >
                  {draft.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.heading}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="inline-link"
                onClick={() =>
                  change({
                    ...draft,
                    questions: draft.questions.filter((x) => x.id !== q.id),
                  })
                }
              >
                Bỏ câu hỏi khỏi bản nháp
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            className="secondary"
            disabled={!draft.sections.length}
            onClick={() =>
              change({
                ...draft,
                questions: [
                  ...draft.questions,
                  {
                    id: newId(),
                    prompt: "",
                    options: ["", ""],
                    correctOptionId: 0,
                    explanation: "",
                    sourceSectionId: draft.sections[0].id,
                  },
                ],
              })
            }
          >
            Thêm câu hỏi
          </button>
        </details>
      </fieldset>
      {preview && (
        <div
          ref={previewRef}
          tabIndex={-1}
          className="authoring-preview"
          aria-label="Xem trước học liệu"
        >
          <h3>Bản đọc trước khi công bố</h3>
          <p>{draft.source}</p>
          {draft.sections.map((section) => (
            <section className="reading-section" key={section.id}>
              <h4>{section.heading}</h4>
              <ContentBlocks section={section} prefix="preview-" />
            </section>
          ))}
          {draft.transcript && (
            <section>
              <h4>Bản chép lời video</h4>
              <p className="paragraph-text">{draft.transcript}</p>
            </section>
          )}
          <section
            aria-label="Kiểm tra trước công bố"
            className="publish-check"
          >
            <h3>Kiểm tra trước công bố</h3>
            {errors.length ? (
              <ul>
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            ) : (
              <p>
                Đã đủ các trường bắt buộc. Kiểm tra tự động không thay thế đối
                chiếu nội dung và thử với người học.
              </p>
            )}
            <label className="check-label">
              <input
                type="checkbox"
                checked={review.source}
                onChange={(e) =>
                  setReview({ ...review, source: e.target.checked })
                }
              />{" "}
              Tôi đã đối chiếu nội dung, câu hỏi và trang nguồn; giữ nhãn mẫu
              nếu dùng dữ liệu mẫu.
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={review.accessibility}
                onChange={(e) =>
                  setReview({ ...review, accessibility: e.target.checked })
                }
              />{" "}
              Tôi đã kiểm tra thứ tự đọc, mô tả hình, bảng và thao tác bằng bàn
              phím/trình đọc màn hình.
            </label>
            <button
              type="button"
              className="primary"
              disabled={
                loading ||
                !!errors.length ||
                !review.source ||
                !review.accessibility
              }
              onClick={() => commit(true)}
            >
              Công bố trong demo
            </button>
          </section>
        </div>
      )}
      <div className="section-actions">
        <button
          type="button"
          className="primary"
          disabled={loading}
          onClick={() => commit(false)}
        >
          Lưu bản nháp
        </button>
        <button
          type="button"
          className="secondary"
          disabled={loading}
          onClick={exportJson}
        >
          Xuất JSON để sao lưu
        </button>
      </div>
    </section>
  );
}
