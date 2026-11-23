# Kế hoạch triển khai Giai đoạn 2: Cấu trúc hóa học liệu bằng AI & Hỗ trợ học tập tiếp cận cho học sinh khiếm thị

## 1. Mục tiêu cần đạt (Goal Description)

Triển khai các yêu cầu chuyên môn thầy đã chỉ dẫn trong buổi trao đổi ([Bản ghi Mới.m4a](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/B%E1%BA%A3n%20ghi%20M%E1%BB%9Bi.m4a)) và bản thiết kế Giai đoạn 1 ([docs/thuyet-minh-ai-hoc-lieu-so.md](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/docs/thuyet-minh-ai-hoc-lieu-so.md)) vào ứng dụng Next.js hiện có, đảm bảo giữ nguyên toàn bộ dữ liệu cũ, tính năng tiếp cận (bàn phím, screen reader, TTS) và quy trình Nháp → Kiểm tra → Công bố:

1. **Phía Giáo viên / Quản trị viên (Quản lý & Chuẩn hóa học liệu bằng AI + Con người):**
   - **Tự động tách khung mục lục từ file Word (`.docx`) / văn bản sách ra Bảng (`Table`):** Tự động tách thành các mục phân cấp (`1.1`, `1.2`, `1.3`...) và hiển thị trên bảng để giáo viên sửa trực tiếp, **tách 1 mục thành 2 mục** (ví dụ tách `1.3` thành `1.3` và `1.4`), gộp mục và chốt khung.
   - **Tách bạch "Nội dung gốc (SGK)" và "Nội dung học (đọc cho người mù)":** Lưu văn bản gốc từ sách để đối chiếu, đồng thời dùng AI chế biến thành bản *Nội dung học* cô đọng các ý chính, tối ưu cho giọng đọc TTS.
   - **AI Mô tả ảnh & Tự động chèn theo ngữ nghĩa (Semantic Image Insertion):** Sinh lời mô tả bức ảnh gắn với bối cảnh lịch sử và tự động tìm vị trí câu văn phù hợp trong *Nội dung học* để chèn lời mô tả ảnh vào đúng mạch nghe.
   - **Link Video từ URL bất kỳ & AI Gợi ý câu hỏi Quiz:** Hỗ trợ dán bất kỳ đường dẫn URL video nào (YouTube hoặc trang học tập ngoài) và dùng AI sinh câu hỏi trắc nghiệm từ *Nội dung học*.

2. **Phía Học sinh / Học sinh khiếm thị (Khai thác & Học tập tiếp cận):**
   - **Tìm kiếm học liệu theo ngữ nghĩa (Semantic Search) & Giọng nói:** Cho phép học sinh gõ hoặc nói câu tự nhiên (ví dụ: *"Tôi muốn xem về Tổng khởi nghĩa tháng Tám"*, *"Lễ xuất quân ở cây đa Tân Trào"*) để tìm và mở thẳng đúng bài, đúng mục.
   - **Nghe "Nội dung học", Trích xuất tóm tắt nhanh & Đối chiếu "Nội dung gốc":** Đọc/nghe bản *Nội dung học* đã lồng ghép mô tả ảnh liền mạch, có nút nghe tóm tắt ý chính toàn bài và hộp mở xem *Nội dung gốc SGK* khi cần.
   - **Trao đổi trực tiếp với học liệu (Hỏi đáp AI có trích dẫn nguồn)** và **Xây dựng lộ trình học cá nhân** dựa trên kết quả làm Quiz theo từng mục (`1.1`, `1.2`...).

---

## 2. Điểm cần lưu ý & Xác nhận từ người dùng (User Review Required)

