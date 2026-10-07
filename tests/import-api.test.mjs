import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = process.env.IMPORT_TEST_URL;
const check = (name, run) => test(name, { skip: !base }, run);
async function send(file, format, headers = {}) {
  const body = await readFile(new URL(`./fixtures/${file}`, import.meta.url));
  return fetch(`${base}/api/import-document`, {
    method: "POST",
    headers: { "x-document-format": format, ...headers },
    body,
  });
}
check("extracts selected PDF text and preserves file page", async () => {
  const response = await send("text.pdf", "pdf");
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.pages[0].page, 1);
  assert.match(result.pages[0].text, /Synthetic lesson fixture/);
  assert.ok(result.warnings.length);
});
check(
  "extracts Vietnamese DOCX text without inventing page numbers",
  async () => {
    const response = await send("text.docx", "docx");
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.match(result.pages[0].text, /Dữ liệu thử nhập Word/);
    assert.equal(result.pages[0].page, undefined);
  },
);
check(
  "rejects unreadable PDF, wrong formats, invalid ranges and foreign origins",
  async () => {
    assert.equal((await send("blank.pdf", "pdf")).status, 422);
    assert.equal((await send("text.docx", "pdf")).status, 400);
    assert.equal(
      (await send("text.pdf", "pdf", { "x-page-to": "2" })).status,
      400,
    );
    assert.equal((await send("text.pdf", "exe")).status, 415);
    assert.equal(
      (await send("text.pdf", "pdf", { origin: "https://unrelated.example" }))
        .status,
      403,
    );
  },
);
check("rejects uploads larger than 10 MB", async () => {
  const response = await fetch(`${base}/api/import-document`, {
    method: "POST",
    headers: { "x-document-format": "pdf" },
    body: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  assert.equal(response.status, 413);
});
