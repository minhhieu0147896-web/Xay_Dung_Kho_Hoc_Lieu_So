# Kế hoạch triển khai Kho học liệu số

**Phiên bản 1.0 · 07/10/2026**  
Đi cùng [thiết kế hệ thống](system-design.md). Đây là kế hoạch công việc và tiêu chí nghiệm thu, không phải báo cáo những tính năng đã hoàn thành.

## 1. Kết quả cần đạt

Một giáo viên được phân công nhập học liệu Lịch sử 12 từ tài liệu có nguồn, lưu nháp và gửi duyệt. Người duyệt kiểm tra rồi công bố. Học sinh dùng tài khoản thật trên hai thiết bị để đọc/nghe, mở đúng nguồn, làm quiz và tiếp tục tiến độ. Người dùng mù hoàn thành được luồng chính bằng bàn phím và trình đọc màn hình. Có sao lưu đã thử khôi phục.

Bài 6 là lát cắt đầu tiên để làm trọn luồng. Chưa nhập hàng loạt hoặc mở thêm môn trước khi lát cắt này đạt. Khi chưa có SGK nguồn, dùng fixture rõ nhãn mẫu để kiểm chức năng; không công bố như học liệu SGK đã xác minh.

## 2. Thứ tự, phụ thuộc và công sức

Ước lượng cho một lập trình viên quen Next.js/PostgreSQL, không tính thời gian chờ tài khoản, giáo viên đối chiếu, tạo mô tả hình hoặc thử với học sinh. Mỗi ngày công là thời gian làm việc tập trung; không phải cam kết lịch giao. Điều chỉnh sau G1 khi có schema/luồng đọc chạy thật.

| Giai đoạn | Kết quả | Phụ thuộc | Ngày công dự kiến |
|---|---|---|---:|
| G0 | Chuẩn bị, sao lưu và chốt đầu vào | Không | 1–2 |
| G1 | Auth, schema/RLS, danh mục và đọc từ DB | G0 | 5–7 |
| G2 | Nháp, duyệt, phiên bản và công bố | G1 | 5–7 |
| G3 | Tệp riêng tư, worker nhập và áp dụng nháp | G2 | 4–6 |
| G4 | Tiến độ, quiz server, di trú có kiểm tra | G1–G3 | 4–6 |
| G5 | Tiếp cận, nội dung pilot và diễn tập vận hành | G1–G4 | 5–8 |
| G6 | Pilot giới hạn, sửa lỗi và quyết định mở rộng | G5 | 3–5 |
| G7 | AI/OCR và các môn tiếp theo | Sau đánh giá G6 | Ước lượng riêng |

MVP G0–G6 khoảng 27–41 ngày công phát triển theo giả định trên. Biên tập học liệu và làm việc với người dùng có lịch riêng, có thể kéo dài tổng thời gian. Không dùng số ngày công để ép bỏ kiểm tra quyền hay tiếp cận.

## 3. Công việc chi tiết

### G0 — Chuẩn bị

**T0.1 · Xác lập điểm phục hồi.** Ghi commit, xuất dữ liệu localStorage/JSON, liệt kê nguồn và tệp chưa có. Chỉ dùng dữ liệu tổng hợp ở kiểm thử. Đầu ra: bản xuất, danh sách ID, báo cáo hiện trạng; không có dữ liệu người dùng bị xóa.

**T0.2 · Chuẩn bị tài khoản/hạ tầng.** Chủ dự án sở hữu Supabase và nơi chạy web/worker, chọn ngân sách/region; dev và staging tách production. Cấu hình SMTP/URL đăng nhập khi cần. Không gửi secret trong chat/Git. Có thể làm local trước khi tài khoản được cấp.

**T0.3 · Rà soát phụ thuộc.** Đánh giá các cảnh báo Next.js/parser hiện có; nâng bản vá có kiểm tra hồi quy và đọc tài liệu phiên bản. Không đổi framework hoặc hạ thư viện tùy tiện để làm sạch audit.

**Cổng G0:** có điểm phục hồi, phạm vi pilot, môi trường kiểm thử và danh sách vấn đề phụ thuộc; không còn rủi ro chặn triển khai Internet chưa được xử lý.

### G1 — Nền dữ liệu và tài khoản

**T1.1 · Schema nền.** Migrations cho profiles/roles, course/catalog, revision/section/block/source; FK tổng hợp, uniqueness và trạng thái. Seed danh mục 17 bài, hai revision mẫu; các bài rỗng không có bản công bố giả. Sinh kiểu database từ schema.