> [!IMPORTANT]
> **Cơ chế kết nối AI (OpenRouter API + Bộ xử lý dự phòng tại chỗ):**
> - Hệ thống sẽ gọi **OpenRouter API** qua biến môi trường `OPENROUTER_API_KEY` (hoặc khóa API giáo viên nhập thử nghiệm trên giao diện cài đặt/biên tập).
> - Để bạn có thể **chạy demo và kiểm thử ngay lập tức kể cả khi chưa có mạng hoặc chưa nạp khóa OpenRouter**, route `/api/ai-assistant` sẽ có sẵn bộ xử lý NLP tiếng Việt tại chỗ (tự động nhận diện tiêu đề mục từ văn bản Word, rút trích ý chính để tạo *Nội dung học*, định vị câu văn có từ khóa ngữ nghĩa gần nhất để chèn mô tả ảnh, và sinh câu hỏi mẫu từ đoạn văn). Giao diện sẽ luôn ghi rõ kết quả đang được tạo bởi `OpenRouter LLM` hay `Bộ xử lý cấu trúc cục bộ`.

> [!NOTE]
> **Tương thích dữ liệu cũ (`suhoc-content-v2`):**
> Tất cả các trường mở rộng trong `Section` (`code`, `sourceText`, `videoUrl`, `keywords`) và `Lesson` (`videoUrl`) đều là `optional` trong schema Zod, đảm bảo không làm hỏng `localStorage` hoặc các file JSON học liệu hiện có (`bai-06.json`, `bai-10.json`).

---

## 3. Chi tiết các thay đổi dự kiến (Proposed Changes)

### Thành phần 1: Mô hình dữ liệu & Schema kiểm tra (`app/data/` & `app/services/`)

#### [MODIFY] [content.ts](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/app/data/content.ts)
- Mở rộng kiểu `Section`, `Lesson` và `Answer`:
```ts
export type Section = {
  id: string;
  code?: string; // Ví dụ: "1.1", "1.2", "6.1"
  heading: string;
  sourceText?: string; // Nội dung gốc từ SGK (để tham chiếu & làm đầu vào AI)
  body: string; // Nội dung học (đã chế biến để đọc cho người khiếm thị)
  blocks?: Block[];
  videoUrl?: string; // Link video bài giảng riêng của mục (URL bất kỳ)
  keywords?: string[]; // Từ khóa ngữ nghĩa phục vụ Semantic Search
};
```
- Trong `Lesson`, bổ sung trường `videoUrl?: string` (cho phép nhập URL bất kỳ bên cạnh `youtubeVideoId`).
- Trong `Answer`, mở rộng `mode: "retrieval" | "ai_grounded"` để phân biệt rõ trả lời truy hồi đoạn nguồn và trả lời tổng hợp có kiểm soát nguồn.

#### [MODIFY] [content.ts (services)](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/app/services/content.ts)
- Cập nhật `lessonSchema` (Zod) cho phép các trường mới (`code`, `sourceText`, `videoUrl`, `keywords`).
- Thêm hàm tiện ích:
  - `extractYoutubeId(urlOrId: string): string | null`: Tự động nhận diện cả mã 11 ký tự lẫn link đầy đủ (`https://www.youtube.com/watch?v=...`, `https://youtu.be/...`).
  - `renumberSectionCodes(lessonNumber: number | undefined, sections: Section[]): Section[]`: Tự động đánh lại mã mục chuẩn `1.1`, `1.2`, `1.3`... (hoặc `6.1`, `6.2`... theo số bài) khi giáo viên tách hoặc gộp mục trên bảng.

---

### Thành phần 2: Dịch vụ AI phía máy chủ (`/api/ai-assistant`)

#### [NEW] [route.ts](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/app/api/ai-assistant/route.ts)
Route Handler xử lý 5 tác vụ AI theo đúng yêu cầu của thầy, hỗ trợ gọi OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) và fallback NLP thông minh:
1. **`action: "split_outline"` (Tách khung mục lục từ văn bản sách/Word):**
   - Đầu vào: `rawText`, `lessonNumber`, `lessonTitle`.
   - Đầu ra: Mảng các mục `{ code: "1.1", heading: "...", sourceText: "...", studyText: "..." }`.
