# Bảng phối hợp 2 Agent (Argon chủ lực ↔ Gemini)

> Tài liệu tham chiếu bắt buộc: `AGENTS.md`, `docs/thuyet-minh-ai-hoc-lieu-so.md`, `docs/ke-hoach-giai-doan-2-ai.md`.
> Quy tắc: **Argon chủ lực** chốt Schema/API trước → **Gemini** code UI/A11y/Dữ liệu theo hợp đồng → **Argon chủ lực** review `git diff` & chạy `lint` / `tsc` / `build`.

---

## 1. Trạng thái hiện tại
- **Giai đoạn:** Giai đoạn 2 — Cấu trúc hóa học liệu bằng AI & Học tập tiếp cận cho học sinh khiếm thị + Cải tiến Giao diện (UI/UX) Chuẩn Web Học Tập Hiện Đại
- **Lượt chạy đang thực hiện:** Lượt chạy 5B (Cải tiến UI/UX Không gian Giáo viên — Tab `"Bảng mục lục & AI"`) — **HOÀN THÀNH & ĐÃ NGHIỆM THU (`STATUS: PASS`)** (Toàn bộ Lượt chạy 1, 2, 3, 4, 5A và 5B đã `STATUS: PASS`)
- **Trạng thái kiểm chứng gần nhất:** `npx tsc --noEmit` (`0` lỗi), `npm run lint` (`0` lỗi, `0` cảnh báo), `npm run build` (`PASS`), `npm test` (`14` đạt, `0` lỗi, `4` bỏ qua)

---

## 2. Phân chia phạm vi file (Chống xung đột)
- **Argon chủ lực (Tech Lead · Schema · AI Backend · Review):**
  - `app/data/content.ts`
  - `app/services/content.ts`
  - `app/api/ai-assistant/route.ts`
  - `app/api/import-document/route.ts`
  - `docs/**`
- **Gemini (Frontend UI · Tiếp cận A11y · Dữ liệu học liệu):**
  - `app/components/**`
  - `app/services/learning.ts`
  - `app/study.css`, `app/globals.css`
  - `content/lich-su/**`

---

## 3. Lộ trình 3 Lượt chạy Workflow

### Lượt chạy 1 — Nền móng Schema + API tách khung + Bảng mục lục Giáo viên `[HOÀN THÀNH - STATUS: PASS]`
- **Ticket 1A (`Argon chủ lực`) — `[HOÀN THÀNH]`:**
  - Mở rộng `Section` (`code`, `sourceText`, `videoUrl`, `keywords`), `Lesson` (`videoUrl`), `Answer` (`mode: "retrieval" | "ai_grounded"`) trong `app/data/content.ts`.
  - Cập nhật Zod schema (tất cả trường mới đều `optional` để tương thích `suhoc-content-v2`) + thêm `extractYoutubeId`, `renumberSectionCodes` trong `app/services/content.ts`.
  - Tạo `app/api/ai-assistant/route.ts` kết nối OpenRouter (đọc `.env.local`) + fallback cục bộ, triển khai trước action `split_outline`.
- **Ticket 1B (`Gemini`) — `[HOÀN THÀNH]`:**
  - Thêm tab **"Bảng mục lục & AI"** trong `app/components/lesson-editor.tsx` với các cột `Mã mục (1.1, 1.2...)`, `Tiêu đề`, `Nội dung gốc (SGK)`, `Nội dung học`, `Video URL`, nút **Tách làm 2 mục**, **Gộp xuống mục dưới**, **Đánh lại mã mục tự động**, và nút **Tự động tách thành Bảng mục lục (AI)** ở cả tab `"Nguồn & nhập tệp"` và tab `"Bảng mục lục & AI"`.

### Lượt chạy 2 — AI Chế biến Nội dung học + Chèn mô tả ảnh ngữ nghĩa + Quiz & Video URL `[HOÀN THÀNH - STATUS: PASS]`
- **Ticket 2A (`Argon chủ lực`) — `[HOÀN THÀNH]`:**
  - Bổ sung 3 action vào `app/api/ai-assistant/route.ts`: `generate_study_content`, `insert_image_semantic`, `generate_quiz` (cả 3 đều hỗ trợ OpenRouter API đọc từ `.env.local` kèm fallback cục bộ an toàn).
- **Ticket 2B (`Gemini`) — `[HOÀN THÀNH - ĐÃ NGHIỆM THU]`:**
  - Gắn nút **AI Chế biến Nội dung học**, **AI Mô tả & Chèn ảnh theo ngữ nghĩa**, **AI Tạo câu hỏi Quiz** trên từng dòng của Bảng mục lục trong `app/components/lesson-editor.tsx`.
  - Nâng cấp mục Video trong `app/components/lesson-editor.tsx` và `app/components/lesson-video.tsx` hỗ trợ dán/phát Link Video URL bất kỳ (và cập nhật `hasVideo` trong `app/services/learning.ts`).

### Lượt chạy 3 — Học sinh khiếm thị (Semantic Search, Đọc Nội dung học, Hỏi đáp AI, Lộ trình cá nhân) `[HOÀN THÀNH - STATUS: PASS]`
- **Ticket 3A (`Argon chủ lực`) — `[HOÀN THÀNH]`:**
  - Bổ sung action `ask_lesson` vào `app/api/ai-assistant/route.ts`: trả lời câu hỏi tự nhiên bám sát *Nội dung học* (`studyText`/`body`/`blocks`) và *Nội dung gốc SGK* (`sourceText`) của bài học, luôn trả về danh sách `citations` trỏ tới đúng `sectionId` / `blockId`, hỗ trợ OpenRouter API đọc từ `.env.local` (`mode: "ai_grounded"`, `provider: "openrouter"`) + fallback truy hồi ngữ nghĩa cục bộ khi chưa có kết nối (`mode: "retrieval"`, `provider: "local-fallback"`).
- **Ticket 3B (`Gemini`) — `[HOÀN THÀNH - ĐÃ NGHIỆM THU]`:**
  - Nâng cấp `app/services/learning.ts` (`hasVideo`, `semanticSearchLessons`, `findBestMatchingSection`, `buildPersonalLearningPath`).
  - Nâng cấp `app/components/home-page.tsx` (tìm kiếm ngữ nghĩa + nút tìm bằng giọng nói Web Speech API + hiển thị mục khớp ngữ nghĩa để bấm mở thẳng tới mục đó).
  - Nâng cấp `app/components/learning-app.tsx` (khung "Trích xuất nhanh: Tóm tắt & Ý chính bài học" có nút Nghe tóm tắt; hiển thị mã mục `MỤC 6.1`, `MỤC 6.2`... + hộp mở rộng `<details>` "Xem đối chiếu Nội dung gốc (SGK)" nếu có `sourceText`; nối tab Hỏi đáp với `/api/ai-assistant` action `ask_lesson` có nút trích dẫn nhảy tới đoạn nguồn; hiển thị khung "Lộ trình học cá nhân" sau khi nộp Quiz và ở trang Học liệu đang học).
  - Cập nhật dữ liệu mẫu `content/lich-su/lop-12/ket-noi-tri-thuc/bai-06.json` và `sach.json` (bổ sung mã mục `6.1`/`6.2`/`6.3`, `sourceText` đối chiếu, đoạn mô tả ảnh lịch sử cây đa Tân Trào chèn đúng mạch văn và từ khóa ngữ nghĩa cho Bài 6 & Bài 1, giữ nguyên nhãn mẫu trung thực).

---

### Lượt chạy 4 — Vision AI đọc ảnh thật + Ra lệnh giọng nói mở thẳng bài học cho người khiếm thị `[HOÀN THÀNH - STATUS: PASS]`
- **Ticket 4A (`Argon chủ lực`) — `[HOÀN THÀNH]`:**
  - Nâng cấp action `insert_image_semantic` trong `app/api/ai-assistant/route.ts` để nhận thêm trường tùy chọn `imageDataUrl` (`data:image/jpeg|jpg|png|webp;base64,...`, kiểm tra dung lượng giải mã <= 4MB; cho phép `imageCaption` là tùy chọn nếu đã có `imageDataUrl`).
  - Hỗ trợ gửi payload đa phương thức (multimodal `type: "image_url"`) lên OpenRouter để Vision AI phân tích trực tiếp bức ảnh lịch sử, sinh lời mô tả giàu thông tin cho học sinh khiếm thị và tự động chèn vào đúng vị trí câu văn phù hợp ngữ nghĩa trong `studyText`. Tự động fallback an toàn (thử lại OpenRouter chế độ văn bản hoặc chuyển về bộ xử lý ngữ nghĩa cục bộ) và trả `usedVision: boolean` cùng `notice` giải thích rõ cho giáo viên.
- **Ticket 4B (`Gemini UI & Học liệu`) — `[HOÀN THÀNH - ĐÃ NGHIỆM THU]`:**
  - Trong `app/components/lesson-editor.tsx` (khung "AI Mô tả & Chèn ảnh theo ngữ nghĩa" của Bảng mục lục): thêm nút/ô `<input type="file" accept="image/png,image/jpeg,image/webp" />` tải ảnh thật từ máy lên (có khung xem trước ảnh nhỏ, nút xóa ảnh, tự nén hoặc kiểm tra dung lượng <= 4MB rồi gửi `imageDataUrl` lên `/api/ai-assistant`). Hiển thị rõ thông báo trạng thái đã phân tích ảnh bằng Vision AI hay chế độ fallback.
  - Trong `app/components/home-page.tsx` và `app/components/learning-app.tsx`: nâng cấp luồng "Tìm bằng giọng nói" cho học sinh khiếm thị với tùy chọn (mặc định bật) **"Tự động mở bài khớp nhất khi tìm bằng giọng nói"**; tự động mở thẳng tới đúng bài & mục (`findBestMatchingSection`), focus vào mục đó và đọc thông báo ngắn qua TTS (tôn trọng quy tắc không tự phát video và ngắt giọng đọc cũ trước khi đọc mới).


---

### Lượt chạy 5A — Cải tiến UI/UX Phía Học sinh (Nền sáng tối giản, Underline Tabs, Thanh TTS trực tiếp, Breadcrumb & Bài đọc chuẩn 68ch) `[HOÀN THÀNH - STATUS: PASS]`
- **Ticket 5A-1 (`Argon chủ lực`) — `[HOÀN THÀNH]`:**
  - Giữ nguyên 100% Schema, Service và API (`app/data/content.ts`, `app/services/content.ts`, `app/api/*`) — không thay đổi cấu trúc dữ liệu, bảo toàn tương thích ngược `suhoc-content-v2` và `suhoc-progress-v1`.
  - Rà soát toàn bộ hệ biến CSS và cấu trúc DOM/A11y trong `app/study.css`, `app/components/home-page.tsx`, `app/components/course-picker.tsx`, `app/components/learning-app.tsx`, `app/components/study-outline.tsx` theo `docs/ke-hoach-cai-tien-giao-dien.md` (Mục 2 và Mục 3 - Lượt chạy 5A) và chốt Hợp đồng Thiết kế & Phiếu bàn giao Mục 4.8.
- **Ticket 5A-2 (`Gemini UI & Học liệu`) — `[HOÀN THÀNH - ĐÃ NGHIỆM THU]`:**
  - Đã triển khai đầy đủ Hệ thống Design Tokens và 5 hạng mục nâng cấp UI/UX phía Học sinh trên `app/study.css`, `app/components/home-page.tsx`, `app/components/course-picker.tsx`, `app/components/learning-app.tsx`, `app/components/study-outline.tsx` (chi tiết tại Mục 5 & Mục 6).

---

### Lượt chạy 5B — Thiết kế lại Không gian Giáo viên (`Bảng mục lục & AI` — Split-View Section Cards & Xem mục lục rút gọn) `[ĐANG THỰC HIỆN - ĐÃ XONG TICKET 5B-1]`
- **Ticket 5B-1 (`Argon chủ lực`) — `[HOÀN THÀNH]`:**
  - Giữ nguyên 100% Schema, Service và API (`app/data/content.ts`, `app/services/content.ts`, `app/api/*`) — bảo toàn tương thích ngược `suhoc-content-v2`.
  - Rà soát toàn bộ tab `"Bảng mục lục & AI"` trong `app/components/lesson-editor.tsx` và các lớp CSS biên tập trong `app/study.css`; chốt Hợp đồng Thiết kế & Phiếu bàn giao Ticket 5B-2 tại Mục 4.9.
- **Ticket 5B-2 (`Gemini UI & Học liệu`) — `[ĐANG CHỜ THỰC HIỆN]`:**
  - Cải tổ giao diện tab `"Bảng mục lục & AI"` trong `app/components/lesson-editor.tsx` và `app/study.css` từ bảng 6 cột ngang chật hẹp sang danh sách **Thẻ cấu trúc so sánh 2 cột (Split-View Section Cards)** kèm nút chuyển đổi nhanh **"Xem mục lục rút gọn"** (bảng 2 cột Mã mục + Tiêu đề).

---

## 4. Hợp đồng API & Type đã chốt (Ticket 1A, 2A, 3A & Ticket 4A → Ticket 4B)

### 4.1. Kiểu dữ liệu TypeScript đã mở rộng (`app/data/content.ts`)
```ts
export type Section = {
  id: string;
  code?: string;       // Ví dụ: "1.1", "1.2", "6.1" (optional)
  heading: string;
  sourceText?: string; // Nội dung gốc từ SGK để tham chiếu & làm đầu vào AI (optional)
  body: string;        // Nội dung học đã chế biến để đọc cho người khiếm thị
  blocks?: Block[];
  videoUrl?: string;   // Link video bài giảng riêng của mục - URL bất kỳ (optional)
  keywords?: string[]; // Từ khóa ngữ nghĩa phục vụ Semantic Search (optional)
};

export type Answer = {
  text: string;
  citations: {
    lessonId: string;
    sectionId: string;
    blockId?: string;
    page?: number;
    excerpt: string;
  }[];
  mode: "retrieval" | "ai_grounded";
  status: "ok" | "insufficient_evidence";
};
```

