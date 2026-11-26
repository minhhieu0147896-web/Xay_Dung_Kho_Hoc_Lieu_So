# Kế hoạch cải tiến Giao diện (UI/UX) & Tiếp cận — Chuẩn Web Học Tập Hiện Đại

> **Định hướng tham chiếu:** Kết hợp sự tối giản, dễ đọc của **Khan Academy** (nền trắng thoáng, phân cấp chữ rõ, độ rộng dòng chuẩn 65–70 ký tự) + bố cục khóa học 2 cột của **Coursera / PREP** (nội dung & video bên trái, mục lục bám dính bên phải) + tiêu chuẩn tiếp cận **WCAG 2.2 mức AA** cho học sinh khiếm thị.

---

## 1. Chẩn đoán 5 nguyên nhân khiến giao diện hiện tại bị "khó nhìn"

1. **Lạm dụng nền xanh nhạt & viền xanh trên mọi thành phần ("Box-in-Box"):** Thanh điều hướng, thanh chọn môn, thẻ bài học, nút lọc, nút phụ, khung tóm tắt, khung đối chiếu đều dùng chung nền xanh `#eaf3fc` / `#f3f8fd` và viền xanh `#96b7d6` → mọi thứ có độ nổi ngang nhau, mắt không biết nhìn vào đâu trước.
2. **Phần đầu trang bài học bị chồng quá nhiều khối trước khi tới nội dung đọc:** Hàng nút tắt (`Đổi bài`, `Danh sách bài`, `Tới bài đọc`) + Video + 3 nút tab đóng khung + `<details>` Nghe bài + `<details>` Nguồn + Khung tóm tắt nhanh → học sinh phải cuộn rất dài mới thấy Mục 1.
3. **Quá nhiều viên nhãn (pill badges) màu mè ở Kho học liệu:** Mỗi dòng bài học gắn 3–4 thẻ màu (xanh dương, hổ phách, đỏ hồng, tím, xanh lá) gây nhiễu thị giác.
4. **Nút "Nghe bài (TTS)" bị giấu trong `<details>` đóng kín:** Trong khi với học sinh khiếm thị, trình nghe bài là thao tác quan trọng số 1.
5. **Bảng biên tập Giáo viên (`Bảng mục lục & AI`) ép 6 cột ngang vào 1 bảng:** Khiến 2 ô văn bản lớn (*Nội dung gốc SGK* và *Nội dung học*) bị bóp hẹp, rất khó đọc và khó đối chiếu khi sửa.

---

## 2. Quy chuẩn thiết kế cụ thể & kiểm tra được (Design Tokens)

### 2.1. Hệ màu tối giản (Nền sáng sạch — 1 màu nhấn duy nhất)
- **Nền trang tổng thể (`--bg-page`):** `#f8fafc` (xám lạnh siêu nhạt tạo chiều sâu cho thẻ trắng).
- **Bề mặt thẻ / bài đọc (`--surface` / `--white`):** `#ffffff`.
- **Viền mảnh tinh tế (`--border`):** `#e2e8f0` (chỉ dùng `#94a3b8` khi hover/focus hoặc chế độ Tương phản cao).
- **Chữ chính (`--ink`):** `#0f172a` (tương phản > 15:1 trên nền trắng).
- **Chữ phụ (`--muted`):** `#475569` (tương phản > 7:1 trên nền trắng, đạt chuẩn AAA).
- **Màu nhấn duy nhất (`--accent` / `--green`):** `#1e5480` (xanh lam trầm dịu mắt, tương phản > 7.5:1 với chữ trắng; chỉ dùng cho **nút chính CTA**, **tab đang chọn**, và **trạng thái hoàn thành**).
- **Nút phụ (`secondary`, nút thao tác):** nền `#ffffff`, viền `1px solid #cbd5e1`, chữ `#1e293b`, hover `#f1f5f9`. **Bỏ hoàn toàn nền xanh nhạt trên các nút phụ.**
- **Trạng thái hoàn thành (`--done`):** nền `#ecfdf5`, chữ `#065f46`, viền `#a7f3d0`.
- **Trạng thái cảnh báo/xóa (`--danger`):** nền `#fef2f2`, chữ `#991b1b`, viền `#fecaca`.
- **Chế độ Tương phản cao (`.high-contrast`):** Nền `#ffffff`, viền `2px solid #0f172a`, chữ `#000000`, bỏ toàn bộ `box-shadow`.