2. **`action: "generate_study_content"` (Chế biến "Nội dung gốc" → "Nội dung học"):**
   - Đầu vào: `heading`, `sourceText`, `imageDescriptions`.
   - Đầu ra: Bản `studyText` chia thành các ý cốt lõi (`Ý chính 1`, `Ý chính 2`...) ngắn gọn, dễ nghe qua TTS cho học sinh khiếm thị.
3. **`action: "insert_image_semantic"` (Mô tả ảnh & Chèn tự động vào đúng vị trí ngữ nghĩa):**
   - Đầu vào: `studyText` (hoặc `sourceText`), `imageCaption`, `imageContext`.
   - Đầu ra: `{ description: "...", insertedText: "...", insertedAfterSentence: "...", reason: "..." }` — trả về đoạn *Nội dung học* đã được chèn câu mô tả ảnh vào đúng vị trí câu văn có ngữ nghĩa liên quan nhất.
4. **`action: "generate_quiz"` (Gợi ý câu hỏi luyện tập từ Nội dung học):**
   - Đầu vào: `sectionId`, `heading`, `studyText`.
   - Đầu ra: Mảng câu hỏi trắc nghiệm 4 lựa chọn kèm lời giải thích chi tiết.
5. **`action: "ask_lesson"` (Hỏi đáp trực tiếp với học liệu có trích dẫn):**
   - Đầu vào: `question`, `lessonTitle`, `sections`.
   - Đầu ra: Câu trả lời tự nhiên bám sát nội dung bài học + danh sách `citations` trỏ tới đúng `sectionId` / `blockId`.

---

### Thành phần 3: Giao diện Giáo viên — Bảng tách khung mục lục & Chế biến AI (`app/components/lesson-editor.tsx`)

#### [MODIFY] [lesson-editor.tsx](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/app/components/lesson-editor.tsx)
1. **Thêm mục điều hướng `"table"` ("Bảng mục lục & AI") làm tab đầu tiên trong trình biên tập:**
   - Hiển thị **Bảng cấu trúc học liệu (`Table`)** theo đúng thiết kế thầy vẽ:
     - Cột 1: **Mã mục** (`1.1`, `1.2`, `1.3`... có thể sửa hoặc tự động đánh số).
     - Cột 2: **Tiêu đề mục chuẩn hóa** (input sửa trực tiếp trên bảng).
     - Cột 3: **Nội dung gốc (SGK)** (textarea chứa văn bản gốc trích từ file Word/PDF).
     - Cột 4: **Nội dung học (Đọc cho người mù + Mô tả ảnh)** (textarea hiển thị bản đã chế biến để TTS đọc).
     - Cột 5: **Video URL** (gắn link bất kỳ cho mục/bài).
     - Cột 6: **Thao tác cấu trúc & AI**:
       - Nút **Tách làm 2 mục** (tách mục hiện tại thành 2 mục liên tiếp, ví dụ tách `1.3` thành `1.3` và `1.4`, tự động chia nửa đoạn văn hoặc theo vị trí dòng trống và đánh lại mã mục).
       - Nút **Gộp xuống mục dưới**.
       - Nút **AI Chế biến Nội dung học** (biến *Nội dung gốc* thành *Nội dung học* cô đọng).
       - Nút **AI Mô tả & Chèn ảnh theo ngữ nghĩa** (mở khung nhập thông tin bức ảnh trong sách, bấm 1 nút để AI sinh lời mô tả lịch sử và tự chèn vào đúng vị trí câu văn trong *Nội dung học*).
       - Nút **AI Tạo câu hỏi Quiz** cho mục đó.
2. **Nâng cấp luồng nhập file Word (`.docx`) / PDF trong tab `Nguồn & nhập tệp`:**
   - Sau khi trích xuất chữ từ file Word (`.docx`), có ngay nút **"Tự động tách thành Bảng mục lục (AI)"** để đổ thẳng văn bản vào Bảng `1.1, 1.2, 1.3...` cho giáo viên chỉnh sửa và bấm **Lưu chốt khung**.