### 4.2. Hàm tiện ích & Zod Schema (`app/services/content.ts`)
- `lessonSchema`: Giữ toàn bộ các trường mới (`code`, `sourceText`, `videoUrl`, `keywords`) ở trạng thái `.optional()` để tương thích ngược 100% với `suhoc-content-v2` trong `localStorage`.
- `extractYoutubeId(urlOrId: string): string | null` và `renumberSectionCodes(lessonNumber: number | undefined, sections: Section[]): Section[]`.

### 4.3. Hợp đồng API `/api/ai-assistant` (`POST`) — Các Action 1..4 (Đã chốt ở Lượt 1 & Lượt 2)
- **Action 1 (`split_outline`):** Tách văn bản thô thành mảng `sections` (`code`, `heading`, `sourceText`, `studyText`, `keywords`).
- **Action 2 (`generate_study_content`):** Chế biến `sourceText` thành `studyText` chia theo `Ý chính 1: ...`, `Ý chính 2: ...`, kèm `summary` và `keywords`.
- **Action 3 (`insert_image_semantic`):** Sinh mô tả ảnh `description`, tìm câu neo `insertedAfterSentence`, chèn vào `insertedText` và giải thích `reason`.
- **Action 4 (`generate_quiz`):** Sinh mảng câu hỏi trắc nghiệm 4 lựa chọn gắn `sourceSectionId`.

### 4.4. Hợp đồng API `/api/ai-assistant` (`POST`) — Action 5: `ask_lesson` (Ticket 3A — MỚI)
- **Mục đích:** Trả lời câu hỏi tự nhiên của học sinh dựa chặt vào *Nội dung học* (`studyText` / `body` / `blocks`) và *Nội dung gốc (SGK)* (`sourceText`) của các mục trong bài học hiện tại; luôn trả về danh sách `citations` trỏ tới đúng `sectionId` / `blockId` để học sinh bấm nhảy thẳng tới đoạn nguồn, kèm `mode` (`"ai_grounded"` khi qua OpenRouter hoặc `"retrieval"` khi chạy bộ truy hồi ngữ nghĩa cục bộ) và `provider` (`"openrouter"` | `"local-fallback"`).
- **Kiểu Request & Response TypeScript (`app/api/ai-assistant/route.ts`):**
```ts
export type AskLessonCitation = {
  lessonId: string;
  sectionId: string;
  blockId?: string;
  page?: number;
  excerpt: string;
};

export type AskLessonResponse = {
  text: string;
  citations: AskLessonCitation[];
  mode: "retrieval" | "ai_grounded";
  status: "ok" | "insufficient_evidence";
  suggestedQuestions?: string[];
  provider: "openrouter" | "local-fallback";
  fallback: boolean;
  model: string;
  notice?: string;
};
```
- **JSON Request mẫu:**
```json
{
  "action": "ask_lesson",
  "question": "Sự kiện ở cây đa Tân Trào chiều 16/8/1945 diễn ra như thế nào?",
  "lessonId": "cach-mang-thang-tam",
  "lessonTitle": "Cách mạng tháng Tám năm 1945",
  "sections": [
    {
      "id": "thang-tam-boi-canh",
      "code": "6.1",
      "heading": "Bối cảnh lịch sử và quá trình chuẩn bị khởi nghĩa",
      "body": "Ý chính 1: Giữa tháng 8 năm 1945, Nhật Bản đầu hàng Đồng minh không điều kiện...\nÝ chính 2: Chiều ngày 16 tháng 8 năm 1945, đơn vị Giải phóng quân do đồng chí Võ Nguyên Giáp chỉ huy xuất phát từ Tân Trào tiến về giải phóng thị xã Thái Nguyên. [Mô tả ảnh chèn tự động: Hình ảnh tư liệu tại cây đa Tân Trào ghi lại cảnh đội hình các chiến sĩ Giải phóng quân đứng trang nghiêm dưới tán cây đa cổ thụ, lắng nghe đọc Quân lệnh số 1 trước giờ lên đường.]",
      "sourceText": "Chiều ngày 16-8-1945, theo lệnh của Ủy ban Khởi nghĩa toàn quốc, một đơn vị Giải phóng quân do Võ Nguyên Giáp chỉ huy xuất phát từ Tân Trào tiến về giải phóng thị xã Thái Nguyên...",
      "keywords": ["Tân Trào", "cây đa Tân Trào", "Quân lệnh số 1", "16/8/1945"],
      "blocks": [
        {
          "id": "thang-tam-boi-canh-p1",
          "text": "Ý chính 1: Giữa tháng 8 năm 1945, Nhật Bản đầu hàng Đồng minh không điều kiện..."
        }
      ]
    }
  ]
}
```
- **JSON Response thành công (`200 OK`) mẫu:**
```json
{
  "text": "Theo Mục 6.1 (Bối cảnh lịch sử và quá trình chuẩn bị khởi nghĩa): Chiều ngày 16 tháng 8 năm 1945, đơn vị Giải phóng quân do đồng chí Võ Nguyên Giáp chỉ huy xuất phát từ Tân Trào tiến về giải phóng thị xã Thái Nguyên. Hình ảnh tư liệu tại cây đa Tân Trào ghi lại cảnh đội hình các chiến sĩ Giải phóng quân đứng trang nghiêm dưới tán cây đa cổ thụ, lắng nghe đọc Quân lệnh số 1 trước giờ lên đường.",
  "citations": [
    {
      "lessonId": "cach-mang-thang-tam",
      "sectionId": "thang-tam-boi-canh",
      "blockId": "thang-tam-boi-canh-p1",
      "excerpt": "Ý chính 1: Giữa tháng 8 năm 1945, Nhật Bản đầu hàng Đồng minh không điều kiện..."
    }
  ],
  "mode": "ai_grounded",
  "status": "ok",
  "suggestedQuestions": [
    "Nội dung trọng tâm của Mục 6.1 (Bối cảnh lịch sử và quá trình chuẩn bị khởi nghĩa) là gì?",
    "Nội dung trọng tâm của Mục 6.2 (Diễn biến Tổng khởi nghĩa tháng Tám năm 1945) là gì?"
  ],
  "provider": "openrouter",
  "fallback": false,
  "model": "google/gemini-2.0-flash-001",
  "notice": "Thông báo tùy chọn khi chạy ở chế độ local-fallback"
}
```

### 4.5. Phiếu bàn giao chi tiết cho Gemini (Ticket 3B)
1. **Danh sách chính xác file Gemini được phép sửa trong Ticket 3B:**
   - `app/services/learning.ts`
   - `app/components/home-page.tsx`
   - `app/components/learning-app.tsx`
   - `app/study.css` (nếu cần bổ sung class CSS cho khung Tóm tắt nhanh, hộp đối chiếu Nội dung gốc SGK, nút Tìm bằng giọng nói, khung Lộ trình học cá nhân)
   - `content/lich-su/lop-12/ket-noi-tri-thuc/bai-06.json`
   - `content/lich-su/lop-12/ket-noi-tri-thuc/sach.json`
2. **Yêu cầu chức năng cụ thể theo 4 hạng mục:**
   - **Hạng mục 1 — Nâng cấp `app/services/learning.ts`:**
     1. Giữ `hasVideo(lesson)` nhận diện cả `youtubeVideoId` (11 ký tự) lẫn `videoUrl` không rỗng.
     2. Bổ sung `findBestMatchingSection(lesson: Lesson, query: string): Section | undefined` và `semanticSearchLessons(lessons: Lesson[], query: string): Lesson[]` (đồng thời nâng cấp hoặc tích hợp mượt với `searchLessons` để không làm gãy bất kỳ unit test nào đang có trong `tests/content.test.mjs` và `tests/curriculum.test.mjs`):
        - Hỗ trợ cả truy vấn số bài (`"bài 6"`, `"6"`), tiêu đề bài, tên chương/chủ đề, lẫn **câu hỏi/cụm từ tự nhiên theo ngữ nghĩa lịch sử** (ví dụ: *"Tôi muốn xem về Tổng khởi nghĩa tháng Tám"*, *"Lễ xuất quân ở cây đa Tân Trào"*, *"Quân lệnh số 1"*, *"Tổ chức giữ gìn hòa bình sau thế chiến 2"*, *"Hội nghị Ianta"*, *"Đại hội VI năm 1986"*, *"Kinh tế thị trường định hướng xã hội chủ nghĩa"*).
        - Khi chấm điểm mục (`findBestMatchingSection`), xét cả `section.code`, `section.heading`, `sectionText(section)`, `section.sourceText`, `section.keywords` và bộ từ điển mở rộng đồng nghĩa lịch sử để trả về đúng `Section` khớp ngữ nghĩa nhất.
     3. Bổ sung `buildPersonalLearningPath(lesson: Lesson, progress?: Progress, choices?: Record<string, number>, submitted?: boolean)`:
        - Phân tích từng mục (`Section`) của bài học dựa trên `progress?.completedSectionIds` và kết quả trả lời các câu hỏi `lesson.questions` có `sourceSectionId === section.id` (khi người dùng đã `submitted` hoặc khi đã có `progress?.quizScore`).
        - Trả về cấu trúc rõ ràng gồm:
          - Danh sách mục **Đã nắm vững** (`masteredSections`: đã đọc và/hoặc trả lời đúng các câu hỏi Quiz gắn với mục đó).
          - Danh sách mục **Cần ôn lại / củng cố** (`reviewSections`: trả lời sai câu hỏi Quiz thuộc mục đó hoặc chưa hoàn thành đọc, kèm lý do ngắn gọn).
          - Gợi ý bước học tiếp theo (`nextStepLabel` / `recommendedSection`).
   - **Hạng mục 2 — Nâng cấp `app/components/home-page.tsx`:**
     1. Nâng cấp ô tìm kiếm hỗ trợ tìm kiếm theo từ khóa & ngữ nghĩa (`semanticSearchLessons` / `findBestMatchingSection`).
     2. Bổ sung nút **"Tìm bằng giọng nói"** (sử dụng Web Speech Recognition API `window.SpeechRecognition || window.webkitSpeechRecognition` với `lang = "vi-VN"` nếu trình duyệt hỗ trợ; nếu trình duyệt không hỗ trợ hoặc người dùng từ chối quyền micro thì hiển thị thông báo `role="status"` thân thiện, không làm lỗi trang). Nút phải có `aria-label`, `aria-pressed` khi đang thu âm.
     3. Trên mỗi dòng kết quả bài học khi có `query.trim()`, nếu `findBestMatchingSection(l, query)` tìm thấy mục khớp ngữ nghĩa, hiển thị rõ nhãn (ví dụ: `Khớp ngữ nghĩa: Mục 6.1 · Bối cảnh lịch sử...` hoặc `Tìm thấy trong: Mục 6.2 · ...`) và khi bấm vào bài học thì gọi `onOpen(l, matched.id)` để nhảy thẳng tới đúng mục đó.
   - **Hạng mục 3 — Nâng cấp `app/components/learning-app.tsx`:**
     1. **Trong tab `Đọc bài` (`#panel-read`):**
        - Thêm khung **"Trích xuất nhanh: Tóm tắt & Ý chính bài học"** ở đầu phần đọc (khi bài có `lesson.sections.length > 0`), hiển thị `lesson.summary` cùng danh sách tóm lược các mục (`Mục 6.1: ...`, `Mục 6.2: ...`) và có nút **"Nghe tóm tắt"** đọc toàn bộ bản tóm tắt nhanh qua TTS (`speak(...)`).
        - Ở mỗi mục (`reading-section`): hiển thị rõ mã mục `MỤC ${s.code ?? `0${i + 1}`}` (ví dụ `MỤC 6.1`, `MỤC 6.2`), hiển thị bản *Nội dung học* (`<ContentBlocks section={s} />`), và nếu mục đó có `s.sourceText?.trim()` thì hiển thị hộp mở rộng `<details className="source-comparison">` với `<summary>Xem đối chiếu Nội dung gốc (SGK)</summary>` bên dưới để học sinh/giáo viên đối chiếu.
     2. **Trong tab `Hỏi đáp` (`#panel-ask`):**
        - Nối hàm `ask()` với `POST /api/ai-assistant` (`action: "ask_lesson"`), gửi `{ action: "ask_lesson", question, lessonId: lesson.id, lessonTitle: lesson.title, sections: lesson.sections.map((s) => ({ id: s.id, code: s.code, heading: s.heading, body: sectionText(s), sourceText: s.sourceText, keywords: s.keywords, blocks: blocksOf(s).map((b) => ({ id: b.id, text: blockText(b), page: b.page })) })) }`.
        - Nếu mạng/fetch lỗi, fallback an toàn về `askLesson(lesson, question)` trong `app/services/learning.ts`.
        - Hiển thị rõ nguồn trả lời (`Trợ giảng AI (OpenRouter)` khi `mode === "ai_grounded"` / `provider === "openrouter"`, hoặc `Truy hồi ngữ nghĩa dựa trên đoạn nguồn` khi `provider === "local-fallback"` / `mode === "retrieval"`), nút **"Nghe câu trả lời"** (nếu `speechAvailable`), các nút trích dẫn `citations` bấm vào gọi `jump(c.blockId ? `source-${c.blockId}` : c.sectionId)` nhảy thẳng tới đoạn nguồn, và các nút câu hỏi gợi ý (`suggestedQuestions`) để học sinh bấm hỏi nhanh.
     3. **Trong tab `Luyện tập` (`#panel-quiz`) và trang `Học liệu đang học` (`view === "progress"`):**
        - Sau khi nộp Quiz (`submitted === true`) trong `#panel-quiz`, hiển thị khung **"Lộ trình học cá nhân"** (dùng `buildPersonalLearningPath(lesson, currentProgress, choices, submitted)`): liệt kê rõ các mục **Đã nắm vững (✓)**, các mục **Cần nghe/đọc lại** kèm nút bấm `"Ôn lại Mục [Mã mục]: [Tiêu đề]"` gọi `jump(section.id)` để nhảy thẳng về mục đó trong tab Đọc bài, và gợi ý bài học tiếp theo trong `syllabus`.
        - Ở trang `Học liệu đang học` (`view === "progress"`), hiển thị tóm tắt lộ trình cá nhân cho từng bài đang học (mục đã hoàn thành, mục tiếp theo cần đọc hoặc gợi ý ôn tập) kèm nút mở thẳng vào mục tiếp theo.
   - **Hạng mục 4 — Cập nhật dữ liệu mẫu `content/lich-su/lop-12/ket-noi-tri-thuc/bai-06.json` và `sach.json`:**
     1. Trong `bai-06.json`:
        - Giữ nguyên `id: "cach-mang-thang-tam"`, các `section.id` (`thang-tam-boi-canh`, `thang-tam-dien-bien`, `thang-tam-y-nghia`), `block.id` (`thang-tam-boi-canh-p1`...), `question.id` (`a1`, `a2`, `a3`) và nhãn `source` / `provenance.kind: "demo"` trung thực để tương thích 100% với bộ test hiện có.
        - Bổ sung `code: "6.1"`, `"6.2"`, `"6.3"` cho 3 mục; bổ sung `sourceText` (văn bản đối chiếu) và `keywords` ngữ nghĩa (bao gồm `"cây đa Tân Trào"`, `"Quân lệnh số 1"`, `"Võ Nguyên Giáp"`, `"Tổng khởi nghĩa tháng Tám"`, `"Hà Nội 19/8"`, `"Tuyên ngôn Độc lập"`...).
        - Trong mục `6.1` (`thang-tam-boi-canh`), lồng ghép đoạn mô tả ảnh lịch sử lễ xuất quân dưới bóng cây đa Tân Trào chiều 16/8/1945 vào đúng mạch văn *Nội dung học* (`body` và `blocks[0].text`), giữ các từ khóa cốt lõi (*Nhật Bản đầu hàng Đồng minh*, *tổng khởi nghĩa giành chính quyền*).
     2. Trong `sach.json`:
        - Cập nhật mục Bài 1 (`kntt-lich-su-12-1` — *Liên hợp quốc*) và Bài 6 (`cach-mang-thang-tam`) có `keywords` / `summary` hoặc thông tin phục vụ tìm kiếm ngữ nghĩa, nhưng **LƯU Ý QUAN TRỌNG**: Kiểm tra `tests/content.test.mjs` (`assert.equal(initialLessons.filter(hasReading).length, 2)`) và `tests/curriculum.test.mjs` (`assert.equal(empty.length, 15)`). Để 2 bài test này tiếp tục PASS 100%, trong `sach.json` **không được thêm `sections` có văn bản đọc vào các bài từ Bài 1 đến Bài 17** (vì chỉ có 2 bài có bản đọc khởi tạo là Bài 6 `bai-06.json` và Bài 10 `bai-10.json`); với Bài 1 (`kntt-lich-su-12-1`) trong `sach.json`, có thể bổ sung `summary` giàu từ khóa ngữ nghĩa (*"Tổ chức quốc tế duy trì hòa bình và an ninh thế giới sau Chiến tranh thế giới thứ hai, thành lập qua Hội nghị I-an-ta và Hiến chương Liên hợp quốc năm 1945"*), giữ `sections: []` để test `initialLessons.filter(hasReading).length === 2` và `empty.length === 15` luôn PASS!