**T1.2 · Đăng nhập và quyền.** Thay tài khoản demo trong connected mode bằng Auth; phân công course, disabled account, luồng đăng xuất/khôi phục mật khẩu. Grants/RLS và hàm kiểm quyền cùng migration. Có tài khoản test học sinh A/B, giáo viên A/B, admin.

**T1.3 · Lát cắt đọc.** Repository/DTO chuyển một revision DB thành giao diện đọc hiện có. Danh mục/search chỉ trả đúng phạm vi, URL có revision/block. Không tải toàn bộ dữ liệu riêng tư lên client rồi ẩn bằng CSS.

**Nghiệm thu:** tài khoản A không đọc tiến độ B; giáo viên ngoài course không đọc draft/tệp; client không tự cấp role. Bài 6 mở từ DB, Bài 1 nếu chưa có nội dung hiện trạng thái đúng. Build/typecheck/lint, test DB/API và kiểm bằng trình duyệt đều có kết quả lưu lại.

### G2 — Biên tập và công bố

**T2.1 · Nháp server.** Editor hiện có gọi API, có edit_version, trạng thái lưu, xử lý mất mạng/xung đột, xuất JSON. Chỉ một draft/in_review/approved đang hoạt động mỗi bài. Hai người mở cùng bản không ghi đè âm thầm.

**T2.2 · Nguồn và phiên bản.** Gán source ở cấp block/resource; phân biệt trang in/trang tệp. Snapshot published bất biến, sửa tạo draft mới. Migration source không tự biến demo thành textbook.

**T2.3 · Duyệt.** Màn hình quản trị xem snapshot, nguồn và bằng chứng; chấp thuận/trả sửa từng nhóm content/accessibility. Người duyệt khác tác giả. Chỉnh sửa sau duyệt làm vô hiệu quyết định trước.

**T2.4 · Công bố/thu hồi.** RPC giao dịch khóa lesson, kiểm hash/review/pointer, audit và idempotency. Lịch sử xem được theo quyền. Thu hồi đóng đường đọc/search/access URL mới, giữ thông báo bản cũ.

**Nghiệm thu:** lưu nháp không đổi bài học hiện hành; hai lần công bố đồng thời không tạo hai current; retry trả cùng kết quả; URL trích dẫn cũ vẫn đúng snapshot; withdrawn không lọt cache. Có test rollback transaction khi lỗi giữa chừng.

### G3 — Upload và nhập tài liệu

**T3.1 · Storage.** Private buckets, upload intent/complete, object path máy chủ sinh, checksum, quarantine/ready, phân quyền asset. Không cho học sinh lấy bản sách gốc chỉ từ assetId đoán được.

**T3.2 · Worker.** Hàng đợi PostgreSQL, lease/token/timeout/retry/cancel, tiến trình parser cách ly. Giới hạn dung lượng giải nén DOCX và tài nguyên. Không có fetch mạng tùy ý từ tài liệu.

**T3.3 · Kết quả vào nháp.** Poll trạng thái có khoảng nghỉ phù hợp, hiển thị cảnh báo; Apply có version/idempotency. Kết quả thiếu chữ/scan giữ needs_ocr; không tạo bài hoàn chỉnh giả. Job chỉ áp dụng một lần; muốn nhập lại phải tạo job mới rõ ràng.

**Nghiệm thu:** PDF chữ và DOCX tiếng Việt đọc được; scan, khóa, sai định dạng, quá dung lượng, timeout báo đúng. Worker chết rồi khởi động lại không nhân đôi; sửa nháp trong lúc chờ import không bị ghi đè; file byte trên Storage khớp checksum ghi DB. Route import production cũ chỉ được thay thế khi các kiểm tra quyền mới đạt.

### G4 — Học tập dùng chung và di trú

**T4.1 · Tiến độ/tùy chọn.** Lưu theo user/revision; conflict theo edit_version; hai thiết bị cùng tài khoản. Không trộn tiến độ hai tài khoản khi đăng xuất/đăng nhập. Không tự coi dữ liệu chưa gửi là đã đồng bộ.

**T4.2 · Quiz.** Quiz_keys riêng tư; attempt gắn revision; lưu đáp án chọn, chấm transaction, idempotency submit, trả giải thích sau nộp. Giữ trạng thái khi chuyển mục.

