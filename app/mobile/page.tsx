import type { Metadata } from "next";
import "../mobile.css";
import MobileBlindApp from "../components/mobile-blind-app";

export const metadata: Metadata = {
  title: "Học Liệu Số - App Khiếm Thị",
  description:
    "Ứng dụng học tập di động điều khiển bằng giọng nói và âm thanh dành cho học sinh khiếm thị.",
};

export default function MobilePage() {
  return <MobileBlindApp />;
}
