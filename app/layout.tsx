import type { Metadata } from "next";
import "./globals.css";
import "./study.css";
export const metadata: Metadata = {
  title: "Kho học liệu số",
  description: "Tra cứu học liệu theo môn học, đọc nội dung và luyện tập.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
