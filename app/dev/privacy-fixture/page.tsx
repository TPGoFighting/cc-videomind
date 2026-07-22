import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AdminMetricsPanel } from "@/components/settings/admin-metrics-panel";
import { PrivacyControlsCard } from "@/components/settings/privacy-controls-card";

export default function PrivacyFixturePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-text)]">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-24 pt-20 sm:px-6 md:pb-16 md:pt-24">
        <header className="border-b border-[var(--tp-border)] pb-6">
          <p className="text-sm font-semibold text-[var(--tp-accent)]">开发环境专用</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">隐私与账户权利验收</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--tp-text-muted)]">固定零数据用于检查同意、导出、删除撤销期和管理聚合，不连接生产账户或数据库。</p>
        </header>
        <PrivacyControlsCard fixture />
        <AdminMetricsPanel fixture />
      </main>
    </div>
  );
}