3. **Nâng cấp tab `Video`:**
   - Cho phép nhập **Link Video bất kỳ (URL YouTube hoặc trang học tập ngoài)** thay vì chỉ bắt nhập mã ID 11 ký tự như trước.

---

### Thành phần 4: Giao diện Học sinh khiếm thị — Tìm kiếm ngữ nghĩa, Đọc "Nội dung học", Lộ trình học cá nhân

#### [MODIFY] [learning.ts](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/app/services/learning.ts)
- Nâng cấp `hasVideo(lesson)` để nhận diện cả `youtubeVideoId` lẫn `videoUrl` bất kỳ.
- Bổ sung bộ **Tìm kiếm theo ngữ nghĩa (Semantic Search)** (`semanticSearchLessons` và `findBestMatchingSection`):
  - Không chỉ tìm chuỗi con chính xác (`includes`), mà tách cụm từ khóa ý nghĩa, mở rộng từ đồng nghĩa/chủ đề lịch sử (ví dụ: *"tổng khởi nghĩa tháng tám"*, *"cây đa tân trào"*, *"quân lệnh số 1"*, *"giành chính quyền 1945"* → khớp với Bài 6; *"tổ chức giữ gìn hòa bình thế giới"*, *"hiến chương ianta"* → khớp với Bài 1; *"kinh tế thị trường định hướng xã hội chủ nghĩa"*, *"đại hội vi 1986"* → khớp với Bài 10) và chấm điểm độ khớp ngữ nghĩa tới từng mục (`1.1`, `1.2`...).
- Bổ sung hàm `buildPersonalLearningPath(lesson, progress, choices, submitted)`:
  - Phân tích các mục đã hoàn thành, các mục có câu hỏi Quiz làm đúng (đã nắm vững) và các mục có câu hỏi Quiz làm sai (cần nghe/đọc lại), kèm gợi ý bước học tiếp theo.

#### [MODIFY] [home-page.tsx](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/app/components/home-page.tsx)
- Nâng cấp ô tìm kiếm thành **Tìm kiếm theo từ khóa & ngữ nghĩa (kèm nút Tìm bằng giọng nói - Web Speech Recognition nếu trình duyệt hỗ trợ)**:
  - Học sinh có thể nói hoặc nhập câu tự nhiên: *"Tôi muốn xem về Tổng khởi nghĩa tháng Tám"* → Hiển thị ngay bài học và mục khớp ngữ nghĩa nhất (ví dụ: `Khớp ngữ nghĩa: Mục 6.2 · Tổng khởi nghĩa tháng Tám năm 1945`), bấm vào là nhảy thẳng tới mục đó.

#### [MODIFY] [lesson-video.tsx](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/app/components/lesson-video.tsx)
- Hỗ trợ phát nhúng nếu link là YouTube (hoặc `youtubeVideoId`), và hỗ trợ hiển thị khung mở/phát video trực tiếp nếu `videoUrl` là link `.mp4` hoặc đường dẫn từ một trang học tập bất kỳ của giáo viên.

#### [MODIFY] [learning-app.tsx](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/app/components/learning-app.tsx)
- **Trong tab `Đọc bài`:**
  - Thêm khung **"Trích xuất nhanh: Tóm tắt & Ý chính bài học"** ở đầu bài (có nút **Nghe tóm tắt** để học sinh khiếm thị nắm nhanh toàn bộ khung bài học).
  - Ở mỗi mục, hiển thị rõ mã mục (`MỤC 6.1`, `MỤC 6.2`...), hiển thị bản **Nội dung học (đã chuẩn hóa & chèn mô tả ảnh)** để đọc/nghe TTS, kèm mục mở rộng `<details>` **"Xem đối chiếu Nội dung gốc (SGK)"** khi mục đó có `sourceText`.
- **Trong tab `Hỏi đáp`:**
  - Nâng cấp lên hỏi đáp kết hợp AI (`/api/ai-assistant`) + truy hồi đoạn nguồn có trích dẫn bấm vào nhảy tới đúng đoạn.
