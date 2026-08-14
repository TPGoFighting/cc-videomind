import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "创建账户",
  description: "创建 Teach Player 账户，在不同会话中保存学习记录并进入后续复习。",
  path: "/register",
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