3. **Các điểm cấm chạm vào & Điều kiện biên cần tránh:**
   - **KHÔNG** chỉnh sửa `app/data/content.ts`, `app/services/content.ts`, `app/api/**`.
   - **KHÔNG** làm hỏng bất kỳ bài test nào trong `npm test` (`tests/content.test.mjs`, `tests/curriculum.test.mjs`): sau khi sửa `app/services/learning.ts`, `bai-06.json` và `sach.json`, bắt buộc chạy `npm test` để xác nhận toàn bộ 14 test đều PASS.
   - Giữ trạng thái câu hỏi, câu trả lời và đáp án Quiz đang chọn khi người dùng chuyển qua lại giữa 3 tab `Đọc bài / Hỏi đáp / Luyện tập` trong cùng một bài học (quy tắc trong `AGENTS.md`).

---

### 4.6. Hợp đồng API `/api/ai-assistant` (`POST`) — Nâng cấp Action 3: `insert_image_semantic` hỗ trợ Vision AI (Ticket 4A — MỚI)
- **Mục đích:** Cho phép giáo viên tải trực tiếp file ảnh lịch sử thật (`imageDataUrl` dạng `data:image/jpeg|png|webp;base64,...`, dung lượng tối đa `<= 4MB`) lên `/api/ai-assistant` để Vision AI trên OpenRouter quan sát bức ảnh, sinh lời mô tả giàu thông tin cho người khiếm thị (`description`) và tự động định vị câu văn phù hợp ngữ nghĩa trong *Nội dung học* (`insertedAfterSentence`) để chèn vào (`insertedText`).
- **Quy tắc xác thực Request (`insertImageSemanticRequestSchema`):**
  - `action`: `"insert_image_semantic"` (bắt buộc)
  - `heading`: `string` (optional, tối đa 1000 ký tự)
  - `studyText`: `string` (optional, tối đa 50000 ký tự)
  - `sourceText`: `string` (optional, tối đa 50000 ký tự)
  - `imageCaption`: `string` (optional khi đã có `imageDataUrl`; bắt buộc nếu không có `imageDataUrl`; tối đa 2000 ký tự)
  - `imageContext`: `string` (optional, tối đa 5000 ký tự)
  - `imageDataUrl`: `string` (optional, phải khớp `^data:image/(?:jpeg|jpg|png|webp);base64,...` và có dung lượng ảnh giải mã `<= 4MB` / `4,194,304 bytes`).
  - Nếu cả `imageCaption` và `imageDataUrl` đều trống, API trả về `400 Bad Request` với thông báo: `"imageCaption: Hãy nhập tiêu đề/chú thích bức ảnh hoặc tải file ảnh lên (<= 4MB)."`
- **Kiểu Response TypeScript (`InsertImageSemanticResponse` trong `app/api/ai-assistant/route.ts`):**
```ts
export type InsertImageSemanticResponse = {
  description: string;           // Lời mô tả bức ảnh lịch sử cho học sinh khiếm thị
  insertedText: string;          // Văn bản Nội dung học sau khi đã chèn [Mô tả ảnh chèn tự động: ...]
  insertedAfterSentence: string; // Câu văn trong bài được chọn làm điểm neo để chèn ngay phía sau
  reason: string;                // Lý do chọn vị trí chèn theo ngữ nghĩa
  provider: "openrouter" | "local-fallback";
  fallback: boolean;
  model: string;
  usedVision?: boolean;          // true khi OpenRouter phân tích trực tiếp imageDataUrl bằng Vision AI
  notice?: string;               // Thông báo rõ trạng thái Vision AI hoặc lý do fallback cho giáo viên
};
```
- **JSON Request mẫu (khi giáo viên tải ảnh thật lên):**
```json
{
  "action": "insert_image_semantic",
  "heading": "Bối cảnh lịch sử và quá trình chuẩn bị khởi nghĩa",
  "studyText": "Ý chính 1: Giữa tháng 8 năm 1945, Nhật Bản đầu hàng Đồng minh không điều kiện, tạo thời cơ ngàn năm có một.\nÝ chính 2: Chiều ngày 16 tháng 8 năm 1945, một đơn vị Giải phóng quân do đồng chí Võ Nguyên Giáp chỉ huy xuất phát từ Tân Trào tiến về giải phóng thị xã Thái Nguyên.",
  "sourceText": "Chiều ngày 16-8-1945, theo lệnh của Ủy ban Khởi nghĩa toàn quốc, một đơn vị Giải phóng quân do Võ Nguyên Giáp chỉ huy xuất phát từ Tân Trào tiến về giải phóng thị xã Thái Nguyên...",
  "imageCaption": "Lễ xuất quân tại cây đa Tân Trào chiều 16/8/1945",
  "imageContext": "Đơn vị Giải phóng quân dưới bóng cây đa Tân Trào lắng nghe đọc Quân lệnh số 1",
  "imageDataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```
- **JSON Response thành công (`200 OK`) mẫu:**
```json
{
  "description": "Hình ảnh tư liệu tại cây đa Tân Trào chiều ngày 16 tháng 8 năm 1945 ghi lại cảnh đội hình các chiến sĩ Giải phóng quân đứng trang nghiêm dưới tán cây đa cổ thụ, lắng nghe đồng chí Võ Nguyên Giáp đọc Quân lệnh số 1 trước giờ xuất quân tiến về giải phóng thị xã Thái Nguyên.",
  "insertedText": "Ý chính 1: Giữa tháng 8 năm 1945, Nhật Bản đầu hàng Đồng minh không điều kiện, tạo thời cơ ngàn năm có một.\nÝ chính 2: Chiều ngày 16 tháng 8 năm 1945, một đơn vị Giải phóng quân do đồng chí Võ Nguyên Giáp chỉ huy xuất phát từ Tân Trào tiến về giải phóng thị xã Thái Nguyên. [Mô tả ảnh chèn tự động: Hình ảnh tư liệu tại cây đa Tân Trào chiều ngày 16 tháng 8 năm 1945 ghi lại cảnh đội hình các chiến sĩ Giải phóng quân đứng trang nghiêm dưới tán cây đa cổ thụ, lắng nghe đồng chí Võ Nguyên Giáp đọc Quân lệnh số 1 trước giờ xuất quân tiến về giải phóng thị xã Thái Nguyên.]",
  "insertedAfterSentence": "Ý chính 2: Chiều ngày 16 tháng 8 năm 1945, một đơn vị Giải phóng quân do đồng chí Võ Nguyên Giáp chỉ huy xuất phát từ Tân Trào tiến về giải phóng thị xã Thái Nguyên.",
  "reason": "Chèn ngay sau câu nói về sự kiện đơn vị Giải phóng quân xuất phát từ Tân Trào chiều 16/8/1945 để học sinh khiếm thị hình dung trực tiếp khung cảnh lễ xuất quân ngay trong mạch nghe.",
  "provider": "openrouter",
  "fallback": false,
  "model": "google/gemini-2.0-flash-001",
  "usedVision": true,
  "notice": "Đã phân tích trực tiếp hình ảnh tải lên bằng Vision AI (google/gemini-2.0-flash-001) và chèn mô tả vào đúng mạch ngữ nghĩa."
}
```

### 4.7. Phiếu bàn giao chi tiết cho Gemini (Ticket 4B)
1. **Danh sách chính xác file Gemini được phép sửa trong Ticket 4B:**
   - `app/components/lesson-editor.tsx`
   - `app/components/home-page.tsx`
   - `app/components/learning-app.tsx`
   - `app/study.css` (nếu cần bổ sung class CSS gọn sạch cho ô tải/xem trước ảnh nhỏ hoặc thanh tùy chọn tự động mở bài khi tìm bằng giọng nói)
   - `docs/agent-board.md` (cập nhật báo cáo bàn giao vào Mục 5)
2. **Yêu cầu chức năng cụ thể cho từng file:**
   - **Tại `app/components/lesson-editor.tsx` (Khung "AI Mô tả & Chèn ảnh theo ngữ nghĩa" của Bảng mục lục):**
     - Thêm nút/ô `<input type="file" accept="image/png,image/jpeg,image/webp" />` (kèm `<label>` rõ ràng cho trình đọc màn hình) cho phép giáo viên chọn tải file ảnh thật từ máy lên.
     - Khi giáo viên chọn file ảnh:
       - Kiểm tra định dạng (`image/png`, `image/jpeg`, `image/webp`). Nếu ảnh lớn hoặc cần tối ưu dung lượng, có thể tự nén nhẹ qua `<canvas>` (hoặc đọc bằng `FileReader.readAsDataURL`) và kiểm tra dung lượng `<= 4MB` (`4 * 1024 * 1024` bytes); nếu vượt quá 4MB thì báo lỗi rõ ràng ngay trên UI để giáo viên chọn ảnh nhỏ hơn.
       - Hiển thị khung xem trước ảnh nhỏ (thumbnail preview có `alt` phù hợp), tên/dung lượng file ảnh và nút **"Xóa ảnh đã chọn"** để giáo viên có thể gỡ ảnh bất kỳ lúc nào.
       - Nếu giáo viên đã tải ảnh lên mà để trống ô `Tiêu đề / chú thích bức ảnh`, vẫn cho phép bấm nút **"Chèn mô tả ảnh vào mục..."** (vì API đã hỗ trợ `imageCaption` là tùy chọn khi có `imageDataUrl`). Nếu cả `imageCaption` và ảnh tải lên đều trống thì mới chặn và nhắc giáo viên nhập chú thích hoặc chọn ảnh.
       - Gửi trường `imageDataUrl` (cùng `imageCaption`, `imageContext`, `heading`, `studyText`, `sourceText`) lên `POST /api/ai-assistant` với `action: "insert_image_semantic"`.
       - Hiển thị rõ thông báo kết quả (dựa trên `result.usedVision`, `result.provider`, `result.model` và `result.notice`): phân biệt rõ khi ảnh đã được phân tích trực tiếp bằng **Vision AI (`OpenRouter`)**, khi gọi OpenRouter theo văn bản, hoặc khi chạy **chế độ dự phòng cục bộ (`local-fallback`)**.
   - **Tại `app/components/home-page.tsx` và `app/components/learning-app.tsx` (Nâng cấp luồng "Tìm bằng giọng nói" mở thẳng bài học cho học sinh khiếm thị):**
     - Thêm tùy chọn checkbox/switch (mặc định **BẬT** / `true`, có nhãn rõ ràng và chuẩn ARIA): **"Tự động mở bài khớp nhất khi tìm bằng giọng nói"**.
     - Khi học sinh bấm **"Tìm bằng giọng nói"** và đọc câu tự nhiên (ví dụ: *"Tôi muốn tìm bài Tổng khởi nghĩa tháng Tám"*, *"Cây đa Tân Trào"*, *"Liên hợp quốc"*):
       - Ngay khi Web Speech Recognition trả về câu nhận diện (`transcript`), chạy tìm kiếm ngữ nghĩa `semanticSearchLessons(lessons, transcript)` và xác định bài khớp rõ ràng nhất (kết quả đầu tiên) cùng mục khớp nhất qua `findBestMatchingSection(topLesson, transcript)`.
       - Nếu tùy chọn **"Tự động mở bài khớp nhất khi tìm bằng giọng nói"** đang **BẬT** và tìm thấy bài khớp:
         1. Tự động mở thẳng tới đúng bài học đó và nhảy tới đúng mục khớp nhất (`sectionId` từ `findBestMatchingSection`, hoặc mục đầu tiên của bài nếu không có mục cụ thể).
         2. Đưa focus bàn phím/trình đọc màn hình vào đúng vùng tiêu đề mục (hoặc tiêu đề bài học vừa mở) để học sinh khiếm thị nghe tiếp hoặc thao tác phím `Tab` ngay lập tức.
         3. Phát thông báo ngắn gọn qua giọng đọc TTS (`window.speechSynthesis`, ngôn ngữ `vi-VN`) và đồng thời cập nhật vùng thông báo `role="status"` / `aria-live="polite"`, ví dụ: *"Đang mở Bài 6: Cách mạng tháng Tám năm 1945, Mục 6.1: Bối cảnh lịch sử và quá trình chuẩn bị khởi nghĩa."*
         4. **Tuân thủ tuyệt đối quy tắc âm thanh & video trong `AGENTS.md`:** Ngắt giọng đọc TTS cũ (`speechSynthesis.cancel()`) và tạm dừng mọi video đang phát trước khi đọc thông báo mới; tuyệt đối không tự động phát video (`autoplay`) khi mở bài.
       - Nếu không tìm thấy bài nào khớp với câu nói, đọc thông báo ngắn qua TTS và hiển thị ở `role="status"`: *"Không tìm thấy bài học phù hợp với câu nói vừa rồi."*