### 2.2. Typography & Khoảng cách (Hệ lưới 8px + WCAG 2.2 AA)
- **Font chữ:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` với `font-feature-settings` mượt dấu tiếng Việt.
- **Cỡ chữ & Độ dài dòng:**
  - Giao diện chung: `16px`, `line-height: 1.6`.
  - Nội dung bài đọc: `18px`, `line-height: 1.75`, độ rộng tối đa đoạn văn `max-width: 68ch`, khoảng cách giữa các đoạn văn `1.25em`.
  - Tiêu đề rõ phân cấp: `h1: 1.75rem (700)`, `h2: 1.35rem (700)`, `h3: 1.1rem (600)`.
- **Vùng bấm & Focus:** Mọi nút/liên kết tương tác có `min-height: 44px`; vòng focus `:focus-visible` là `3px solid #1d4ed8` với `outline-offset: 3px`.
- **Bo góc & Bóng đổ:** Thẻ lớn `border-radius: 12px`, nút/ô nhập `border-radius: 8px`, bóng đổ nhẹ `0 1px 2px rgba(15, 23, 42, 0.04)`.

---

## 3. Kế hoạch nâng cấp từng màn hình (Chia 2 Lượt chạy Workflow)

### Lượt chạy 5A — Thiết kế lại Hệ thống Giao diện + Trang Kho học liệu + Trang Học bài (Phía Học sinh)

1. **Thanh điều hướng trên cùng (Top Header — `app/study.css`, `app/components/learning-app.tsx`):**
   - Đổi nền xanh `#eaf3fc` sang **nền trắng tinh `#ffffff`** với viền dưới mảnh `1px solid #e2e8f0`, cao gọn (`padding: 12px 32px`), bám dính nhẹ (`position: sticky; top: 0; z-index: 40`).
   - Mục đang chọn dùng kiểu **chữ xanh nhấn đậm + gạch chân mảnh `2px`** (bỏ đóng hộp viền xanh).

2. **Trang Kho học liệu (`app/components/home-page.tsx`, `app/components/course-picker.tsx`, `app/study.css`):**
   - **Gọn hóa thanh chọn Môn / Lớp / Sách:** Đặt gọn trên nền trắng sạch, các `<select>` bo góc `8px` viền mảnh `#cbd5e1`, bỏ dải nền xanh dày.
   - **Thanh Tìm kiếm & Giọng nói hiện đại:** Làm nổi bật ô tìm kiếm (`min-height: 50px`, `border-radius: 12px`, nền trắng, viền `#cbd5e1`, bóng nhẹ khi focus) đi liền nút **Tìm bằng giọng nói** (màu xanh nhấn nhẹ khi tắt, đỏ/xanh đậm khi đang thu âm). Dòng checkbox *"Tự động mở bài khớp nhất"* bỏ khung hộp, hiển thị thành 1 dòng chữ nhỏ gọn ngay dưới thanh tìm kiếm.
   - **Bộ lọc dạng Underline Tabs:** Chuyển 3 nút lọc (`Có bài đọc`, `Có video`, `Toàn bộ mục lục`) từ 3 hộp nút xanh nặng nề sang thanh tab tối giản có đường gạch chân ở mục đang chọn.
   - **Thẻ danh sách bài học sạch sẽ (kiểu Khan Academy / Coursera):**
     - Nền trắng `#ffffff` trên nền trang `#f8fafc`, viền `1px solid #e2e8f0`, `border-radius: 12px`, padding `16px 20px`.
     - **Giảm tối đa nhãn màu:** Mỗi hàng chỉ hiện **Số bài** (hình tròn/vuông bo góc xám nhạt, chuyển xanh lá khi hoàn thành) + **Tên bài đậm** + **1 dòng metadata chữ xám tinh tế** ngăn cách bằng dấu chấm `·` (VD: `Có bài đọc · Video tham khảo · 4 câu luyện tập`); chỉ dùng pill nổi bật duy nhất khi có **Khớp ngữ nghĩa** hoặc **Tiến độ đang học**.

