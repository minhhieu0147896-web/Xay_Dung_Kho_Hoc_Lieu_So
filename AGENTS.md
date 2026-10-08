
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

### Cập nhật 02/10/2026: học theo sách giáo khoa

- Người dùng yêu cầu triển khai bằng mã trong dự án; bắt đầu lớp 12, bộ Kết nối tri thức với cuộc sống. Ưu tiên Lịch sử hiện có, cho phép chọn môn; môn chưa có học liệu phải hiện trạng thái trống.
- Giao diện nền trắng, điều hướng chính phía trên, chọn môn/lớp/sách; bài học có mục lục bên trái, nội dung ở giữa, lựa chọn YouTube / bài giảng giấy / tương tác AI bên phải. Hạn chế khung thẻ lồng nhau.
- Mục lục và số bài phải theo đúng bộ sách. Không coi việc có mục lục là đã nhập nội dung SGK. Nội dung demo, video tham khảo và AI chưa kết nối phải ghi đúng trạng thái; giữ dữ liệu người dùng khi nâng cấp.

### Cập nhật 07/10/2026: biên tập học liệu có cấu trúc

- Người dùng đã đồng ý triển khai luồng nhập → bản nháp → xem trước/kiểm tra → công bố, chuẩn bị cho người học mù/khiếm thị. Cách dùng và giới hạn ở `docs/content-authoring.md`.
- Nội dung khởi tạo nằm trong `content/`; các khối có ID ổn định, nguồn/trang in, mô tả hình, cấu trúc bảng và bản chép lời. Không suy đoán trang in từ số trang PDF; không tự gắn nhãn SGK cho văn bản trích xuất chưa đối chiếu.
- Bản nháp tách khỏi bản công bố trong `suhoc-content-v2`; giữ dữ liệu cũ và tiến độ. Công bố vẫn cục bộ, chưa có tài khoản/duyệt/backend dùng chung thật. Route PDF/DOCX khóa trong production cho đến khi có xác thực giáo viên phía máy chủ.

### Tài liệu kiến trúc và kế hoạch (07/10/2026)

- Theo yêu cầu người dùng, thiết kế hệ thống nằm ở `docs/system-design.md`, kế hoạch và tiêu chí nghiệm thu ở `docs/implementation-plan.md`. Đọc trước khi triển khai backend.
- Phương án thiết kế là Next.js + Supabase PostgreSQL/Auth/Storage và worker nhập tài liệu, giữ phiên bản công bố bất biến và nguồn tới từng khối. Đây là kiến trúc mục tiêu, chưa phải backend đã triển khai; không biến giả định/ngưỡng nghiệm thu trong tài liệu thành kết quả đã kiểm chứng.

### Cập nhật 08/10/2026: sửa các điểm khó dùng sau đánh giá giao diện

- Người dùng đồng ý sửa các điểm đã đánh giá. Đọc bài / Hỏi đáp / Luyện tập là điều hướng hoạt động duy nhất; cột phải chứa video bổ sung và mục lục trong bài, không lặp lại lựa chọn đọc/AI. Thay nhãn “bài giảng giấy” bằng bài đọc; không mô tả hỏi đáp từ khóa là AI thật.
- Kho mặc định lọc bài có bản đọc, có lựa chọn toàn bộ mục lục. Tìm được số bài chính xác; phân biệt bài đọc mẫu, chỉ có video, và chưa nhập nội dung. Giữ bộ lọc và câu tìm kiếm khi quay lại kho trong phiên.
- Trên màn hình hẹp, nội dung đứng trước mục lục sách và tài liệu bổ sung cả trong DOM và bố cục. Bộ chọn môn/sách nằm ở kho; bài có lối về đổi bài/môn. Nguồn và nghe toàn bài mở theo nhu cầu.
- Bài có URL `/?bai=<id>&hoat-dong=ask|quiz#<nguon>` (đọc bỏ hoat-dong); nút tiến/lùi và tải lại khôi phục vị trí. Cờ phiên demo trong sessionStorage chỉ giữ trạng thái giao diện, không phải xác thực.
- Biên tập theo từng mục; tách Nội dung / Nguồn & nhập tệp / Luyện tập / Video. Nút lưu nháp ở thanh trên bám khi cuộn; bảng nhập từng ô. Giữ nguyên mã nguồn, cơ chế nháp/công bố và dữ liệu cũ.