3. **Các điểm cấm chạm vào & Điều kiện biên cần tránh:**
   - **Cấm sửa** các file thuộc phạm vi của Argon chủ lực: `app/data/content.ts`, `app/services/content.ts`, `app/api/**`.
   - **Không** đưa bất kỳ khóa bí mật hay `OPENROUTER_API_KEY` nào xuống client; mọi yêu cầu phân tích ảnh chỉ gọi qua `POST /api/ai-assistant`.
   - **Không** lưu chuỗi `imageDataUrl` base64 nặng hàng MB trực tiếp vào `localStorage` (`suhoc-content-v2`) nếu không cần thiết (tránh làm tràn hạn mức 5MB của `localStorage`); mục tiêu của khung này là dùng Vision AI trích xuất lời mô tả ảnh (`description`) và chèn vào mạch *Nội dung học* (`insertedText`).
   - Giữ nguyên 100% các chức năng đã nghiệm thu ở Lượt 1, 2, 3 và đảm bảo toàn bộ 14/14 unit test (`npm test`) cùng `npx tsc --noEmit` và `npm run lint` đều PASS.


---

### 4.8. Hợp đồng Thiết kế Giao diện (Design Tokens & UI/A11y Contract) & Phiếu bàn giao Lượt chạy 5A (Ticket 5A-1 → Ticket 5A-2)

#### A. Hợp đồng Schema & API (Giữ nguyên 100%)
- **Không thay đổi** `app/data/content.ts`, `app/services/content.ts`, `app/api/**`.
- Toàn bộ kiểu dữ liệu (`Lesson`, `Section`, `Block`, `Question`, `Progress`, `Workspace`, `Course`, `OpenLessonOptions`), khóa `localStorage` (`suhoc-content-v2`, `suhoc-progress-v1`, `suhoc-prefs-v1-*`) và endpoint `POST /api/ai-assistant` giữ nguyên 100%.

#### B. Hệ thống Design Tokens bắt buộc trong `app/study.css` (Mục 2 `docs/ke-hoach-cai-tien-giao-dien.md`)
1. **Chế độ Mặc định (`:root, .textbook-app`):**
   - `--bg-page` / `--paper`: `#f8fafc` (nền trang xám lạnh siêu nhạt tạo chiều sâu cho thẻ trắng).
   - `--surface` / `--white`: `#ffffff` (bề mặt thẻ, thanh header, vùng bài đọc, cột mục lục).
   - `--border`: `#e2e8f0` (viền mảnh tinh tế; dùng `#94a3b8` hoặc `#cbd5e1` cho viền nút/ô nhập và khi hover).
   - `--ink`: `#0f172a` (chữ chính, tương phản > 15:1 trên nền trắng).
   - `--muted`: `#475569` (chữ phụ, tương phản > 7:1 đạt chuẩn AAA).
   - `--accent` / `--green`: `#1e5480` (màu nhấn duy nhất — chỉ dùng cho **nút chính CTA `.primary`**, **tab đang chọn**, và **điểm nhấn tiến độ**).
   - **Token tương thích cho các vùng phụ:**
     - `--nav-bg`: `#ffffff` | `--nav-sub-bg`: `#f8fafc` | `--nav-active-bg`: `#f1f5f9`
     - `--btn-bg`: `#ffffff` | `--btn-hover-bg`: `#f1f5f9` | `--btn-border`: `#cbd5e1` | `--btn-ink`: `#1e293b`
     - `--done-bg`: `#ecfdf5` | `--done-ink`: `#065f46` | `--done-border`: `#a7f3d0`
     - `--danger-bg`: `#fef2f2` | `--danger-hover-bg`: `#fee2e2` | `--danger-ink`: `#991b1b` | `--danger-border`: `#fecaca`
2. **Chế độ Tương phản cao (`.high-contrast, .textbook-app.high-contrast`):**
   - Nền `--bg-page` / `--paper` / `--white` / `--surface`: `#ffffff`.
   - Chữ `--ink`: `#000000`, `--muted`: `#1e293b`, `--green` / `--accent`: `#0b2e4e`.
   - Viền `--border` / `--btn-border`: `#0f172a` (các thẻ chính, nút, ô nhập dùng viền rõ `2px solid #0f172a`), tắt toàn bộ `box-shadow: none`.
3. **Chế độ Chữ lớn (`.large-type, .textbook-app.large-type`):**
   - Giữ cơ chế phóng tỷ lệ chữ, khoảng cách dòng thoáng và không làm tràn/cắt chữ ở màn hình hẹp.
4. **Typography, Vùng bấm & Vòng Focus (WCAG 2.2 AA):**
   - Giao diện chung: `16px`, `line-height: 1.6`.
   - Nội dung bài đọc: `18px`, `line-height: 1.75`, độ rộng đoạn văn `max-width: 68ch`, khoảng cách đoạn `1.25em`.
   - Phân cấp tiêu đề: `h1: 1.75rem (700)`, `h2: 1.35rem (700)`, `h3: 1.1rem (600)`.
   - Mọi nút/liên kết tương tác có `min-height: 44px`; vòng focus `:focus-visible` là `3px solid #1d4ed8` với `outline-offset: 3px`.
   - Thẻ lớn `border-radius: 12px`, nút/ô nhập `border-radius: 8px`, bóng đổ nhẹ `0 1px 2px rgba(15, 23, 42, 0.04)`.

#### C. Yêu cầu cải tiến chi tiết trên 5 file cho Gemini (Ticket 5A-2)
1. **Danh sách file Gemini được phép sửa trong Ticket 5A-2:**
   - `app/study.css`
   - `app/components/home-page.tsx`
   - `app/components/course-picker.tsx`
   - `app/components/learning-app.tsx`
   - `app/components/study-outline.tsx`
   - `docs/agent-board.md` (cập nhật báo cáo bàn giao vào Mục 5)
2. **Chi tiết 5 hạng mục giao diện cần thực hiện:**
   - **Hạng mục 1 — Thanh điều hướng trên cùng (Top Header — `app/study.css`, `app/components/learning-app.tsx`):**
     - Đổi nền xanh `#eaf3fc` của `.textbook-app .sidebar` sang nền trắng tinh `#ffffff`, viền dưới mảnh `1px solid #e2e8f0`, chiều cao gọn (`padding: 12px 32px`), bám dính nhẹ (`position: sticky; top: 0; z-index: 40`).
     - Mục điều hướng `.nav-item` chuyển sang kiểu **Underline Tab hiện đại**: mặc định nền trong suốt, chữ `#475569`; khi `.active` (hoặc `aria-current="page"`) dùng chữ xanh nhấn `var(--green)` đậm `600` + gạch chân `2px solid var(--green)` (bỏ hộp nền xanh viền xanh).
     - Nút phụ (`.secondary`, `.utility`, `.inline-link`) dùng nền `#ffffff`, viền `1px solid #cbd5e1`, chữ `#1e293b`, hover `#f1f5f9`; bỏ hoàn toàn nền xanh nhạt tràn lan trên các nút phụ.
   - **Hạng mục 2 — Thanh chọn Môn / Lớp / Sách (`app/components/course-picker.tsx`, `app/study.css`):**
     - Đặt gọn trên nền trắng sạch `#ffffff`, viền dưới `1px solid #e2e8f0`, các ô `<select>` bo góc `8px`, viền `1px solid #cbd5e1`, `min-height: 44px`; bỏ dải nền xanh dày.
   - **Hạng mục 3 — Trang Kho học liệu (`app/components/home-page.tsx`, `app/study.css`):**
     - **Thanh Tìm kiếm & Giọng nói nổi bật:** Ô `input[type="search"]` có `min-height: 50px`, `border-radius: 12px`, nền `#ffffff`, viền `1px solid #cbd5e1`, bóng nhẹ khi focus; đi liền nút **Tìm bằng giọng nói** bo góc đồng bộ (nền trắng viền `#cbd5e1` chữ xanh nhấn khi tắt; nền `var(--green)` hoặc đỏ nhấn rõ khi đang thu âm `aria-pressed="true"`).
     - **Tùy chọn tự động mở bài (`.voice-auto-open-toggle`):** Bỏ khung hộp nền xanh, hiển thị thành 1 dòng chữ nhỏ gọn sạch ngay dưới thanh tìm kiếm (vẫn đảm bảo vùng chạm `min-height: 44px` và `<label htmlFor="voice-auto-open-checkbox">`).
     - **Bộ lọc dạng Underline Tabs (`.catalog-filters`):** Chuyển 3 nút lọc (`Có bài đọc`, `Có video`, `Toàn bộ mục lục`) từ 3 hộp nút màu xanh/đỏ/ngọc sang thanh tab ngang có đường viền dưới `1px solid #e2e8f0`; nút đang chọn (`aria-pressed="true"`) có chữ `var(--green)` đậm và gạch chân `3px solid var(--green)`, nền trong suốt.
     - **Thẻ danh sách bài học sạch sẽ (`.lesson-row`):**
       - Nền trắng `#ffffff` trên nền trang `#f8fafc`, viền `1px solid #e2e8f0`, `border-radius: 12px`, `padding: 16px 20px`, hover viền `#94a3b8` và bóng nhẹ.
       - Ô số bài (`.catalog-lesson-number`): nền xám nhạt `#f1f5f9`, chữ `#334155`, viền `#e2e8f0`; khi `done` chuyển sang xanh lá nhẹ (`#ecfdf5`, chữ `#065f46`, viền `#a7f3d0`); khi `in-progress` viền nhấn `var(--green)`.
       - **Tối giản nhãn màu thừa:** Không gắn 3–4 pill màu sặc sỡ (xanh dương, đỏ hồng, tím...) trên mỗi bài. Thay bằng **1 dòng metadata chữ xám `#475569` tinh tế** ngăn cách bằng dấu chấm `·` (ví dụ: `Có bài đọc · Video tham khảo · 3 câu luyện tập`); chỉ hiển thị 1 pill nhấn gọn khi có **Khớp ngữ nghĩa** (`matched`) hoặc **Tiến độ học** (`summary.label`).
   - **Hạng mục 4 — Trang Học bài (`app/components/learning-app.tsx`, `app/study.css`):**
     - **1 dòng Breadcrumb gọn thay cho 3 nút shortcut to đầu bài:** Ngay trên `<h1>` tên bài trong `.lesson-heading`, hiển thị thanh `<nav aria-label="Đường dẫn bài học" className="lesson-breadcrumb">` gồm nút/link `← Kho học liệu` (gọi `navigate("home")`), dấu phân cách `/`, `{lesson.subject} {lesson.grade}`, dấu `/`, `Bài {lesson.textbook?.lessonNumber}` (và liên kết nhảy nhanh `Mục lục bài ↓` trỏ tới `#book-navigation` cho người dùng bàn phím/screen reader).
     - **Tab hoạt động (`Đọc bài` | `Hỏi đáp` | `Luyện tập`) kiểu Underline Tabs:** Thanh `.reader-navigation` bỏ khung hộp nền xanh, dùng đường viền dưới `1px solid #e2e8f0`; nút đang chọn (`aria-pressed="true"`) có chữ `var(--green)` đậm `600` và gạch chân `3px solid var(--green)`, nền trong suốt.
     - **Thanh điều khiển Nghe bài (TTS Audio Player) hiện trực tiếp — KHÔNG giấu trong `<details>`:**
       - Ngay đầu `#panel-read` (khi `lesson.sections.length > 0`), đặt thanh `.listen-controls-bar` (`background: #f8fafc`, `border: 1px solid #e2e8f0`, `border-radius: 10px`, `padding: 12px 16px`) hiển thị trực tiếp:
         1. Nút chính (`.primary`): **`Nghe toàn bài`** / **`Tạm dừng`** / **`Tiếp tục`**.
         2. Nút phụ (`.secondary`): **`Nghe tóm tắt`** (đọc bản tóm tắt & danh sách đề mục bài học).
         3. Bộ chọn tốc độ đọc (`<label htmlFor="rate">Tốc độ</label>` + `<select id="rate">` `0.8× / 1× / 1.2× / 1.5×`) và nút phụ **`Dừng`**.
         4. Nếu `!speechAvailable`, vẫn hiển thị dòng thông báo lịch sự cho học sinh biết thiết bị chưa hỗ trợ Web Speech TTS và có thể dùng trình đọc màn hình.
     - **Thu gọn Khung Tóm tắt nhanh & Nguồn tài liệu vào `<details>` gọn gàng:**
       - Chuyển khung **Trích xuất nhanh: Tóm tắt & Ý chính bài học** thành `<details className="quick-summary-details">` gọn 1 dòng tiêu đề `<summary>Tóm tắt nhanh & Ý chính bài học ({lesson.sections.length} mục)</summary>` đặt cạnh hoặc ngay trên `<details className="reading-source">` (mặc định đóng để học sinh mở bài ra là **thấy ngay Mục 1 rõ ràng** ngay dưới thanh Nghe bài TTS).
     - **Định dạng văn bản bài đọc chuẩn 68ch:**
       - Mỗi `.reading-section` có `padding: 24px 0 32px`, phân tách bằng đường kẻ mảnh `1px solid #e2e8f0`; nhãn `MỤC 6.1` gọn tinh tế; văn bản trong `.reading-section` / `.content-blocks` đạt `font-size: 18px` (`1.125rem`), `line-height: 1.75`, `max-width: 68ch`, khoảng cách giữa các đoạn `1.25em`.
       - Hộp `<details className="source-comparison">` (*Xem đối chiếu Nội dung gốc SGK*) và hàng nút `.section-actions` (`Đánh dấu đã đọc`, `Nghe mục này`) ở chân mục dùng nền trắng/xám sáng `#f8fafc`, viền mảnh `#e2e8f0`.
   - **Hạng mục 5 — Cột phải Mục lục & Tiến độ (`app/components/study-outline.tsx`, `app/study.css`):**
     - Chuyển `.study-outline` sang thẻ nền trắng `#ffffff`, viền mảnh `1px solid #e2e8f0`, `border-radius: 12px`, bám dính `position: sticky; top: 80px` trên desktop (`max-height: calc(100dvh - 96px)`).
     - Bỏ nền xanh `--nav-bg` ở `.study-outline-heading` và `.study-syllabus summary`; dùng nền trắng/xám nhạt `#f8fafc`, thanh `<progress>` mảnh `6px` hiện đại.
     - Trên màn hình nhỏ (`<= 900px` / `< 960px`), giữ nguyên thứ tự DOM: **nội dung bài học (`.study-content`) hiển thị trước, cột mục lục (`.study-outline`) xếp phía dưới**.

