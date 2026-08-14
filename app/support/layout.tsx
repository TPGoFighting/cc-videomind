import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "支持与退款说明",
  description: "Teach Player 的产品反馈、账户数据权利、付款审核与退款支持边界。",
  path: "/support",
  index: true,
});

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
