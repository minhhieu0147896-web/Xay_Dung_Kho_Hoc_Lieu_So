
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ghi nhớ dự án và nguyên tắc đã thống nhất

Được lưu theo yêu cầu của người dùng ngày 22/09/2026. Đọc phần này trước khi tiếp tục làm việc trong dự án.

### Sản phẩm và phạm vi

- Sản phẩm là kho học liệu số cho nhiều môn học; Lịch sử lớp 12 là môn demo ban đầu theo tài liệu `Dac_ta_ky_thuat_demo_hoc_lieu_Lich_su_12.docx`, ưu tiên học sinh THPT, đặc biệt học sinh mù và khiếm thị. Vertex chỉ là dự án tham khảo.
- Luồng chính: tìm bài → đọc/nghe → hỏi đáp có trích dẫn tới đúng đoạn → làm quiz → lưu tiến độ. Có vai trò học sinh, giáo viên và quản trị.
- Không tự mang các quyết định của Vertex như Sanity, Clerk, PostHog, khóa học video hoặc tìm kiếm timestamp vào sản phẩm này. Chọn công nghệ theo yêu cầu thực tế và mã hiện có.
- Phân biệt rõ demo, dữ liệu mẫu và chức năng thật. Không gọi truy hồi từ khóa là RAG có mô hình sinh; không tuyên bố nội dung đã được giáo viên duyệt hoặc đạt chuẩn tiếp cận khi chưa kiểm chứng.

### Thiết kế giao diện

- Người dùng thấy giao diện đầu tiên rối mắt. Ưu tiên giao diện gọn, dễ đọc, dễ tìm và dễ biết bước tiếp theo.
- Cập nhật 27/09/2026: trang đầu là Kho học liệu, ưu tiên chọn môn, tìm kiếm và danh sách tài liệu. Tiến độ chuyển sang Học liệu đang học; hiển thị và tài khoản chuyển sang Cài đặt & tài khoản. Tránh trang Tổng quan trùng chức năng và tránh nhiều nút cho cùng một tài liệu. Không tự thêm banner lớn, hình trang trí, thống kê, khẩu hiệu hoặc góc suy ngẫm khi chúng không phục vụ nhiệm vụ học tập.
- Với thay đổi thiết kế đáng kể, thống nhất một mẫu màn hình hoặc định hướng cụ thể trước khi triển khai rộng. Nếu chưa có mẫu, nêu rõ đề xuất và giả định; không tự coi lựa chọn thẩm mỹ của agent là quyết định đã chốt.
- Khi có ảnh/Figma được người dùng chọn làm chuẩn, bám bố cục, khoảng cách, chữ, màu và trạng thái; tái sử dụng thành phần hiện có. Bố cục di động phải thích ứng hợp lý. Nêu xung đột với yêu cầu tiếp cận nếu có.
- Viết quy tắc UI cụ thể, kiểm tra được thay vì chỉ yêu cầu “đẹp” hoặc “dễ dùng”. Bản hiện tại dùng chữ mặc định 16px, nội dung đọc 18px, một màu nhấn xanh lam trầm (cập nhật 27/09/2026); đây là hiện trạng có thể thay đổi theo quyết định của người dùng.
- Giao diện mặc định phải dễ đọc; chữ lớn và tương phản cao chỉ là hỗ trợ bổ sung. Duy trì HTML ngữ nghĩa, bàn phím, focus rõ, trình đọc màn hình và bố cục không mất nội dung khi phóng đại.
- Trang bài học có ba mục Đọc bài / Hỏi đáp / Luyện tập. Giữ câu hỏi, câu trả lời và đáp án đang chọn khi chuyển mục trong cùng bài; trích dẫn phải mở đúng đoạn nguồn.

### Cách làm việc và kiểm chứng

- Làm rõ sản phẩm, nguyên tắc thiết kế, ranh giới và tiêu chí nghiệm thu trước khi triển khai; đọc mã và tài liệu thực tế thay vì đoán.
- AGENTS.md giữ các quyết định lâu dài. Chi tiết riêng của tính năng hoặc kế hoạch thay đổi để ở tài liệu riêng khi cần; cập nhật ghi nhớ khi người dùng thay đổi quyết định lớn.
- `AGENTS.md_GUIDE.pdf` là tài liệu tham khảo về cách tổ chức công việc. Không sao chép nguyên stack hoặc tự áp dụng mọi quy trình phê duyệt của ví dụ vào dự án này. Yêu cầu trực tiếp mới nhất của người dùng quyết định phạm vi hành động.
- Chỉ báo kiểm tra thành công sau khi thực sự chạy. Lint, typecheck và build không chứng minh UI dễ dùng: phải xem giao diện, thử các luồng chính, màn hình nhỏ và bàn phím; đánh giá tiếp cận với công cụ/người dùng phù hợp trước khi tuyên bố đạt chuẩn.
- Khi tích hợp backend/AI thật, giữ khóa bí mật và xử lý nhạy cảm phía máy chủ; không coi tài khoản mẫu hoặc localStorage trong demo là xác thực/phân quyền thật.