#### D. Các quy tắc Tiếp cận (A11y) & Điều kiện biên tuyệt đối không được làm mất
1. **Không chạm vào file ngoài phạm vi:** Không sửa `app/data/content.ts`, `app/services/content.ts`, `app/api/**`, `app/components/lesson-editor.tsx` (phần Giáo viên để dành cho Lượt chạy 5B), hay `tests/**`.
2. **Bảo toàn 100% ngữ nghĩa & điều hướng bàn phím cho học sinh khiếm thị:**
   - Giữ `skip-link` (*Bỏ qua điều hướng* → `#main`), các `ref={headingRef}` với `tabIndex={-1}`, `id={s.id}` trên từng tiêu đề mục `<h2>`, `id="book-navigation"` trên tiêu đề mục lục, và `id="panel-read" | "panel-ask" | "panel-quiz"`.
   - Giữ đầy đủ `aria-pressed`, `aria-current="page"`, `aria-controls`, `aria-label`, `role="status"`, `aria-live="polite"`.
   - Giữ nguyên logic TTS ngắt video đang phát (`audioActive={speech !== "stopped"}`), dừng TTS khi thu âm giọng nói (`onVoiceStart={stopSpeech}`), và không tự động phát video.
   - Giữ nguyên state câu hỏi, câu trả lời AI và các lựa chọn đáp án Quiz khi chuyển qua lại giữa 3 tab `Đọc bài / Hỏi đáp / Luyện tập`.
3. **Kiểm chứng bắt buộc trước khi bàn giao:** Chạy `npx tsc --noEmit`, `npm run lint` và `npm test` đảm bảo `0` lỗi và `14/14` test PASS.


---

### 4.9. Hợp đồng Thiết kế Giao diện & Phiếu bàn giao Lượt chạy 5B (Ticket 5B-1 → Ticket 5B-2: Cải tiến Không gian Giáo viên)

> **Quyết định kiến trúc từ Argon chủ lực (Ticket 5B-1):**
> - Lượt chạy 5B tập trung 100% vào cải tổ bố cục, phân cấp thị giác và trải nghiệm so sánh song song 2 cột tại tab **"Bảng mục lục & AI"** của Không gian Giáo viên theo `docs/ke-hoach-cai-tien-giao-dien.md` (Mục 3 — Lượt chạy 5B).
> - **Không thay đổi** `app/data/content.ts`, `app/services/content.ts`, `app/api/ai-assistant/route.ts` hay `app/api/import-document/route.ts`. Toàn bộ kiểu `Lesson`, `Section`, `Block`, `Question`, khóa lưu trữ `suhoc-content-v2` và hợp đồng 5 action của `POST /api/ai-assistant` được giữ nguyên 100%.

#### A. Hợp đồng hàm nghiệp vụ, State & API phải bảo toàn 100% trong `app/components/lesson-editor.tsx`
1. **Giữ nguyên 100% các hàm đồng bộ dữ liệu & thao tác cấu trúc mục:**
   - `updateSectionInTable(sectionId: string, patch: Partial<Section>)`: Cập nhật `code`, `heading`, `sourceText`, `videoUrl` của mục và gọi `materialize(...)`.
   - `updateSectionStudyText(sectionId: string, studyText: string)`: Đồng bộ văn bản *Nội dung học* với `blocks` của mục thông qua `syncStudyTextToBlocks(s, studyText)` (bảo toàn toàn bộ khối `image`, `table`, `list` không phải `paragraph`).
   - `handleRenumberCodes()`: Đánh lại mã mục tự động (`1.1, 1.2...`, `6.1, 6.2...`) theo `draft.textbook?.lessonNumber` qua `renumberSectionCodes(...)`.
   - `splitSectionAt(index: number)`: Tách 1 mục thành 2 mục liên tiếp (chia đôi cả `sourceText` và `studyText`, giữ các block hình/bảng/danh sách ở mục đầu, tự động đánh lại mã mục).
   - `mergeSectionWithNext(index: number)`: Gộp mục `index` với mục `index + 1` (nối `heading`, `sourceText`, `blocks`, `keywords`, giữ `videoUrl`, cập nhật `sourceSectionId` của các câu hỏi `questions` trỏ sang mục gộp, tự động đánh lại mã mục).
   - `addSectionInTable()`: Thêm mục mới vào cuối danh sách và đánh lại mã mục.
2. **Giữ nguyên 100% 4 luồng gọi AI (`POST /api/ai-assistant`) và luồng tải/nén ảnh Vision AI:**
   - **Action 1 — `splitOutlineWithAI(sourceMode: "file" | "draft" | "paste")`:** Gửi `{ action: "split_outline", rawText, lessonNumber, lessonTitle }`, cập nhật `draft.sections`, bảo toàn `sourceSectionId` hợp lệ cho `draft.questions`, cập nhật `aiMeta` và thông báo `role="status"`.
   - **Action 2 — `generateStudyContentForSection(section: Section, displayCode: string)`:** Gửi `{ action: "generate_study_content", heading, sourceText, imageDescriptions, lessonTitle }`, cập nhật `blocks` qua `syncStudyTextToBlocks(s, studyText)` và hợp nhất `keywords`.
   - **Action 3 — `insertImageSemanticForSection(section: Section, displayCode: string)` + `handleSelectVisionImage(file)` + `clearSelectedImage()`:** Giữ nguyên cơ chế kiểm tra định dạng (`PNG, JPG, WebP`), tự nén ảnh qua `<canvas>` (`prepareVisionImageDataUrl`, `<= 4 MB`), chỉ giữ `imageDataUrl` trong React state tạm (không ghi base64 vào `localStorage`), gửi `{ action: "insert_image_semantic", heading, studyText, sourceText, imageCaption, imageContext, imageDataUrl }`, lưu kết quả vào `semanticInsertResults[section.id]` (hiển thị `provider`, `usedVision`, `model`, `notice`, `insertedAfterSentence`, `reason` và nút `Ẩn ghi chú`).
   - **Action 4 — `generateQuizForSection(section: Section, displayCode: string)`:** Gửi `{ action: "generate_quiz", sectionId: section.id, heading, studyText, sourceText, count: 2 }`, nối câu hỏi mới vào `draft.questions` với `sourceSectionId: section.id`.

#### B. Danh sách file Gemini được phép chỉnh sửa ở Ticket 5B-2
1. `app/components/lesson-editor.tsx` *(chỉ cải tổ phần render giao diện của tab `pane === "table"` và thêm state cục bộ chuyển chế độ hiển thị thẻ chi tiết / bảng mục lục rút gọn)*.
2. `app/study.css` *(bổ sung/nâng cấp các class CSS cho Split-View Section Cards, thanh công cụ, khung Vision AI, bảng mục lục rút gọn và chế độ `.high-contrast` / `.large-type` / responsive mobile)*.
3. `docs/agent-board.md` *(ghi báo cáo hoàn thành Ticket 5B-2 vào Mục 5)*.

#### C. Đặc tả UI/UX & Cấu trúc DOM chi tiết cho Gemini (Ticket 5B-2)
1. **Thanh công cụ trên cùng của tab `"Bảng mục lục & AI"` (`.outline-toolbar`):**
   - Giữ 3 nút thao tác toàn cục:
     - Nút chính (`.primary`): **`Tự động tách thành Bảng mục lục (AI)`** (`onClick={() => splitOutlineWithAI("draft")}`).
     - Nút phụ (`.secondary`): **`Đánh lại mã mục tự động`** (`onClick={handleRenumberCodes}`).
     - Nút phụ (`.secondary`): **`Thêm mục vào bảng`** (hoặc `Thêm mục mới`, `onClick={addSectionInTable}`).
   - **Thêm nút chuyển đổi nhanh chế độ xem (View Mode Toggle):**
     - Thêm state cục bộ trong `LessonEditor`, ví dụ: `const [compactOutlineView, setCompactOutlineView] = useState(false);`.
     - Thêm nút `.secondary` có `type="button"`, `aria-pressed={compactOutlineView}`, `aria-label="Chuyển đổi chế độ xem mục lục rút gọn hoặc thẻ so sánh chi tiết"`:
       - Khi `compactOutlineView === false` (mặc định — **Chế độ Thẻ so sánh 2 cột**): nhãn nút là **`Xem mục lục rút gọn`** (hoặc hiển thị cặp nút/toggle rõ ràng).
       - Khi `compactOutlineView === true` (**Chế độ Xem mục lục rút gọn**): nhãn nút là **`Xem thẻ so sánh 2 cột (Chi tiết)`** (hoặc giữ nhãn **`Xem mục lục rút gọn`** với `aria-pressed="true"` để trình đọc màn hình nhận biết trạng thái bật/tắt nhất quán).
   - Giữ huy hiệu trạng thái nguồn AI `.outline-ai-badge` (`role="status"`) và hộp `<details className="outline-paste-panel">` (*Dán văn bản SGK hoặc tài liệu mới để tách bằng AI*).

2. **Chế độ mặc định (`!compactOutlineView`): Danh sách Thẻ cấu trúc so sánh 2 cột (Split-View Section Cards — `.outline-cards-list` / `.outline-section-card`):**
   - Thay bảng 6 cột ngang bị bóp chữ bằng danh sách thẻ `.outline-section-card` (mỗi mục là một `<article>` hoặc `<section>` có `aria-label={`Mục ${displayCode}: ${section.heading || "Chưa đặt tên"}`}`, nền trắng `--surface` `#ffffff`, viền `1px solid var(--border)` `#e2e8f0`, `border-radius: 12px`, `box-shadow: var(--shadow-sm)`).
   - **Phần 1 — Header mỗi thẻ mục (`.outline-card-header`):**
     - Ô **`Mã mục`**: rộng gọn `72px` (`width: 72px` / `flex: 0 0 72px`), chữ đậm căn giữa, kèm nhãn/aria-label `Mã mục dòng ${index + 1}`.
     - Ô **`Tiêu đề mục`**: rộng rãi (`flex: 1 1 240px`), chữ đậm rõ ràng, kèm `aria-label={`Tiêu đề ${rowContext}`}`.
     - Nhóm nút cấu trúc mục (`.outline-card-struct-actions`):
       - Nút **`Tách làm 2 mục`** (`onClick={() => splitSectionAt(index)}`, `aria-label={`Tách làm 2 mục từ ${rowContext}`}`).
       - Nút **`Gộp xuống mục dưới`** (`onClick={() => mergeSectionWithNext(index)}`, `disabled={busy || index >= draft.sections.length - 1}`, `aria-label={`Gộp ${rowContext} xuống mục dưới`}`).
   - **Phần 2 — Thân mỗi thẻ mục chia 2 cột 50% – 50% trên desktop, xếp dọc trên mobile (`.outline-card-split`):**
     - Sử dụng CSS Grid `grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;` trên desktop (và chuyển về `grid-template-columns: 1fr;` ở `@media (max-width: 900px)`).
     - **Cột trái — Nội dung gốc (SGK) (`.outline-split-col.is-source`):**
       - Nền xám sáng `#f8fafc` (`var(--bg-page)` / `var(--nav-sub-bg)`), viền `1px solid var(--border)`, `border-radius: 10px`, `padding: 14px`.
       - Có nhãn tiêu đề cột rõ ràng: **`Nội dung gốc (SGK)`** (kèm chú thích nhỏ *"Văn bản trích từ sách giáo khoa để đối chiếu & làm đầu vào AI"*).
       - `<textarea rows={6}>` rộng 100%, giữ nguyên `aria-label={`Nội dung gốc sách giáo khoa của ${rowContext}`}` và `onChange` gọi `updateSectionInTable(section.id, { sourceText: e.target.value })`.
     - **Cột phải — Nội dung học cho người khiếm thị (`.outline-split-col.is-study`):**
       - Nền trắng `#ffffff` (`var(--surface)`), viền nhấn nhẹ `1px solid #cbd5e1` (hoặc viền trái `3px solid var(--green)` tinh tế), `border-radius: 10px`, `padding: 14px`.
       - Có nhãn tiêu đề cột rõ ràng: **`Nội dung học (Đọc cho học sinh khiếm thị)`** (kèm chú thích nhỏ *"Văn bản mạch lạc dùng cho trình đọc màn hình & giọng đọc TTS"*).
       - `<textarea rows={6}>` rộng 100%, giữ nguyên `aria-label={`Nội dung học của ${rowContext}`}` và `onChange` gọi `updateSectionStudyText(section.id, e.target.value)`.
       - Giữ nguyên thông báo `nonParagraphCount > 0` (*"Giữ nguyên {nonParagraphCount} khối hình/bảng/danh sách..."*) và hộp thông báo kết quả chèn ảnh ngữ nghĩa `.outline-semantic-note` (`role="status"`) ngay dưới ô Nội dung học.
   - **Phần 3 — Chân mỗi thẻ mục (`.outline-card-footer`):**
     - Xếp gọn trên 1 hàng linh hoạt (`display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;`):
       - Cụm trái (`.outline-card-video`): Nhãn gọn `Link Video URL` + `<input type="url" placeholder="https://..." />` (`flex: 1 1 260px`), giữ nguyên `aria-label={`Đường dẫn video của ${rowContext}`}` và `onChange` gọi `updateSectionInTable(section.id, { videoUrl: e.target.value })`.
       - Cụm phải — Thanh **3 nút AI** (`.outline-card-ai-bar`):
         1. **`AI Chế biến Nội dung học`** (`generateStudyContentForSection(section, displayCode)`).
         2. **`AI Mô tả & Chèn ảnh theo ngữ nghĩa`** (bật/tắt `imagePanelOpen`, có `aria-expanded={imagePanelOpen}` và `aria-controls`).
         3. **`AI Tạo câu hỏi Quiz`** (`generateQuizForSection(section, displayCode)`).
     - Khi `imagePanelOpen === true`, hiển thị khung `<fieldset id={`image-panel-${section.id}`} className="outline-image-panel">` rộng rãi ngay bên dưới hoặc trong thẻ mục với đầy đủ tính năng tải ảnh Vision AI (`<input type="file">`, thumbnail xem trước, dung lượng, nút Xóa ảnh, ô Tiêu đề/Chú thích ảnh, ô Bối cảnh/Chi tiết ảnh, nút Chèn mô tả ảnh và nút Đóng).

