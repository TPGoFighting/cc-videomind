import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "服务条款",
  description: "Teach Player 测试版的服务范围、账户规则、外部内容与 AI 结果边界。",
  path: "/terms",
  index: true,
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
