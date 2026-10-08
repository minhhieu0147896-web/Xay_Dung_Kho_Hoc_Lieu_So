# Các chỉnh sửa giao diện ngày 08/10/2026

## Phạm vi đã thực hiện

| Điểm khó dùng | Thay đổi |
| --- | --- |
| Hai nhóm điều khiển cùng một hoạt động | Một hàng Đọc bài / Hỏi đáp / Luyện tập; video ở tài liệu bổ sung |
| Mục lục đẩy bài đọc xuống sâu trên điện thoại | Đặt nội dung trước cả trong DOM và bố cục; chọn môn/sách ở kho; nguồn và nghe toàn bài mở theo nhu cầu |
| Tìm “bài 6” không ra bài | Khớp số bài chính xác, hỗ trợ không dấu; ưu tiên tên bài, rồi chủ đề, nội dung; tìm theo tên mở đầu bài |
| 17 bài trong mục lục bị hiểu thành 17 bài đã có nội dung | Mặc định 2 bài có bản đọc, bộ lọc toàn mục lục; trạng thái video/mẫu/chưa nhập riêng; giữ bộ lọc khi quay lại |
| Nhãn giấy/AI/công bố gây hiểu nhầm | Dùng bài đọc; hỏi đáp ghi chưa kết nối AI; danh sách giáo viên hiển thị trạng thái nội dung thực tế |
| Biên tập dài, nhập bảng bằng ký tự phân cách | Sửa từng mục; bốn phần biên tập; nút lưu trên cùng bám khi cuộn; nhập từng ô bảng, thêm/xóa hàng/cột |
| Không chia sẻ hoặc tải lại đúng bài | URL bài + hoạt động + đoạn nguồn; hỗ trợ lịch sử trình duyệt; giữ phiên demo trong tab |
| Nút lặp thiếu ngữ cảnh | Tên truy cập gắn với mục/bài/nội dung/câu hỏi; thứ tự đọc trên điện thoại bắt đầu từ bài |

## Kiểm chứng đã thực hiện

- 17/17 kiểm tra dữ liệu, tìm kiếm, bản nháp/công bố, di trú, trích dẫn và API nhập tài liệu thành công với máy chủ phát triển.
- Kiểm tra trình duyệt: tìm “bài 6”, “bài 2”, lọc toàn mục lục, môn Toán chưa có dữ liệu, quay lại giữ bộ lọc.
- Chuyển hoạt động giữ câu hỏi, câu trả lời và đáp án đã chọn; nút tiến/lùi hoạt động; nhấn trích dẫn và tải lại vẫn mở đúng đoạn nguồn.
- Bỏ qua điều hướng bằng bàn phím đưa focus vào nội dung; Tab tiếp theo tới thao tác đổi bài với viền focus hiện rõ.
- Ở chiều rộng 390 px, mục đọc đầu bắt đầu khoảng 558 px từ đầu trang, so với khoảng 1.626 px trước sửa (tài khoản giáo viên demo). Không tràn ngang trang.
- Ở chiều rộng 320 px với chữ lớn 25 px và tương phản cao, không tràn ngang trang. Đây là thử bố cục hẹp và cỡ chữ, không thay thế kiểm tra đầy đủ zoom trình duyệt.
- Biên tập: chuyển mục, thêm bảng, nhập ô, thêm hàng/cột giữ dữ liệu, thanh lưu nằm trong vùng nhìn khi cuộn; bỏ bảng thử rồi lưu lại bản nháp, bản công bố không đổi.
- Ảnh kiểm tra: `screenshots/ui-fixed-desktop-2026-10-08.png`, `screenshots/ui-fixed-mobile-2026-10-08.png`.

## Giới hạn

Chưa thử NVDA hoặc với học sinh mù/khiếm thị; chưa xác nhận đạt chuẩn tiếp cận. Không thêm backend/AI hoặc nội dung SGK thật. Tiến độ và học liệu biên tập vẫn lưu trên trình duyệt; cờ phiên demo không phải tài khoản thật. Đáp án đang chọn được giữ khi đổi hoạt động cùng bài, chưa lưu qua tải lại trang.