3. **Chế độ thu gọn (`compactOutlineView === true`): Bảng "Xem mục lục rút gọn" 2 cột (`.outline-compact-table`):**
   - Hiển thị một `<table>` gọn sạch có `aria-label="Bảng mục lục rút gọn toàn bài"` và `<caption>` rõ ràng, chỉ gồm **2 cột**:
     1. **Cột 1 — `Mã mục` (`width: 96px`):** `<input type="text">` cho phép sửa nhanh mã mục (`updateSectionInTable(section.id, { code: e.target.value })`).
     2. **Cột 2 — `Tiêu đề mục`:** `<input type="text">` rộng rãi cho phép sửa nhanh tiêu đề mục (`updateSectionInTable(section.id, { heading: e.target.value })`), có thể kèm nút nhỏ *"Mở thẻ chi tiết"* để chuyển về `compactOutlineView = false` và đưa focus tới đúng thẻ mục đó.
   - Giúp giáo viên nhìn bao quát toàn bộ cấu trúc đề mục của bài học chỉ trong một tầm mắt.

#### D. Các quy tắc Tiếp cận (A11y) & Điều kiện biên bắt buộc
1. **Không sửa các tab khác hoặc file ngoài phạm vi:** Giữ nguyên hoạt động của các tab `"Nội dung"`, `"Nguồn & nhập tệp"`, `"Luyện tập"`, `"Video"` và chế độ `"2. Xem trước và kiểm tra"`. Không sửa `app/data/content.ts`, `app/services/content.ts`, `app/api/**`, hay `tests/**`.
2. **Chuẩn tiếp cận (Accessibility) & 4 chế độ hiển thị:**
   - Giữ đầy đủ `aria-label` tiếng Việt có ngữ cảnh (`rowContext`), `aria-pressed`, `aria-expanded`, `aria-controls`, `role="status"`, `role="alert"`.
   - Mọi nút bấm và ô nhập đạt `min-height: 44px`, vòng focus `:focus-visible` `3px solid #1d4ed8` (`outline-offset: 3px`).
   - Hỗ trợ hoàn hảo chế độ **Chữ lớn** (`.large-type`), **Tương phản cao** (`.high-contrast`: nền trắng `#ffffff`, chữ `#000000`, viền `2px solid #0f172a`, `box-shadow: none`) và màn hình di động `360px`.
3. **Kiểm chứng bắt buộc trước khi bàn giao:** Chạy `npx tsc --noEmit`, `npm run lint` và `npm test` đạt `0` lỗi, `14/14` test PASS.

---

## 5. Báo cáo bàn giao từ Gemini
- **2026-11-24 (Ticket 1B — Bảng mục lục & AI cho Giáo viên):** Đã hoàn thành và đạt nghiệm thu ở Lượt chạy 1 (`STATUS: PASS`).
- **2026-11-24 (Ticket 2B — 3 nút AI theo từng dòng Bảng mục lục & Video URL đa nguồn):** Đã hoàn thành và đạt nghiệm thu ở Lượt chạy 2 (`STATUS: PASS`).
- **2026-11-24 (Ticket 3B — Tìm kiếm ngữ nghĩa/giọng nói, Đọc tóm tắt & đối chiếu SGK, Hỏi đáp AI có trích dẫn, Lộ trình học cá nhân & Dữ liệu mẫu Bài 6/Bài 1):**
  - **Các file đã chỉnh sửa:**
    - `app/services/learning.ts`: Bổ sung `findBestMatchingSection`, `semanticSearchLessons` (tích hợp với `searchLessons`, hỗ trợ từ điển đồng nghĩa lịch sử & bảo toàn các truy vấn số bài / Chủ đề), và `buildPersonalLearningPath` (phân loại mục *Đã nắm vững* / *Cần ôn lại* theo tiến độ đọc và kết quả Quiz).
    - `app/components/home-page.tsx`: Nối tìm kiếm ngữ nghĩa, thêm nút **Tìm bằng giọng nói** (Web Speech API `vi-VN` kèm `aria-pressed`, `aria-label` và thông báo `role="status"` khi trình duyệt không hỗ trợ/từ chối micro), hiển thị nhãn `Khớp ngữ nghĩa: Mục ...` để bấm mở thẳng tới đúng mục.
    - `app/components/learning-app.tsx`:
      - Tab `Đọc bài`: Thêm khung **Trích xuất nhanh: Tóm tắt & Ý chính bài học** kèm nút **Nghe tóm tắt** (ngắt video khi phát TTS); hiển thị mã mục `MỤC 6.1`, `MỤC 6.2`... và hộp mở rộng `<details>` **Xem đối chiếu Nội dung gốc (SGK)** khi mục có `sourceText`.
      - Tab `Hỏi đáp`: Nối `POST /api/ai-assistant` (`action: "ask_lesson"`) với fallback cục bộ an toàn; phân biệt rõ nhãn `Trợ giảng AI (OpenRouter)` và `Truy hồi ngữ nghĩa theo đoạn nguồn (Bộ xử lý cục bộ)`; thêm nút **Nghe câu trả lời**, nút trích dẫn nhảy thẳng tới đoạn nguồn (`source-<blockId>` / `<sectionId>`) và nút câu hỏi gợi ý (`suggestedQuestions`).
      - Tab `Luyện tập` & trang `Học liệu đang học`: Hiển thị khung **Lộ trình học cá nhân** liệt kê mục *Đã nắm vững (✓)*, mục *Cần nghe / đọc lại* kèm nút nhảy thẳng về mục đó và gợi ý bài tiếp theo.
    - `app/study.css`: Thêm định dạng gọn sạch dùng hệ biến xanh lam trầm cho thanh tìm kiếm giọng nói, khung Tóm tắt nhanh, hộp đối chiếu SGK, thẻ câu trả lời AI/trích dẫn/gợi ý và khung Lộ trình học cá nhân, hỗ trợ đủ 4 chế độ (Mặc định, Chữ lớn, Tương phản cao, cả hai) và responsive `320px–390px`.
    - `content/lich-su/lop-12/ket-noi-tri-thuc/bai-06.json`: Bổ sung `code` (`6.1`, `6.2`, `6.3`), `sourceText` đối chiếu mẫu, `keywords` ngữ nghĩa và mô tả ảnh tư liệu cây đa Tân Trào chiều 16/8/1945 lồng vào mạch văn mục `6.1`; giữ nguyên `id` và `provenance.kind: "demo"`.
    - `content/lich-su/lop-12/ket-noi-tri-thuc/sach.json`: Bổ sung `summary` giàu từ khóa ngữ nghĩa cho Bài 1 (`kntt-lich-su-12-1`) và Bài 6 (`cach-mang-thang-tam`), giữ nguyên `sections: []` để bảo toàn 14/14 test PASS.
  - **Kiểm chứng:** `npx tsc --noEmit` (`0` lỗi), `npm run lint` (`0` lỗi; chỉ có 1 cảnh báo sẵn có ở `app/api/ai-assistant/route.ts`), `npm test` (`14` đạt, `0` lỗi, `4` bỏ qua). Chưa mở trình duyệt/NVDA và chưa chạy `npm run build` (bàn giao `Argon chủ lực` Review & build).

- **2026-11-24 (Ticket 4B — Vision AI đọc ảnh thật trong Bảng biên tập & Ra lệnh giọng nói tự động mở bài học):**
  - **Các file đã chỉnh sửa:**
    - `app/components/lesson-editor.tsx`: Nâng cấp khung **AI Mô tả & Chèn ảnh theo ngữ nghĩa** trong Bảng mục lục — thêm ô tải tệp ảnh thật (`<input type="file" accept="image/png,image/jpeg,image/webp" />`) kèm `<label>` rõ ràng cho trình đọc màn hình, khung xem trước ảnh nhỏ (`alt`, tên tệp, dung lượng), nút **Xóa ảnh**, cơ chế kiểm tra & tự nén nhẹ ảnh qua `<canvas>` bảo đảm `<= 4 MB` trước khi gửi `imageDataUrl` lên `POST /api/ai-assistant` (chỉ giữ trong React state tạm, không lưu base64 nặng vào `localStorage`). Cho phép bấm chèn khi có `imageCaption` hoặc `imageDataUrl` và hiển thị rõ trạng thái `usedVision` / `provider` / `notice` (Vision AI · OpenRouter LLM, OpenRouter chế độ văn bản, hay Bộ xử lý cục bộ).
    - `app/components/home-page.tsx`: Thêm tùy chọn mặc định bật **Tự động mở bài khớp nhất khi tìm bằng giọng nói** (checkbox chuẩn tiếp cận). Khi nhận diện câu nói tiếng Việt tự nhiên và `semanticSearchLessons` tìm thấy bài khớp, tự động tìm mục khớp nhất (`findBestMatchingSection`), gọi `onOpen` mở thẳng bài/mục đó kèm thông báo trạng thái `role="status"` / `aria-live="polite"` và dừng TTS cũ ngay khi bắt đầu nghe micro.
    - `app/components/learning-app.tsx`: Lưu tùy chọn `voiceAutoOpen` theo tài khoản (mặc định bật); nâng cấp `openLesson` nhận `OpenLessonOptions` để sau khi chuyển sang trang đọc bài và đưa focus vào mục đích sẽ cập nhật vùng thông báo `role="status"` và đọc thông báo ngắn qua TTS (tự động ngắt giọng đọc cũ và chặn/dừng video để không chồng âm thanh, không tự phát video).
    - `app/services/learning.ts`: Mở rộng danh sách từ dừng tiếng Việt (`mo`, `doc`, `nghe`, `giup`, `em`, `minh`) và nhận diện mẫu câu nói tự nhiên chứa số bài (VD: *Tôi muốn mở bài 6*) trong `semanticSearchLessons` để tìm kiếm giọng nói chính xác hơn mà vẫn giữ nguyên hành vi cũ.
    - `app/study.css`: Thêm định dạng gọn sạch dùng hệ biến xanh lam trầm cho khung tải ảnh/xem trước thumbnail trong bảng biên tập và ô tùy chọn tự động mở bài bằng giọng nói, bảo đảm hiển thị rõ ở cả 4 chế độ (Mặc định, Chữ lớn, Tương phản cao, cả hai) và màn hình nhỏ `320px–390px`.
  - **Kiểm chứng:** `npx tsc --noEmit` (`0` lỗi), `npm run lint` (`0` lỗi, `0` cảnh báo), `npm test` (`14` đạt, `0` lỗi, `4` bỏ qua). Chưa kiểm thử trực quan trên trình duyệt/NVDA/micro thật và chưa chạy `npm run build` (bàn giao `Argon chủ lực` Review & build).
