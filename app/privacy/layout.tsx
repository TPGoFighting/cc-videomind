import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "隐私政策",
  description: "Teach Player 如何处理账户、学习内容、外部视频与 AI 服务数据。",
  path: "/privacy",
  index: true,
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