**T4.3 · Chuyển dữ liệu cũ.** Preview/apply, mapping giữ ID, hash chống nhập trùng, báo mục không ánh xạ. Người dùng chọn rõ tài khoản mẫu muốn nhận. Điểm demo lưu nhãn legacy, không tính là điểm server xác thực. Không xóa localStorage cũ.

**Nghiệm thu:** học trên máy A rồi tiếp tục máy B; bản mới không gán điểm quiz cũ; network response trước nộp không chứa đáp án; nhập lại cùng gói không nhân đôi; báo cáo số lượng trước/sau đầy đủ. Có thử mất mạng giữa nộp quiz và nhận phản hồi.

### G5 — Học liệu tiếp cận và vận hành

**T5.1 · Bài 6 hoàn chỉnh.** Giáo viên cung cấp nguồn/phiên bản/phạm vi sử dụng, đối chiếu từng mục/đoạn/trang, viết mô tả hình, xử lý bảng, video và quiz. Chưa có nguồn thì giữ nhãn mẫu và ghi rõ chưa đủ điều kiện học liệu thật.

**T5.2 · Tiếp cận.** Kiểm tự động cộng bàn phím, phóng đại và NVDA; mời người học mù thực hiện kịch bản thực tế. Ghi cả lỗi không tự động phát hiện: mô tả vô nghĩa, tên nút khó hiểu, thứ tự đọc gây lạc, TTS nói chồng.

**T5.3 · Sao lưu/khôi phục.** Tạo manifest DB/objects, lịch backup, hướng dẫn phục hồi Auth/cấu hình. Diễn tập staging độc lập và đo thời gian. Rà soát dữ liệu lưu trong log và quyền xem audit.

**T5.4 · Thử tải.** Dữ liệu giả theo quy mô pilot; báo p95/5xx/độ trễ queue và cấu hình. Kiểm giới hạn upload, rate limit, thu hồi và cache dưới tải. Dự toán tháng gồm cả egress/backup.

**Nghiệm thu:** không có lỗi chặn luồng chính với người dùng mục tiêu; có bằng chứng nguồn và duyệt; backup thực sự restore được; quyền không rò; mục tiêu hiệu năng đạt hoặc điều chỉnh phạm vi pilot có căn cứ. Không tích hoàn thành WCAG chỉ bằng kết quả một công cụ.

### G6 — Pilot giới hạn

Mời nhóm nhỏ theo khả năng hỗ trợ của chủ dự án; hướng dẫn giáo viên/người học, có kênh báo lỗi và người chịu trách nhiệm. Theo dõi lỗi lưu, nhập, mất focus, tải chậm và nội dung sai. Không tự thêm phân tích hành vi/ghi âm màn hình của học sinh.

Sửa lỗi theo mức độ: mất dữ liệu/rò quyền → lỗi cản học → sai nội dung/nguồn → khó thao tác → tiện ích. Có thể tạm dừng nhập/công bố khi cần nhưng giữ đọc bản an toàn. Tổng kết dựa trên lỗi thực tế, không chỉ số tài khoản.

**Cổng mở rộng:** Bài 6 trọn luồng, người dùng thực tế học được, dữ liệu giữ đúng, có người duyệt và năng lực hỗ trợ. Sau đó mới nhân quy trình sang các bài Lịch sử còn lại và môn tiếp theo.

### G7 — AI, OCR và mở rộng

Chỉ bắt đầu khi có kho đoạn đã kiểm tra và nhu cầu cụ thể. Tạo bộ câu hỏi chuẩn gồm trả lời được/không được/câu dẫn dụ/câu cần hình; đánh giá retrieval và mức nguồn hỗ trợ câu trả lời. Chọn nhà cung cấp sau chốt dữ liệu gửi ra ngoài và hạn mức.

OCR phải có màn hình đối chiếu và không tự công bố. Công thức/đồ thị của môn khác cần hợp đồng dữ liệu và thử công nghệ hỗ trợ riêng. Mỗi phần mở rộng có tiêu chí/ước lượng mới, không gộp thành lời hứa “AI làm được mọi môn”.

## 4. Định nghĩa hoàn thành của mỗi thay đổi

