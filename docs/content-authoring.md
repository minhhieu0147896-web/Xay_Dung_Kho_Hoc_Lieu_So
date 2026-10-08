# Nhập và biên tập học liệu

## Dùng ngay trong bản chạy cục bộ

1. Chạy `npm run dev`. Đăng nhập demo, vào **Cài đặt & tài khoản**, chọn **Cô Lan · Giáo viên**.
2. Vào **Quản lý học liệu → Biên tập** ở bài cần nhập. Bài 6 Lịch sử 12 là điểm bắt đầu; nội dung có sẵn vẫn là mẫu, chưa phải nội dung SGK.
3. Chọn **Nguồn & nhập tệp → Nhập từ tài liệu hoặc bản sao JSON**. PDF có chữ: chọn khoảng trang tệp, tối đa 30 trang/lần. DOCX và TXT: nên tách riêng từng bài trước khi nhập. Giới hạn tệp 10 MB, văn bản trích xuất 150.000 ký tự.
4. PDF/DOCX/TXT thêm mục mới ở cuối bản biên tập. Xóa các mục mẫu nếu thay bằng nội dung thật; phải sửa hoặc bỏ câu hỏi đang trỏ tới mục trước khi xóa mục đó. JSON khôi phục nội dung bản biên tập, yêu cầu cùng mã bài.
5. Chọn **Nội dung → Mục đang biên tập** để sửa từng mục. Đối chiếu tài liệu gốc: sửa thứ tự chữ, tiêu đề, chia đoạn, chọn loại nội dung, ghi tên tài liệu và phiên bản. Điền **trang in trong tài liệu nguồn** cho từng khối. Trang tệp PDF không tự được coi là trang in.
6. Thêm hình bằng URL HTTPS hoặc đường dẫn ảnh trong dự án. Viết mô tả ngắn; bản đồ/biểu đồ cần mô tả chi tiết. Nhập bảng trực tiếp vào từng ô, dùng nút Thêm hàng/Thêm cột; cột đầu là tiêu đề hàng; tách bảng có ô gộp thành bảng đơn giản. Video cần bản chép lời và mô tả thông tin chỉ thể hiện qua hình ảnh.
7. **Lưu bản nháp** ở thanh trên (luôn hiện khi cuộn) để tiếp tục sau. **Xem trước và kiểm tra** để đọc bản hiển thị, sửa lỗi được liệt kê, đối chiếu nguồn và thử bàn phím/trình đọc màn hình. Chỉ xác nhận những kiểm tra thực sự đã làm.
8. **Công bố trong demo** thay bản học sinh đọc trên trình duyệt này, giữ một bản công bố trước để mở lại thành bản nháp. **Nguồn & nhập tệp → Tải bản sao học liệu (JSON)** tạo tệp trên máy; nên dùng sau mỗi phiên biên tập.

Nếu có PDF nguồn, có thể mở đối chiếu trong trình biên tập; tệp gốc chỉ tồn tại trong phiên và phải lưu riêng. PDF scan chưa có OCR. Word chỉ lấy văn bản, không tự phục dựng hình, bảng, số trang hay thứ tự đọc đúng. Không gửi tài liệu tới dịch vụ AI.

## Cấu trúc dữ liệu

`content/lich-su/lop-12/ket-noi-tri-thuc/sach.json` giữ mục lục. `bai-06.json` và `bai-10.json` giữ hai bài mẫu. `app/data/lessons.ts` ghép dữ liệu vào ứng dụng; khi thêm tệp bài mới phải thêm import tại đây.

Mỗi bài có mã ổn định, môn/lớp/bộ sách/số bài, nguồn và phiên bản. Mỗi mục có mã riêng; mỗi đoạn văn, danh sách, hình, bảng có mã riêng và trang nguồn. Không đổi mã khi chỉ sửa câu chữ: tiến độ bám mã mục, trích dẫn bám mã khối. Câu hỏi giữ mã mục nguồn và giải thích. `body` được tạo từ các khối để tương thích dữ liệu cũ.

Sửa trong trình duyệt **không ghi vào các tệp JSON của dự án**. Muốn đưa một bài đã biên tập vào dữ liệu khởi tạo chung, xuất JSON, kiểm tra rồi cập nhật tệp bài tương ứng trong dự án. Giữ nguyên mã bài và thông tin bộ sách. Chưa có dịch vụ lưu học liệu chung hoặc đồng bộ thiết bị.

LocalStorage `suhoc-content-v2` giữ riêng `published`, `drafts`, `previous`. Khóa `suhoc-lessons-v1` được đọc để nâng cấp mà không xóa; tiến độ vẫn giữ khóa cũ. Nếu học liệu đã lưu bị hỏng, ứng dụng khóa ghi để tránh đè lên dữ liệu cần khôi phục. Nếu bộ nhớ đầy/bị chặn, không báo lưu thành công; xuất JSON trước khi rời phiên.

## Phạm vi và điều kiện sử dụng thật

- Kiểm tra trường bắt buộc không xác nhận tính chính xác hoặc đạt chuẩn tiếp cận. Cần đối chiếu SGK thực tế, giáo viên kiểm tra và thử NVDA cùng học sinh mù/khiếm thị trước khi dùng học tập chính thức.
- TTS dùng giọng có trên thiết bị. Hỏi đáp hiện là truy hồi từ khóa với trích dẫn khối, không phải mô hình AI sinh câu trả lời.
- Route nhập PDF/DOCX chỉ mở trong môi trường phát triển. Bản production trả 403 cho route này vì dự án chưa có xác thực/phân quyền giáo viên thật. JSON/TXT vẫn xử lý tại trình duyệt. Cần backend có xác thực, giới hạn tài nguyên xử lý tệp, lưu bản gốc và lịch sử duyệt trước khi mở nhập tài liệu trên Internet.
- `npm audit --omit=dev` ngày 07/10/2026 còn cảnh báo ở Next.js, sharp, source-map-js và nhánh CLI argparse/sprintf-js của Mammoth. Không coi bản demo là sẵn sàng triển khai công khai; không tự chạy `audit fix --force` (đề xuất hạ Mammoth xuống phiên bản rất cũ).

## Kiểm thử

`npm test` chạy kiểm tra dữ liệu, di trú, công bố, mô tả tiếp cận và trích dẫn; bộ kiểm tra API bỏ qua nếu chưa đặt URL máy chủ.

Chạy `npm run dev` rồi tại PowerShell khác:

```powershell
$env:IMPORT_TEST_URL = 'http://localhost:3000'
npm test
```

Các tệp trong `tests/fixtures` là dữ liệu tổng hợp để thử PDF/Word, không phải SGK. API kiểm tra đọc PDF/DOCX, PDF rỗng, định dạng sai, khoảng trang sai, nguồn yêu cầu khác miền và tệp quá lớn.

Kiểm tra giao diện: lưu bản nháp rồi mở kho học liệu (bản công bố phải giữ nguyên), tải lại và mở lại bản nháp; nhập PDF rồi kiểm tra trang tệp/trang in; chuyển Đọc bài/Hỏi đáp/Luyện tập và kiểm tra dữ liệu đang nhập; bấm trích dẫn để tới đúng đoạn; kiểm tra bàn phím, màn hình hẹp và phóng đại. Thử thực tế với NVDA là bước riêng, chưa được tự động xác nhận bởi các kiểm tra này.
