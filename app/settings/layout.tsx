import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "账户设置",
  description: "管理 Teach Player 账户、AI 配置和当前订阅状态。",
  path: "/settings",
});

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
