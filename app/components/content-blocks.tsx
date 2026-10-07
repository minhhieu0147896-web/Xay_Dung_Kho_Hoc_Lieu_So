/* eslint-disable @next/next/no-img-element -- Teacher-owned image hosts cannot be preconfigured for next/image. */
import type { Section } from "../data/content";
import { blocksOf, safeImageUrl } from "../services/content";

export default function ContentBlocks({
  section,
  prefix = "source-",
}: {
  section: Section;
  prefix?: string;
}) {
  return (
    <>
      {blocksOf(section).map((block) => (
        <div
          className="content-block"
          key={block.id}
          id={`${prefix}${block.id}`}
          tabIndex={-1}
        >
          {block.type === "paragraph" && (
            <p className="paragraph-text">{block.text}</p>
          )}
          {block.type === "list" &&
            (block.ordered ? (
              <ol>
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul>
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ))}
          {block.type === "image" && (
            <figure>
              {/* Imported URLs are validated; next/image cannot preconfigure arbitrary teacher-owned hosts. */}
              {safeImageUrl(block.src) && (
                <img
                  src={block.src}
                  alt={block.alt}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
              <figcaption>{block.caption}</figcaption>
              {block.description && (
                <details>
                  <summary>Mô tả chi tiết hình</summary>
                  <p className="paragraph-text">{block.description}</p>
                </details>
              )}
            </figure>
          )}
          {block.type === "table" && (
            <div
              className="content-table"
              role="region"
              aria-label={block.caption || "Bảng nội dung"}
              tabIndex={0}
            >
              <table>
                <caption>{block.caption}</caption>
                <thead>
                  <tr>
                    {block.headers.map((h, i) => (
                      <th key={i} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) =>
                        j === 0 ? (
                          <th scope="row" key={j}>
                            {cell}
                          </th>
                        ) : (
                          <td key={j}>{cell}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {block.page && (
            <p className="block-source">Trang nguồn: {block.page}</p>
          )}
        </div>
      ))}
    </>
  );
}