3. **Trang Học bài (`app/components/learning-app.tsx`, `app/components/lesson-video.tsx`, `app/components/study-outline.tsx`, `app/study.css`):**
   - **Header bài học tối giản:** Thay 3 nút shortcut to thành 1 dòng **Breadcrumb gọn gàng** (`← Kho học liệu / Lịch sử 12 / Bài 6`) nằm ngay trên `<h1>` tên bài.
   - **Tab hoạt động (`Đọc bài` | `Hỏi đáp` | `Luyện tập`) kiểu Coursera:** Thanh tab ngang có đường viền dưới `#e2e8f0` và gạch chân `3px solid var(--green)` cho tab đang mở (không đóng khung hộp rời rạc).
   - **Thanh Audio Player (Nghe bài TTS) hiện trực tiếp — KHÔNG giấu trong `<details>`:**
     - Ngay đầu tab **Đọc bài**, đặt 1 thanh ngang gọn đẹp (`background: #f8fafc`, `border: 1px solid #e2e8f0`, `border-radius: 10px`):
       - Nút chính **`Nghe toàn bài` / `Tạm dừng`**
       - Nút phụ **`Nghe tóm tắt`**
       - Chọn tốc độ **`0.8× / 1× / 1.2× / 1.5×`** và nút **`Dừng`**
   - **Khung Trích xuất nhanh (Tóm tắt & Ý chính) & Nguồn tài liệu:** Thu gọn vào `<details>` sạch sẽ (mặc định đóng hoặc gọn 1 dòng tiêu đề) để học sinh mở bài ra là **thấy ngay Mục 1 rõ ràng**, không bị đẩy trôi xuống dưới.
   - **Nội dung đọc chuẩn báo chí / sách giáo khoa điện tử:** Văn bản `18px`, `line-height: 1.75`, `max-width: 68ch`, khoảng cách giữa các mục thoáng (`32px`), phân tách bằng đường kẻ mảnh `#e2e8f0`, nút `Đánh dấu đã đọc` và `Nghe mục này` xếp gọn nhẹ ở chân mỗi mục.
   - **Cột phải (`StudyOutline`):** Nền trắng `#ffffff`, viền mảnh `#e2e8f0`, `border-radius: 12px`, bám dính (`position: sticky; top: 80px`), thanh tiến độ mảnh mượt mà. Trên màn hình nhỏ (`< 960px`) vẫn giữ nguyên thứ tự nội dung đứng trước mục lục.

---

### Lượt chạy 5B — Thiết kế lại Không gian Giáo viên (`Bảng mục lục & AI`) dễ nhìn & dễ so sánh

- **Vấn đề cần sửa trong `app/components/lesson-editor.tsx` & `app/study.css`:**
  - Bỏ kiểu nhồi 6 cột ngang (`Mã mục`, `Tiêu đề`, `Nội dung gốc`, `Nội dung học`, `Video URL`, `Thao tác`) vào 1 `<table>` chật hẹp.
  - Thay bằng **Bố cục Thẻ so sánh 2 cột (Split-View Section Cards)** (kèm nút chuyển sang bảng mục lục thu gọn chỉ gồm Mã mục + Tiêu đề để nhìn nhanh toàn bài):
    - **Thanh trên mỗi mục:** Ô `Mã mục` nhỏ gọn (`72px`) + Ô `Tiêu đề mục` rộng rãi (`flex: 1`) + nhóm nút cấu trúc (`Tách làm 2 mục`, `Gộp xuống mục dưới`).
    - **Thân mỗi mục (Grid 2 cột 50% – 50% trên desktop, xếp dọc trên mobile):**
      - Cột trái: **Nội dung gốc (SGK)** — nền `#f8fafc`, chữ rõ, dễ đối chiếu.
      - Cột phải: **Nội dung học (Đọc cho người khiếm thị)** — nền `#ffffff`, viền nhấn nhẹ.
    - **Chân mỗi mục:** 1 hàng gọn gồm ô `Link Video URL` (tùy chọn) và thanh **3 nút AI** (`Chế biến Nội dung học`, `Mô tả & Chèn ảnh`, `Tạo câu hỏi Quiz`).
  - **Không sửa bất kỳ logic nghiệp vụ, hợp đồng API hay state nào** — chỉ cải tổ layout, phân cấp thị giác và CSS để giáo viên nhìn vào là thao tác mượt ngay!

---

## 4. Tiêu chí nghiệm thu (Verification Checklist)

- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test` đều **PASS (0 lỗi)**.
- [ ] Giao diện mặc định dùng nền sạch `#f8fafc` / `#ffffff`, chỉ có **1 màu nhấn duy nhất**, không còn tình trạng mọi nút/thẻ đều phủ nền xanh và viền xanh chồng nhau.
- [ ] Ở màn hình đọc bài (1280×800), mở bài lên thấy ngay tiêu đề, thanh Nghe bài (TTS) và bắt đầu nội dung bài đọc mà không bị quá nhiều hộp đóng khung che lấp.
- [ ] Ở màn hình giáo viên, cột **Nội dung gốc (SGK)** và **Nội dung học** nằm song song 2 cột rộng rãi, không bị bóp chữ.
- [ ] Toàn bộ luồng bàn phím (`Tab`/`Shift+Tab`/`Enter`/`Space`), vòng focus `:focus-visible`, chế độ **Chữ lớn**, **Tương phản cao**, và màn hình di động `360px` không bị vỡ hay mất nội dung.