- **2026-11-25 (Ticket 5A-2 — Cải tiến UI/UX Phía Học sinh: Design Tokens nền sáng tối giản, Underline Tabs, Thanh TTS trực tiếp, Breadcrumb & Bài đọc chuẩn 68ch):**
  - **Các file đã chỉnh sửa (đúng phạm vi Ticket 5A-2):**
    - `app/study.css`:
      - Áp dụng trọn bộ hệ Design Tokens mới cho chế độ Mặc định (`--bg-page: #f8fafc`, `--surface: #ffffff`, `--border: #e2e8f0`, `--ink: #0f172a`, `--muted: #475569`, một màu nhấn duy nhất `--green/--accent: #1e5480`, nút phụ nền trắng viền `#cbd5e1`), chế độ Tương phản cao (`.high-contrast`: nền trắng `#ffffff`, chữ `#000000`, viền rõ `2px solid #0f172a`, `box-shadow: none`), chế độ Chữ lớn (`.large-type`), phân cấp tiêu đề (`h1 1.75em`, `h2 1.35em`, `h3 1.1em`), vùng bấm `min-height: 44px` và vòng focus `:focus-visible` (`3px solid #1d4ed8`, `outline-offset: 3px`).
      - Chuyển thanh điều hướng trên cùng (`.textbook-app .sidebar`) sang nền trắng bám dính (`position: sticky; top: 0` trên desktop, `static` trên `<= 760px` để không che nội dung), bỏ đóng hộp màu xanh trên `.nav-item`, `.catalog-filters` và `.reader-navigation`, đồng bộ kiểu **Underline Tabs** gọn sạch.
      - Định dạng lại thanh tìm kiếm & nút giọng nói bo góc `12px` (`min-height: 50px`), dòng `.voice-auto-open-toggle` sạch gọn không đóng hộp xanh, thẻ danh sách bài `.lesson-row` nền trắng trên nền trang `#f8fafc`, thanh điều khiển TTS trực tiếp `.listen-controls-bar`, hộp thu gọn `.quick-summary-details` & `.reading-source`, văn bản bài đọc chuẩn `18px` / `line-height: 1.75` / `max-width: 68ch` / khoảng cách đoạn `1.25em`, và cột phải `.study-outline` nền trắng bám dính (`top: 80px`, xếp dưới nội dung bài trên `<= 900px`).
    - `app/components/course-picker.tsx`: Bọc cụm chọn Môn/Lớp/Sách trong `.course-picker-inner` để dải nền trắng trải ngang gọn gàng và căn thẳng trục nội dung Kho học liệu.
    - `app/components/home-page.tsx`: Bỏ nhãn màu `.eyebrow-amber` ở tiêu đề Kho học liệu; tối giản metadata trên mỗi `.lesson-row` từ 3–4 viên nhãn nhiều màu thành 1 dòng chữ xám tinh tế (`.lesson-meta-line`, ngăn cách `·`), chỉ hiển thị badge nhấn gọn khi có **Khớp ngữ nghĩa** hoặc **Tiến độ học**.
    - `app/components/learning-app.tsx`:
      - Bổ sung `aria-current="page"` đầy đủ cho các mục điều hướng vai trò.
      - Thay 3 nút shortcut đầu bài thành 1 dòng `<nav aria-label="Đường dẫn bài học" className="lesson-breadcrumb">` (`← Kho học liệu / Môn Lớp / Bài ...` kèm liên kết nhảy nhanh `Mục lục bài ↓` tới `#book-navigation`).
      - Đưa thanh điều khiển **Nghe bài học (TTS)** ra hiển thị trực tiếp đầu `#panel-read` (`.listen-controls-bar`) gồm nút chính **Nghe toàn bài / Tạm dừng / Tiếp tục**, nút phụ **Nghe tóm tắt**, chọn **Tốc độ** (`0.8× / 1× / 1.2× / 1.5×`) và nút **Dừng** (kèm thông báo lịch sự khi thiết bị không hỗ trợ TTS).
      - Chuyển **Tóm tắt nhanh & Ý chính bài học** thành `<details className="quick-summary-details">` đóng mặc định đặt cùng `<details className="reading-source">` để mở bài ra thấy ngay Mục 1; giữ nguyên 100% logic TTS ngắt video, focus, và bảo toàn state 3 tab.
    - `app/components/study-outline.tsx`: Bổ sung `type="button"` cho các nút chuyển bài `.study-lesson`, giữ nguyên cấu trúc ngữ nghĩa và thứ tự DOM.
  - **Kiểm chứng:** `npx tsc --noEmit` (`0` lỗi), `npm run lint` (`0` lỗi, `0` cảnh báo), `npm test` (`14` đạt, `0` lỗi, `4` bỏ qua). Chưa kiểm thử trực quan trên trình duyệt/NVDA và chưa chạy `npm run build` (bàn giao `Argon chủ lực` Review & build).
- **2026-11-25 (Ticket 5B-2 — Cải tổ Không gian Giáo viên: Tab "Bảng mục lục & AI" dạng Thẻ cấu trúc so sánh 2 cột & Bảng mục lục rút gọn):**
  - **Các file đã chỉnh sửa (đúng phạm vi Ticket 5B-2):**
    - `app/components/lesson-editor.tsx`:
      - Thêm state cục bộ `compactOutlineView` và nút chuyển đổi nhanh chế độ xem trên `.outline-toolbar` (`aria-pressed={compactOutlineView}`, `aria-label="Chuyển đổi chế độ xem mục lục rút gọn hoặc thẻ so sánh 2 cột"`, nhãn **Xem mục lục rút gọn** / **Xem thẻ so sánh 2 cột**).
      - Cải tổ chế độ mặc định (`!compactOutlineView`) từ bảng 6 cột ngang sang danh sách **Thẻ cấu trúc so sánh 2 cột** (`.outline-cards-list` / `<article className="outline-section-card">`): Header chứa ô **Mã mục** (`72px`), ô **Tiêu đề mục** và nhóm nút **Tách làm 2 mục** / **Gộp xuống mục dưới**; Thân chia 2 cột 50%–50% (`.outline-card-split`) đặt **Nội dung gốc (SGK)** nền `#f8fafc` bên trái và **Nội dung học (Đọc cho học sinh khiếm thị)** nền trắng viền nhấn trái bên phải (`rows={6}`), giữ nguyên dòng ghi chú `nonParagraphCount > 0` và hộp thông báo `.outline-semantic-note` (`role="status"`); Chân thẻ (`.outline-card-footer`) xếp gọn ô **Link Video URL** cùng thanh **3 nút AI** (`AI Chế biến Nội dung học`, `AI Mô tả & Chèn ảnh theo ngữ nghĩa` kèm `aria-expanded`/`aria-controls`, `AI Tạo câu hỏi Quiz`) và mở khung Vision AI `<fieldset className="outline-image-panel">` rộng rãi ngay bên dưới khi bật.
      - Bổ sung chế độ thu gọn (`compactOutlineView === true`) dạng bảng 2 cột `.outline-compact-table` (`Mã mục` và `Tiêu đề mục`) cho phép sửa nhanh toàn bài và bấm **Mở thẻ chi tiết** để quay lại thẻ 2 cột và đưa focus đúng vào thẻ mục tương ứng (`outline-card-${section.id}`).
      - Bảo toàn 100% toàn bộ hàm nghiệp vụ, state, API `POST /api/ai-assistant`, nén ảnh Vision AI qua `<canvas>` và các tab khác (`Nội dung`, `Nguồn & nhập tệp`, `Luyện tập`, `Video`, `2. Xem trước và kiểm tra`).
    - `app/study.css`:
      - Thêm hệ CSS cho `.outline-cards-list`, `.outline-section-card`, `.outline-card-header`, `.outline-card-split` (`repeat(2, minmax(0, 1fr))`, chuyển về `1fr` ở `<= 900px`), `.outline-split-col.is-source` / `.is-study`, `.outline-card-footer`, `.outline-card-video`, `.outline-card-ai-bar`, `.outline-view-toggle[aria-pressed="true"]` và `.outline-compact-table`.
      - Đồng bộ hoàn chỉnh chế độ **Tương phản cao** (`.high-contrast`: nền `#ffffff`, chữ `#000000`, viền `2px solid #0f172a`, `box-shadow: none`), chế độ **Chữ lớn** (`.large-type`), vùng bấm `min-height: 44px`, vòng `:focus-visible` (`3px solid #1d4ed8`) và responsive `<= 900px` / `<= 760px` / `360px`.
  - **Kiểm chứng:** `npx tsc --noEmit` (`0` lỗi), `npm run lint` (`0` lỗi, `0` cảnh báo), `npm test` (`14` đạt, `0` lỗi, `4` bỏ qua). Chưa kiểm thử trực quan trên trình duyệt/NVDA và chưa chạy `npm run build` (bàn giao `Argon chủ lực` Review & build).
---

## 6. Nhật ký Review & Kiểm chứng (Argon chủ lực)
- **2026-11-24 (Ticket 1A & Review Ticket 1B — `STATUS: PASS`):** Hoàn thành Lượt chạy 1 (`lint`, `tsc`, `build`, `test` đạt 100%).
- **2026-11-24 (Ticket 2A & Review Ticket 2B — `STATUS: PASS`):** Hoàn thành Lượt chạy 2 (`lint`, `tsc`, `build`, `test` đạt 100%).
- **2026-11-24 (Ticket 3A — Bổ sung action `ask_lesson` vào `/api/ai-assistant`):**
  - Đã nâng cấp `app/api/ai-assistant/route.ts` bổ sung action `ask_lesson` với Zod schema kiểm tra chặt chẽ (`askLessonRequestSchema`, `askLessonLlmOutputSchema`), hỗ trợ gọi OpenRouter LLM (`mode: "ai_grounded"`, `provider: "openrouter"`) và bộ truy hồi ngữ nghĩa tiếng Việt cục bộ (`mode: "retrieval"`, `provider: "local-fallback"`) có mở rộng chủ đề lịch sử (*cây đa Tân Trào*, *Quân lệnh số 1*, *Tổng khởi nghĩa tháng Tám*, *Liên hợp quốc*, *Đổi mới 1986*...) và luôn trả về `citations` khớp `sectionId`/`blockId`.
  - Đã kiểm chứng `npx tsc --noEmit` (`0` lỗi) và `npm test` (`14` đạt, `0` lỗi).
- **2026-11-24 (Review & Nghiệm thu Ticket 3B — `STATUS: PASS`):**
  - **Phạm vi `git diff` & Bảo mật:** Gemini chỉnh sửa đúng 6 file thuộc phạm vi Ticket 3B (`app/services/learning.ts`, `app/components/home-page.tsx`, `app/components/learning-app.tsx`, `app/study.css`, `content/lich-su/lop-12/ket-noi-tri-thuc/bai-06.json`, `content/lich-su/lop-12/ket-noi-tri-thuc/sach.json`) cùng `docs/agent-board.md`; không rò rỉ `OPENROUTER_API_KEY` ra client; tương thích ngược 100% với `suhoc-content-v2` và `suhoc-progress-v1`. Đã dọn sạch 1 cảnh báo biến không dùng `askLessonCitationSchema` tại `app/api/ai-assistant/route.ts` để `npm run lint` đạt `0 errors, 0 warnings`.
  - **Tiếp cận người khiếm thị (Accessibility) & Quy chuẩn giao diện (`AGENTS.md`):**
    - Nút **Tìm bằng giọng nói** (Web Speech API `vi-VN`) có đầy đủ `aria-pressed`, `aria-label` và vùng thông báo `role="status"` khi trình duyệt không hỗ trợ hoặc từ chối quyền micro; kết quả tìm kiếm hiển thị nhãn `Khớp ngữ nghĩa: Mục ...` và bấm mở nhảy thẳng tới mục đó.
    - Khung **Trích xuất nhanh: Tóm tắt & Ý chính bài học** có nút **Nghe tóm tắt** gọi `speak(...)` (tự động gửi lệnh `pause` ngắt video đang phát, không chồng âm thanh); từng mục hiển thị mã `MỤC 6.1`, `MỤC 6.2`... và hộp `<details>` đối chiếu *Nội dung gốc (SGK)*.
    - Tab **Hỏi đáp** kết nối `POST /api/ai-assistant` (`action: "ask_lesson"`) với bộ đếm `askSeqRef` chống race condition và fallback cục bộ an toàn; phân biệt rõ nhãn `Trợ giảng AI (OpenRouter)` và `Truy hồi ngữ nghĩa theo đoạn nguồn (Bộ xử lý cục bộ)`; có nút **Nghe câu trả lời**, nút trích dẫn nhảy focus thẳng về đoạn nguồn (`source-<blockId>` / `<sectionId>`) và các câu hỏi gợi ý (`suggestedQuestions`); giữ nguyên trạng thái câu hỏi, câu trả lời và lựa chọn Quiz khi chuyển qua lại 3 tab.
    - Khung **Lộ trình học cá nhân** sau khi nộp Quiz và trên trang **Học liệu đang học** phân loại chính xác mục *Đã nắm vững (✓)* / *Cần nghe / đọc lại* kèm nút nhảy thẳng về mục cần ôn.
  - **Kết quả chạy thực tế bộ lệnh kiểm chứng:**
    1. `npm run lint`: **PASS** (`0` errors, `0` warnings, exit code `0`).
    2. `npx tsc --noEmit`: **PASS** (`0` errors, exit code `0`).
    3. `npm run build`: **PASS** (Next.js 16.3.5 Turbopack biên dịch và tạo trang tĩnh/động thành công 100%, exit code `0`).
    4. `npm test`: **PASS** (`14` pass, `0` fail, `4` skipped, exit code `0`).
- **2026-11-24 (Ticket 4A — Nâng cấp `insert_image_semantic` hỗ trợ Vision AI đa phương thức):**
  - Đã nâng cấp `insertImageSemanticRequestSchema`, `InsertImageSemanticResponse`, `callOpenRouterJson`, `callOpenRouterInsertImageSemantic` và `localFallbackInsertImageSemantic` trong `app/api/ai-assistant/route.ts`.
  - Hỗ trợ nhận `imageDataUrl` (`data:image/jpeg|jpg|png|webp;base64,...`, kiểm tra dung lượng giải mã `<= 4MB`), cho phép `imageCaption` là tùy chọn khi đã có `imageDataUrl`, gửi payload multimodal `image_url` lên OpenRouter Vision AI và tự động fallback an toàn (về OpenRouter text-only hoặc `local-fallback`) kèm trường `usedVision` và `notice` rõ ràng.
  - Đã kiểm chứng `npx tsc --noEmit` (`0` lỗi), `npm run lint` (`0` lỗi, `0` cảnh báo) và `npm test` (`14` đạt, `0` lỗi).
