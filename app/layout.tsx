import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyundai AI Chat",
  description: "현대자동차 품질안전 AI 어시스턴트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>{children}</body>
    </html>
  );
}