1. Đáp ứng ticket và giữ quy tắc UI/nguồn/ID đã thống nhất.
2. Schema có migrations, constraints, grants/RLS và test liên quan; kiểu dữ liệu đồng bộ.
3. Lint/typecheck/build và các test phù hợp thực sự chạy. Ghi rõ test bỏ qua/chưa làm và lý do.
4. Thay đổi UI đã nhìn trên màn hình rộng/hẹp và thử bàn phím; thay đổi tiếp cận được thử công cụ/người dùng phù hợp.
5. Không có secret, dữ liệu cá nhân hoặc file sách riêng tư trong Git/log/bundle.
6. Có cách phục hồi, thông báo lỗi hữu ích, cập nhật tài liệu khi đổi hành vi.

Tách commit/PR theo thay đổi có thể kiểm tra: schema/quyền; đăng nhập; đọc DB; nháp; duyệt; công bố; upload; worker; tiến độ; quiz; di trú; nghiệm thu. Không dồn tất cả vào một đợt lớn khó rà soát.

## 5. Bảng kiểm nghiệm thu toàn hệ thống

| ID | Kịch bản | Điều kiện đạt | Bằng chứng cần lưu |
|---|---|---|---|
| AC01 | Đăng nhập/chuyển tài khoản | Dữ liệu A không lộ cho B | Test quyền + thao tác trình duyệt |
| AC02 | Đọc SGK pilot | Đúng bài/nguồn/trang, nhãn chính xác | Giáo viên đối chiếu snapshot |
| AC03 | Lưu nháp | Bản hiện hành không đổi, tải lại còn nháp | API/UI test |
| AC04 | Sửa đồng thời | 409 có cách giữ bản đang sửa | Integration test hai client |
| AC05 | Duyệt/công bố | Hash/quyền/transaction đúng | DB test, audit và UI |
| AC06 | Trích dẫn cũ/thu hồi | Đúng revision hoặc thông báo thu hồi | API/renderer/cache test |
| AC07 | Nhập tài liệu | Tệp lỗi không làm mất nháp, không nhân đôi | Fixture/worker restart test |
| AC08 | Quiz | Đáp án kín trước nộp, điểm server đúng | Response inspection + DB test |
| AC09 | Tiến độ hai thiết bị | Đồng bộ đúng user/revision | Kịch bản hai phiên |
| AC10 | Người học mù | Hoàn thành luồng mà không cần nhìn/chuột | Biên bản thử và lỗi đã xử lý |
| AC11 | Khôi phục | DB/tệp/Auth/cấu hình dùng được lại | Manifest, nhật ký diễn tập |
| AC12 | Thử tải/chi phí | Có số đo, hạn mức và dự toán phù hợp pilot | Báo cáo staging |

Đây là bảng kiểm chưa thực hiện, không phải danh sách đã đạt.

## 6. Rủi ro và điểm dừng cụ thể

| Rủi ro | Cách xử lý | Khi chưa xử lý xong |
|---|---|---|
| Thiếu SGK/phạm vi sử dụng | Thu thập nguồn và ghi metadata | Dùng demo, không gắn nhãn nội dung thật |
| Chưa có người duyệt chuyên môn/tiếp cận | Phân công người phù hợp, có bằng chứng | Không công bố như đã kiểm chứng |
| RLS hoặc đường Storage rò quyền | Kiểm trực tiếp từng vai trò, mặc định từ chối | Không đưa người dùng thật vào |
| Parser treo/tệp nén quá lớn | Worker cách ly, quota, timeout | Khóa loại tệp chưa xử lý an toàn |
| Chi phí tải tệp/AI tăng | Giới hạn, đo egress, cảnh báo ngân sách | Tắt AI/import mới nếu cần, giữ đọc |
| Di trú không ánh xạ đủ | Báo cáo và giữ bản gốc | Chưa chuyển account đó sang dữ liệu mới |
| Backup không phục hồi được | Sửa và diễn tập lại | Chưa coi hệ thống sẵn sàng pilot |

## 7. Việc làm đầu tiên khi bắt đầu viết backend

Thực hiện G0 rồi T1.1–T1.3: dựng môi trường local/staging, schema/quyền và đọc Bài 6 từ DB bằng tài khoản thật. Đây là mốc đầu tiên dễ kiểm chứng và là nền cho mọi tính năng sau. Chủ dự án chỉ cần cung cấp đầu vào khi tới đúng bước: tài khoản hạ tầng/ngân sách, tài liệu nguồn, người duyệt và nhóm thử. Không yêu cầu quyết định mọi chi tiết kỹ thuật trước khi có bản chạy thử.
