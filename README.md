# Kho học liệu số — Demo

Ứng dụng Next.js + TypeScript, chạy cục bộ, không cần khóa API.

## Chạy

```sh
npm install
npm run dev
```

Mở http://localhost:3000. Bản production: `npm run build` rồi `npm start`.
Kiểm tra: `npx tsc --noEmit` và `npm run lint`.

## Chức năng

- Tổng quan, thư viện, tìm kiếm tên và nội dung không phân biệt dấu.
- Hai bài mẫu, mỗi bài ba mục và ba câu trắc nghiệm.
- Mục lục, đánh dấu đã đọc, tiếp tục từ mục đã lưu.
- Hỏi đáp truy hồi từ khóa với đoạn nguồn có thể điều hướng; từ chối khi không đủ khớp. Không có LLM hoặc RAG thật.
- Quiz chỉ hiện giải thích sau khi nộp; điểm và tiến độ lưu theo tài khoản.
- TTS của trình duyệt, tốc độ, tạm dừng, tiếp tục, dừng; cần giọng tiếng Việt trên thiết bị. Không tự phát âm thanh.
- Chữ lớn, tương phản, skip link, HTML ngữ nghĩa, focus và bố cục responsive.
- Giáo viên sửa nội dung/câu hỏi, lưu nháp hoặc công bố có xác nhận kiểm tra.
- Quản trị xem tài khoản và nhật ký sự kiện thực hiện trong demo.

## Tài khoản mẫu

Vào Cài đặt & tài khoản, dùng bộ chọn tài khoản: Minh Anh (`student-1`), Hoàng Nam (`student-2`), Cô Lan (`teacher`), Quản trị (`admin`). Không có mật khẩu hay xác thực thật. Không nhập dữ liệu cá nhân nhạy cảm.
Dữ liệu lưu trong localStorage với tiền tố `suhoc-`; không đồng bộ thiết bị. Xóa các khóa này để khôi phục mẫu. Quyền và đáp án frontend không phải ranh giới bảo mật.

## Nội dung và giới hạn

Nội dung diễn giải do demo biên soạn, chưa được giáo viên xác minh, không phải trích nguyên văn sách giáo khoa. Chỉ dùng để kiểm tra tương tác. Trạng thái published mô phỏng hiển thị, không chứng nhận chuyên môn. Giao diện dùng danh sách bài học đơn giản, không dùng hình trang trí.
Truy hồi dùng ngưỡng khớp từ khóa, có thể bỏ sót hoặc chọn đoạn chưa phù hợp. Không tuyên bố đạt chuẩn tiếp cận; cần kiểm thử NVDA và người dùng thực tế. Không có OCR, STT, backend, xác thực, AI trả phí hoặc tác vụ nhiều agent.

## Kiểm thử thủ công

1. Mở Kho học liệu, chọn môn Lịch sử, tìm `Ha Noi`; mở liên kết đến đoạn đúng. Tìm `thiên văn` để xem trạng thái rỗng.
2. Mở Cách mạng tháng Tám, đánh dấu mục đã đọc. Sang Học liệu đang học, tải lại và tiếp tục học.
3. Hỏi `Hà Nội giành chính quyền ngày nào?`; bấm nguồn. Hỏi `Cách lập trình Python?` để nhận không đủ thông tin.
4. Chọn ba đáp án và nộp quiz; kiểm tra giải thích và nguồn. Tải lại, xem điểm trong Học liệu đang học.
5. Chuyển Hoàng Nam: không thấy tiến độ Minh Anh. Chuyển lại: dữ liệu vẫn còn.
6. Chọn Cô Lan, mở Quản lý học liệu, sửa tiêu đề/nội dung/câu hỏi; lưu nháp. Học sinh không thấy bài nháp. Công bố yêu cầu tích xác nhận.
7. Chọn Quản trị, xem tài khoản và log lưu bài/nộp quiz.
8. Dùng Tab/Shift+Tab, Enter/Space, mũi tên trong radio. Kiểm tra skip link, focus kết quả hỏi đáp/quiz, mục lục. Kiểm tra NVDA thủ công.
9. Bật chữ lớn, tương phản, zoom 200%, thu hẹp 390px; kiểm tra không mất nội dung.
10. Nếu có TTS: nghe, tạm dừng, tiếp tục, dừng và rời bài. Không có TTS vẫn dùng được toàn bộ bài.

## Cấu trúc

`app/data/lessons.ts`: kiểu dữ liệu và mẫu. `app/services/learning.ts`: tìm kiếm, truy hồi, lưu trữ. `app/components/learning-app.tsx`: trải nghiệm demo. `app/globals.css`: giao diện.
Sau demo, thay dịch vụ bằng backend xác thực và database tiến độ; biên tập học liệu được kiểm duyệt trong CMS; triển khai truy hồi + LLM có trích dẫn sau khi chốt nguồn, chi phí và đánh giá.

## Giao diện kho học liệu (27/09/2026)

Ứng dụng là kho học liệu nhiều môn. Hiện dữ liệu mẫu chỉ có Lịch sử lớp 12. Danh sách môn được lấy từ các tài liệu đã công bố, không tạo môn hoặc học liệu giả. Mỗi bài có subject và grade; dữ liệu demo cũ được bổ sung hai trường khi tải mà giữ nội dung và tiến độ.

Menu học sinh gồm Kho học liệu, Học liệu đang học, Cài đặt & tài khoản. Giáo viên và quản trị có thêm mục quản lý phù hợp. Trang kho chỉ có bộ chọn môn, tìm kiếm và tên tài liệu có thể mở; tiến độ và tùy chọn hiển thị ở trang riêng.

Kiểm tra: chọn Lịch sử, tìm Ha Noi và mở tên bài để đến mục nguồn. Tìm từ không có trong dữ liệu để xem trạng thái rỗng. Vào Cài đặt & tài khoản để bật chữ lớn/tương phản và chuyển tài khoản. Vào Học liệu đang học để tiếp tục nội dung đã lưu. Kiểm tra bằng Tab/Enter và chiều rộng 390px.
