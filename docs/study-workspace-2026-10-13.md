# Giao diện học tập và video — 13/10/2026

## Tham khảo và quyết định

Theo yêu cầu người dùng, tham khảo cách PREP tổ chức học liệu thành bài, mục và theo dõi mức độ hoàn thành. Nguồn đã đọc: [hướng dẫn danh sách buổi học của PREP](https://prepedu.gitbook.io/preps-user-manual/iii.-hoc-va-luyen-thi-cung-prep/khoi-tao-ke-hoach-hoc-tap/toi-co-the-xem-cac-bai-hoc-cua-minh-trong-study-plan-nhu-the-nao), phần giới thiệu công khai trên [PREP](https://prepedu.com/vi/).

Chưa truy cập màn hình khóa học riêng sau đăng nhập. Bố cục video lớn và mục lục bên phải là phương án áp dụng cho kho học liệu này; không tuyên bố giống từng điểm ảnh của PREP. Không sử dụng thương hiệu, hình ảnh hay video khóa học PREP.

## Thay đổi đã triển khai

- Hai cột trên máy tính: vùng học chính và mục lục 340 px (300 px ở màn hình hẹp hơn). Dưới 900 px chuyển thành một cột theo đúng thứ tự DOM.
- Video YouTube hiện có được đưa lên vùng chính theo tỷ lệ 16:9, không tự phát, có nút thu gọn, nguồn và liên kết mở ngoài khi gặp lỗi trình phát.
- Thu gọn loại bỏ iframe để dừng phát. Khi TTS đọc nội dung, iframe được thay bằng thông báo để tránh chồng tiếng. Mở lại video không giữ thời điểm đang xem.
- Bản chép lời ở ngay dưới video; nếu thiếu thì ghi rõ, không dùng bài đọc mẫu để giả làm bản chép lời.
- Ba hoạt động Đọc bài / Hỏi đáp / Luyện tập giữ nguyên dữ liệu trong cùng bài. Lối tắt Tới bài đọc giúp bỏ qua video bằng bàn phím.
- Mục lục bên phải cho biết bài đang học, từng mục đã đọc, tiến độ đọc/luyện tập thật, các bài theo chủ đề và trạng thái nội dung. Tiến độ không tính thời gian xem video.
- Kho thêm bộ lọc Có video; mỗi dòng có số bài và loại học liệu. Bài chưa gắn video dùng thông báo gọn, không hiện khung phát giả.
- Không đổi dữ liệu SGK, mã nguồn trích dẫn, dữ liệu cục bộ hoặc luồng biên tập.

## Kiểm chứng

- Lint, TypeScript qua bước build, và build thành công.
- 17/17 kiểm tra dữ liệu/API thành công với máy chủ phát triển.
- Đã phát video Bài 6 trong trình duyệt; xác nhận thu gọn gỡ iframe, bật TTS hiện trạng thái dừng video.
- Đã thử bộ lọc video (2 bài), bài 10 không có video, giữ câu hỏi và đáp án khi chuyển hoạt động, mở đúng đoạn trích dẫn.
- Đã xem màn hình 390 px và kiểm tra 320 px với chữ lớn 25 px: không tràn ngang trang. Lối tắt bài đọc chuyển focus vào vùng đọc; nút thu gọn dùng được bằng Enter.
- Chưa kiểm tra với NVDA hoặc người học mù/khiếm thị; không coi đây là chứng nhận tiếp cận. Video tham khảo hiện tại chưa có bản chép lời được kiểm tra.