- **2026-11-24 (Review & Nghiệm thu Ticket 4B — `STATUS: PASS`):**
  - **Phạm vi `git diff`, Bảo mật & Tương thích ngược:**
    - Gemini chỉnh sửa đúng các file thuộc phạm vi (`app/components/lesson-editor.tsx`, `app/components/home-page.tsx`, `app/components/learning-app.tsx`, `app/services/learning.ts`, `app/study.css`) cùng `docs/agent-board.md`.
    - Không lộ `OPENROUTER_API_KEY` ra client; dữ liệu ảnh `imageDataUrl` chỉ giữ trong React state tạm thời khi gửi lên `POST /api/ai-assistant` và được tự nén qua `<canvas>` đảm bảo `<= 4 MB`, tuyệt đối không ghi chuỗi base64 vào `localStorage` (`suhoc-content-v2`).
    - Giữ tương thích ngược 100% với `suhoc-content-v2`, `suhoc-progress-v1` và `suhoc-prefs-v1-*` (`voiceAutoOpen` mặc định `true` khi đọc dữ liệu cũ).
  - **Tiếp cận người khiếm thị (Accessibility) & Quy chuẩn giao diện (`AGENTS.md`):**
    - Khung **AI Mô tả & Chèn ảnh theo ngữ nghĩa** trong `app/components/lesson-editor.tsx` có `<label htmlFor>` và `aria-label` rõ ràng cho `<input type="file" accept="image/png,image/jpeg,image/webp" />`, khung xem trước ảnh nhỏ có `alt`, hiển thị dung lượng + trạng thái nén, nút **Xóa ảnh** và phân biệt minh bạch 3 nguồn xử lý (`Vision AI · OpenRouter LLM`, `OpenRouter LLM · chế độ văn bản`, `Bộ xử lý cục bộ`) kèm `notice`.
    - Luồng **Tìm bằng giọng nói tự động mở bài** trong `app/components/home-page.tsx` và `app/components/learning-app.tsx` có checkbox mặc định bật **"Tự động mở bài khớp nhất khi tìm bằng giọng nói"**, tự động dừng TTS cũ trước khi thu âm (`onVoiceStart`), mở thẳng tới bài & mục khớp ngữ nghĩa nhất (`findBestMatchingSection`), đưa focus vào đúng mục, cập nhật thông báo `role="status"` / `aria-live="polite"` và đọc thông báo ngắn qua TTS mà không tự phát video hay chồng âm thanh.
    - CSS mới trong `app/study.css` dùng hệ biến màu xanh lam trầm, tương thích đủ 4 chế độ hiển thị (**Mặc định**, **Chữ lớn**, **Tương phản cao**, kết hợp cả hai) và màn hình hẹp `320px–390px`.
  - **Kết quả chạy thực tế bộ lệnh kiểm chứng:**
    1. `npm run lint`: **PASS** (`0` errors, `0` warnings, exit code `0`).
    2. `npx tsc --noEmit`: **PASS** (`0` errors, exit code `0`).
    3. `npm run build`: **PASS** (Next.js 16.3.5 Turbopack biên dịch và đóng gói Production thành công 100%, exit code `0`).
    4. `npm test`: **PASS** (`14` pass, `0` fail, `4` skipped, exit code `0`).
- **2026-11-25 (Ticket 5A-1 — Rà soát hệ thống CSS/UI/A11y & Chốt Hợp đồng Thiết kế Lượt chạy 5A):**
  - Đây là đợt nâng cấp giao diện/CSS phía Học sinh theo `docs/ke-hoach-cai-tien-giao-dien.md` (Mục 2 và Mục 3 - Lượt chạy 5A), nên giữ nguyên 100% `app/data/content.ts`, `app/services/content.ts` và `app/api/*` (bảo toàn tương thích ngược `suhoc-content-v2` và `suhoc-progress-v1`).
  - Đã rà soát toàn bộ `app/study.css`, `app/components/home-page.tsx`, `app/components/course-picker.tsx`, `app/components/learning-app.tsx`, `app/components/study-outline.tsx`, kiểm chứng `npx tsc --noEmit` (`0` lỗi) và `npm test` (`14/14` đạt), đồng thời ghi Hợp đồng Thiết kế & Phiếu bàn giao Ticket 5A-2 vào Mục 4.8.
- **2026-11-25 (Review & Nghiệm thu Ticket 5A-2 — `STATUS: PASS`):**
  - **Phạm vi `git diff`, Bảo mật & Tương thích ngược:**
    - Gemini chỉnh sửa đúng 5 file giao diện phía Học sinh thuộc phạm vi Ticket 5A-2 (`app/study.css`, `app/components/course-picker.tsx`, `app/components/home-page.tsx`, `app/components/learning-app.tsx`, `app/components/study-outline.tsx`) cùng `docs/agent-board.md`; giữ nguyên 100% `app/data/content.ts`, `app/services/content.ts`, `app/api/**`, `app/components/lesson-editor.tsx` và `tests/**`.
    - Không phát sinh bất kỳ truy cập khóa bí mật hay rò rỉ `OPENROUTER_API_KEY` xuống client; giữ tương thích ngược tuyệt đối với dữ liệu `localStorage` hiện có (`suhoc-content-v2`, `suhoc-progress-v1`, `suhoc-prefs-v1-*`).
  - **Tiếp cận người khiếm thị (Accessibility) & Quy chuẩn giao diện (`AGENTS.md` & `ke-hoach-cai-tien-giao-dien.md`):**
    - **Hệ Design Tokens nền sáng tối giản & 4 chế độ hiển thị:** Nền trang `--bg-page: #f8fafc`, bề mặt thẻ `--surface: #ffffff`, viền mảnh `--border: #e2e8f0`, chữ `--ink: #0f172a`, `--muted: #475569`, chỉ dùng 1 màu nhấn duy nhất `--green/--accent: #1e5480` cho CTA chính và tab đang chọn; nút phụ nền trắng viền `#cbd5e1`. Chế độ Tương phản cao (`.high-contrast`) chuyển về nền trắng `#ffffff`, chữ `#000000`, viền rõ `2px solid #0f172a` và tắt `box-shadow: none`; chế độ Chữ lớn (`.large-type`) phóng tỷ lệ chữ an toàn không vỡ bố cục.
    - **Header trắng bám dính & Underline Tabs:** Thanh `.sidebar` chuyển sang nền trắng gọn gàng (`position: sticky; top: 0` trên desktop, `static` ở `<= 760px`); `.nav-item` (có `aria-current="page"`), `.catalog-filters` và `.reader-navigation` (có `aria-pressed`) đều đồng bộ kiểu **Underline Tabs** hiện đại, bỏ hoàn toàn các hộp nút nhiều màu chồng chéo.
    - **Trang Kho học liệu:** Thanh tìm kiếm & nút **Tìm bằng giọng nói** có `min-height: 50px`, `border-radius: 12px` nổi bật; tùy chọn `.voice-auto-open-toggle` gọn 1 dòng chữ sạch dưới thanh tìm kiếm; mỗi thẻ bài học `.lesson-row` nền trắng sạch, thay các nhãn màu sặc sỡ bằng 1 dòng `.lesson-meta-line` chữ xám ngăn cách bằng `·` và chỉ gắn badge gọn cho **Khớp ngữ nghĩa** hoặc **Tiến độ học**.
    - **Trang Học bài & Điều hướng bàn phím/TTS:** Thay 3 hộp nút shortcut đầu bài bằng 1 dòng `<nav aria-label="Đường dẫn bài học" className="lesson-breadcrumb">` (`← Kho học liệu / Môn Lớp / Bài ...` + link nhảy nhanh `Mục lục bài ↓` tới `#book-navigation`). Thanh điều khiển **Nghe bài học (TTS)** (`.listen-controls-bar`) được đưa ra hiển thị trực tiếp ngay đầu `#panel-read` (không giấu trong `<details>`) với đầy đủ nút **Nghe toàn bài / Tạm dừng / Tiếp tục**, **Nghe tóm tắt**, chọn **Tốc độ** (`0.8× / 1× / 1.2× / 1.5×`) và **Dừng**; giữ nguyên cơ chế TTS tự động ngắt video đang phát và không tự phát video. Khung **Tóm tắt nhanh & Ý chính bài học** được thu gọn vào `<details className="quick-summary-details">` mặc định đóng đặt cùng `<details className="reading-source">` để mở bài ra thấy ngay Mục 1. Văn bản bài đọc đạt chuẩn `18px`, `line-height: 1.75`, `max-width: 68ch`, khoảng cách đoạn `1.25em`.
    - **Thứ tự DOM & Responsive 2 cột:** Giữ nguyên bài học (`.study-content`) đứng trước mục lục (`.study-outline`) trong DOM và xếp nội dung trước mục lục ở màn hình `<= 900px`; mọi phần tử tương tác đạt `min-height: 44px` và vòng `:focus-visible` `3px solid #1d4ed8` (`outline-offset: 3px`); bảo toàn state giữa 3 tab **Đọc bài / Hỏi đáp / Luyện tập**.
  - **Kết quả chạy thực tế bộ lệnh kiểm chứng:**
    1. `npm run lint`: **PASS** (`0` errors, `0` warnings, exit code `0`).
    2. `npx tsc --noEmit`: **PASS** (`0` errors, exit code `0`).
    3. `npm run build`: **PASS** (Next.js 16.3.5 Turbopack biên dịch và đóng gói Production thành công 100%, exit code `0`).
    4. `npm test`: **PASS** (`14` pass, `0` fail, `4` skipped, exit code `0`).
- **2026-11-25 (Ticket 5B-1 — Rà soát Tab "Bảng mục lục & AI" Không gian Giáo viên & Chốt Hợp đồng Thiết kế Lượt chạy 5B):**
  - Đây là đợt nâng cấp giao diện/UX phía Giáo viên theo `docs/ke-hoach-cai-tien-giao-dien.md` (Mục 3 — Lượt chạy 5B), nên giữ nguyên 100% `app/data/content.ts`, `app/services/content.ts` và `app/api/*` (bảo toàn tương thích ngược `suhoc-content-v2`).
  - Đã rà soát toàn bộ `app/components/lesson-editor.tsx` và các lớp CSS biên tập trong `app/study.css`, kiểm chứng `npx tsc --noEmit` (`0` lỗi) và `npm test` (`14/14` đạt), đồng thời ghi Hợp đồng Thiết kế & Phiếu bàn giao Ticket 5B-2 vào Mục 4.9.
- **2026-11-25 (Review & Nghiệm thu Ticket 5B-2 — `STATUS: PASS`):**
  - **Phạm vi `git diff`, Bảo mật & Tương thích ngược:**
    - Gemini chỉnh sửa đúng 2 file giao diện biên tập thuộc phạm vi Ticket 5B-2 (`app/components/lesson-editor.tsx`, `app/study.css`) cùng `docs/agent-board.md`; giữ nguyên 100% `app/data/content.ts`, `app/services/content.ts`, `app/api/**`, `app/components/learning-app.tsx`, `app/components/home-page.tsx` và `tests/**`.
    - Không phát sinh truy cập khóa bí mật hay rò rỉ `OPENROUTER_API_KEY` xuống client; giữ nguyên cơ chế chỉ giữ ảnh `imageDataUrl` trong React state tạm (nén qua `<canvas>` `<= 4 MB`), tuyệt đối không ghi chuỗi base64 vào `localStorage`; bảo toàn tương thích ngược 100% với `suhoc-content-v2`, `suhoc-progress-v1` và `suhoc-prefs-v1-*`.
  - **Tiếp cận người khiếm thị (Accessibility) & Quy chuẩn giao diện (`AGENTS.md` & `ke-hoach-cai-tien-giao-dien.md` — Mục 3 Lượt chạy 5B):**
    - **Chuyển đổi linh hoạt 2 chế độ xem trên `.outline-toolbar`:** Nút **Xem mục lục rút gọn** / **Xem thẻ so sánh 2 cột** (`.outline-view-toggle`) có đầy đủ `aria-pressed={compactOutlineView}` và `aria-label` tiếng Việt rõ ràng.
    - **Danh sách Thẻ cấu trúc so sánh 2 cột (`.outline-cards-list` / `<article className="outline-section-card">`):**
      - **Header thẻ (`.outline-card-header`):** Ô **Mã mục** (`72px`), ô **Tiêu đề mục** rộng rãi (`flex: 1 1 240px`) kèm 2 nút **Tách làm 2 mục** (`splitSectionAt(index)`) và **Gộp xuống mục dưới** (`mergeSectionWithNext(index)`).
      - **Thân thẻ 2 cột 50%–50% (`.outline-card-split`):** Sử dụng `grid-template-columns: repeat(2, minmax(0, 1fr))` trên desktop và xếp dọc 1 cột (`1fr`) ở `<= 900px`. Cột trái **Nội dung gốc (SGK)** nền `#f8fafc` (`var(--bg-page)`) và cột phải **Nội dung học (Đọc cho học sinh khiếm thị)** nền `#ffffff` (`var(--surface)`) viền nhấn trái `3px solid var(--green)`, mỗi bên `<textarea rows={6}>` rộng rãi kèm `<label htmlFor>` và chú thích rõ ràng; bảo toàn thông báo `nonParagraphCount > 0` và hộp thông báo kết quả chèn ảnh ngữ nghĩa `.outline-semantic-note` (`role="status"`).
      - **Chân thẻ (`.outline-card-footer`) & Khung Vision AI:** Xếp gọn ô **Link Video URL** (`type="url"`) cùng thanh **3 nút AI** (`AI Chế biến Nội dung học`, `AI Mô tả & Chèn ảnh theo ngữ nghĩa` giữ `aria-expanded` / `aria-controls`, `AI Tạo câu hỏi Quiz`); khung `<fieldset id="image-panel-..." className="outline-image-panel">` mở rộng rãi ngay dưới chân thẻ khi kích hoạt.
    - **Bảng mục lục rút gọn 2 cột (`.outline-compact-table`):** Có `aria-label`, `<caption>`, `<th scope="col">` chuẩn ngữ nghĩa gồm cột **Mã mục** (`96px`) và **Tiêu đề mục**, kèm nút **Mở thẻ chi tiết** tự động chuyển về chế độ thẻ 2 cột và đưa focus thẳng tới thẻ mục tương ứng (`outline-card-${section.id}`).
    - **Hỗ trợ đủ 4 chế độ hiển thị & Bàn phím:** Mọi nút bấm và ô nhập đạt `min-height: 44px`, vòng focus `:focus-visible` `3px solid #1d4ed8` (`outline-offset: 3px`); chế độ **Tương phản cao** (`.high-contrast`) chuyển toàn bộ thẻ, cột, bảng và ô nhập về nền `#ffffff`, chữ `#000000`, viền `2px solid #0f172a`, `box-shadow: none`; chế độ **Chữ lớn** (`.large-type`) và màn hình nhỏ `360px` không tràn ngang.
  - **Kết quả chạy thực tế bộ lệnh kiểm chứng:**
    1. `npm run lint`: **PASS** (`0` errors, `0` warnings, exit code `0`).
    2. `npx tsc --noEmit`: **PASS** (`0` errors, exit code `0`).
    3. `npm run build`: **PASS** (Next.js 16.3.5 Turbopack biên dịch và đóng gói Production thành công 100%, exit code `0`).
    4. `npm test`: **PASS** (`14` pass, `0` fail, `4` skipped, exit code `0`).