- **Trong tab `Luyện tập` và trang `Học liệu đang học`:**
  - Hiển thị bảng **Lộ trình học cá nhân hóa**:
    - Danh sách mục đã nắm vững (`✓`).
    - Danh sách mục cần củng cố (do chưa đọc hoặc trả lời sai câu hỏi Quiz thuộc mục đó) kèm nút bấm **"Nghe/Đọc lại Mục [Mã mục]"** nhảy thẳng tới đúng mục.
    - Gợi ý bài học tiếp theo trong chương trình.

#### [MODIFY] [bai-06.json](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/content/lich-su/lop-12/ket-noi-tri-thuc/bai-06.json) & [sach.json](file:///e:/lung%20tung/Xay_Dung_Kho_Hoc_Lieu_So/content/lich-su/lop-12/ket-noi-tri-thuc/sach.json)
- Bổ sung dữ liệu mẫu có sẵn `code` (`6.1`, `6.2`, `6.3`), `sourceText` (Nội dung gốc đối chiếu), bản `Nội dung học` có đoạn mô tả ảnh lịch sử được chèn đúng vị trí ngữ nghĩa, và `keywords` ngữ nghĩa cho Bài 6 (Cách mạng tháng Tám năm 1945) và Bài 1 (Liên hợp quốc) để bạn có thể demo ngay với thầy tất cả các ví dụ thầy nhắc trong file ghi âm (*Liên hợp quốc*, *Tổng khởi nghĩa tháng Tám*, *Cây đa Tân Trào*).

---

## 4. Kế hoạch kiểm chứng (Verification Plan)

### Kiểm tra tự động (Automated Tests & Build)
- Chạy `npm run lint` và `npx tsc --noEmit` để đảm bảo không có lỗi kiểu dữ liệu TypeScript hay lỗi ESLint.
- Chạy `npm run build` để kiểm chứng toàn bộ Server/Client Components và API Route `/api/ai-assistant` biên dịch thành công.

### Kiểm chứng thực tế trên giao diện (Manual & Browser Verification)
1. **Luồng Giáo viên (Bảng mục lục & AI):**
   - Đăng nhập tài khoản mẫu `Cô Lan · Giáo viên` → Mở biên tập một bài học.
   - Kiểm tra tab **"Bảng mục lục & AI"**:
     - Thử tải một file `.docx` (hoặc bấm tách tự động từ văn bản sách) → Kiểm tra bảng sinh ra các hàng `1.1`, `1.2`, `1.3`...
     - Thử bấm nút **"Tách làm 2 mục"** trên mục `1.3` → Kiểm tra bảng tách thành `1.3` và `1.4` đúng như yêu cầu của thầy.
     - Thử bấm **"AI Chế biến Nội dung học"** và **"AI Mô tả & Chèn ảnh theo ngữ nghĩa"** → Kiểm tra lời mô tả ảnh được chèn vào đúng vị trí câu văn trong cột *Nội dung học*.
     - Lưu nháp và Công bố.
2. **Luồng Học sinh khiếm thị:**
   - Tại **Kho học liệu**: Nhập câu tìm kiếm tự nhiên *"Tôi muốn xem về Tổng khởi nghĩa tháng Tám"* hoặc *"Lễ xuất quân cây đa Tân Trào"* → Kiểm tra hệ thống tìm đúng Bài 6 và chỉ rõ mục khớp ngữ nghĩa.
   - Vào bài học: Kiểm tra khung **Trích xuất tóm tắt & Ý chính**, nghe TTS đọc bản **Nội dung học** (đã có mô tả ảnh nằm trong mạch văn), kiểm tra hộp đối chiếu **Nội dung gốc (SGK)** và phát Video từ URL bất kỳ.
   - Thử hỏi đáp ở tab **Hỏi đáp** và nộp bài ở tab **Luyện tập** → Kiểm tra khung **Lộ trình học cá nhân** hiển thị đúng mục đã nắm vững và mục cần ôn lại kèm nút nhảy thẳng tới mục đó.
