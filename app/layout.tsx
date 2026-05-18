import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoMind — YouTube 视频 AI 学习工作区",
  description: "粘贴 YouTube 链接，获取转录、摘要、时间戳要点和对话问答。所有分析基于视频真实内容。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
