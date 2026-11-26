import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Học Liệu Số - App Khiếm Thị",
    short_name: "Học Liệu Số",
    description:
      "Ứng dụng học tập ưu tiên giọng nói và âm thanh dành cho học sinh khiếm thị.",
    start_url: "/mobile",
    display: "standalone",
    lang: "vi",
    dir: "ltr",
    background_color: "#ffffff",
    theme_color: "#1e5480",
    orientation: "portrait",
    categories: ["education", "accessibility"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
