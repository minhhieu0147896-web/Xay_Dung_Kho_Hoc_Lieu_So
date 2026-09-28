export type Section = { id: string; heading: string; body: string };
export type Question = {
  id: string;
  prompt: string;
  options: string[];
  correctOptionId: number;
  explanation: string;
  sourceSectionId: string;
};
export type Lesson = {
  subject: string;
  grade: number;
  id: string;
  title: string;
  summary: string;
  period: string;
  chapter: string;
  minutes: number;
  status: "draft" | "published";
  source: string;
  sections: Section[];
  questions: Question[];
};
export type Progress = {
  completedSectionIds: string[];
  quizScore?: number;
  lastSectionId?: string;
  updatedAt: string;
};
export type Answer = {
  text: string;
  citations: { lessonId: string; sectionId: string; excerpt: string }[];
  mode: "retrieval";
  status: "ok" | "insufficient_evidence";
};
const source =
  "Văn bản diễn giải do demo biên soạn, không phải nguyên văn sách giáo khoa. Chưa được giáo viên kiểm duyệt; chỉ dùng thử chức năng, không dùng làm tài liệu ôn thi chính thức.";
export const initialLessons: Lesson[] = [
  {
    id: "cach-mang-thang-tam",
    subject: "Lịch sử",
    grade: 12,
    title: "Cách mạng tháng Tám năm 1945",
    summary:
      "Tìm hiểu bối cảnh, diễn biến và ý nghĩa của bước ngoặt mở ra một thời kỳ mới trong lịch sử Việt Nam.",
    period: "1945",
    chapter: "Việt Nam từ năm 1919 đến năm 1945",
    minutes: 12,
    status: "published",
    source,
    sections: [
      {
        id: "thang-tam-boi-canh",
        heading: "Bối cảnh lịch sử và thời cơ",
        body: "Tháng 8 năm 1945, Nhật Bản đầu hàng Đồng minh. Chính quyền thân Nhật ở Đông Dương lâm vào khủng hoảng. Trong nước, lực lượng cách mạng đã được chuẩn bị qua quá trình đấu tranh. Sự kết hợp giữa điều kiện quốc tế và sự chuẩn bị trong nước tạo thời cơ để nhân dân Việt Nam tiến hành tổng khởi nghĩa giành chính quyền.",
      },
      {
        id: "thang-tam-dien-bien",
        heading: "Những mốc chính của tổng khởi nghĩa",
        body: "Trong tháng 8 năm 1945, phong trào giành chính quyền diễn ra ở nhiều địa phương. Hà Nội giành chính quyền ngày 19 tháng 8, Huế ngày 23 tháng 8 và Sài Gòn ngày 25 tháng 8. Ngày 2 tháng 9 năm 1945, tại Quảng trường Ba Đình ở Hà Nội, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập, tuyên bố thành lập nước Việt Nam Dân chủ Cộng hòa.",
      },
      {
        id: "thang-tam-y-nghia",
        heading: "Ý nghĩa lịch sử",
        body: "Cách mạng tháng Tám năm 1945 lật đổ chế độ quân chủ và chính quyền thống trị thực dân, phát xít ở Việt Nam, đưa nhân dân trở thành người làm chủ đất nước. Sự ra đời của nước Việt Nam Dân chủ Cộng hòa mở ra thời kỳ độc lập dân tộc. Thắng lợi thể hiện vai trò của sự chuẩn bị lực lượng, đoàn kết toàn dân và việc nắm bắt thời cơ.",
      },
    ],
    questions: [
      {
        id: "a1",
        prompt:
          "Sự kiện quốc tế nào tạo thời cơ cho tổng khởi nghĩa tháng 8 năm 1945?",
        options: [
          "Nhật Bản đầu hàng Đồng minh",
          "Liên minh châu Âu thành lập",
          "Chiến tranh lạnh kết thúc",
        ],
        correctOptionId: 0,
        explanation:
          "Nhật Bản đầu hàng Đồng minh khiến chính quyền thân Nhật ở Đông Dương khủng hoảng.",
        sourceSectionId: "thang-tam-boi-canh",
      },
      {
        id: "a2",
        prompt: "Hà Nội giành chính quyền vào ngày nào?",
        options: [
          "2 tháng 9 năm 1945",
          "19 tháng 8 năm 1945",
          "25 tháng 8 năm 1945",
        ],
        correctOptionId: 1,
        explanation:
          "Hà Nội giành chính quyền ngày 19 tháng 8; Huế ngày 23 tháng 8 và Sài Gòn ngày 25 tháng 8.",
        sourceSectionId: "thang-tam-dien-bien",
      },
      {
        id: "a3",
        prompt: "Ý nghĩa nào gắn với Cách mạng tháng Tám?",
        options: [
          "Thành lập ASEAN",
          "Kết thúc Chiến tranh lạnh",
          "Đưa nhân dân trở thành người làm chủ đất nước",
        ],
        correctOptionId: 2,
        explanation:
          "Thắng lợi đưa nhân dân trở thành người làm chủ đất nước, mở ra thời kỳ độc lập dân tộc.",
        sourceSectionId: "thang-tam-y-nghia",
      },
    ],
  },
  {
    id: "doi-moi",
    subject: "Lịch sử",
    grade: 12,
    title: "Việt Nam trên đường Đổi mới",
    summary:
      "Khám phá hoàn cảnh ra đời, nội dung cơ bản và ý nghĩa của công cuộc Đổi mới từ năm 1986.",
    period: "1986",
    chapter: "Việt Nam từ năm 1975 đến nay",
    minutes: 10,
    status: "published",
    source,
    sections: [
      {
        id: "doi-moi-boi-canh",
        heading: "Hoàn cảnh ra đời",
        body: "Trước năm 1986, Việt Nam gặp nhiều khó khăn về kinh tế và đời sống. Cơ chế quản lý tập trung, quan liêu, bao cấp bộc lộ hạn chế. Tình hình trong nước và những thay đổi trên thế giới đặt ra yêu cầu đổi mới. Đại hội đại biểu toàn quốc lần thứ VI của Đảng Cộng sản Việt Nam, tháng 12 năm 1986, đề ra đường lối Đổi mới.",
      },
      {
        id: "doi-moi-noi-dung",
        heading: "Nội dung cơ bản của Đổi mới",
        body: "Đổi mới được tiến hành toàn diện, trong đó đổi mới kinh tế là trọng tâm. Việt Nam từng bước chuyển từ cơ chế quản lý tập trung, quan liêu, bao cấp sang phát triển nền kinh tế hàng hóa nhiều thành phần vận hành theo cơ chế thị trường có sự quản lý của Nhà nước. Quá trình đổi mới đồng thời gắn với mở rộng quan hệ đối ngoại và hội nhập quốc tế.",
      },
      {
        id: "doi-moi-y-nghia",
        heading: "Thành tựu và những vấn đề đặt ra",
        body: "Công cuộc Đổi mới góp phần phát triển sản xuất, cải thiện đời sống nhân dân và mở rộng quan hệ quốc tế của Việt Nam. Quá trình phát triển cũng đặt ra những vấn đề như chênh lệch thu nhập, bảo vệ môi trường và nâng cao chất lượng tăng trưởng. Khi đánh giá Đổi mới, cần xem xét cả thành tựu và những hạn chế trong từng giai đoạn cụ thể.",
      },
    ],
    questions: [
      {
        id: "b1",
        prompt: "Đại hội nào đề ra đường lối Đổi mới?",
        options: ["Đại hội IV", "Đại hội VI", "Đại hội VIII"],
        correctOptionId: 1,
        explanation: "Đại hội VI, tháng 12 năm 1986, đề ra đường lối Đổi mới.",
        sourceSectionId: "doi-moi-boi-canh",
      },
      {
        id: "b2",
        prompt: "Lĩnh vực nào là trọng tâm của Đổi mới?",
        options: ["Kinh tế", "Thể thao", "Du lịch"],
        correctOptionId: 0,
        explanation:
          "Đổi mới được tiến hành toàn diện, trong đó đổi mới kinh tế là trọng tâm.",
        sourceSectionId: "doi-moi-noi-dung",
      },
      {
        id: "b3",
        prompt: "Cách đánh giá nào phù hợp với công cuộc Đổi mới?",
        options: [
          "Chỉ nhìn vào thành tựu",
          "Bỏ qua bối cảnh từng giai đoạn",
          "Xem xét cả thành tựu và hạn chế",
        ],
        correctOptionId: 2,
        explanation:
          "Cần đánh giá cả thành tựu và hạn chế trong từng giai đoạn cụ thể.",
        sourceSectionId: "doi-moi-y-nghia",
      },
    ],
  },
];
