import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";

type LegalSection = {
  title: string;
  paragraphs: readonly string[];
  items?: readonly string[];
};

export function LegalPage({
  eyebrow,
  title,
  summary,
  updatedAt,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  updatedAt: string;
  sections: readonly LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-text)]">
      <Navbar />
      <main className="mx-auto w-[min(52rem,calc(100%-2rem))] pb-28 pt-24 sm:pt-28 md:pb-16">
        <Link href="/register" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--tp-text-muted)] transition-colors hover:text-[var(--tp-text)]">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          返回注册
        </Link>
        <header className="mt-8 border-b border-[var(--tp-border)] pb-8">
          <p className="text-sm font-semibold text-[var(--tp-accent)]">{eyebrow}</p>
          <h1 className="mt-3 text-[clamp(2.75rem,7vw,5rem)] font-semibold leading-[0.98] tracking-[-0.055em]">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--tp-text-muted)]">{summary}</p>
          <p className="mt-4 text-sm text-[var(--tp-text-faint)]">更新日期：{updatedAt}</p>
        </header>

        <div className="divide-y divide-[var(--tp-border)]">
          {sections.map((section, index) => (
            <section key={section.title} className="py-8" aria-labelledby={`legal-section-${index}`}>
              <h2 id={`legal-section-${index}`} className="text-xl font-semibold tracking-[-0.02em]">{section.title}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-[var(--tp-text-secondary)]">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items ? (
                  <ul className="space-y-3 pl-5">
                    {section.items.map((item) => <li key={item} className="list-disc pl-1 marker:text-[var(--tp-accent)]">{item}</li>)}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <footer className="flex flex-wrap gap-4 border-t border-[var(--tp-border)] pt-8 text-sm">
          <Link href="/terms" className="inline-flex min-h-11 items-center text-[var(--tp-accent)]">服务条款</Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center text-[var(--tp-accent)]">隐私政策</Link>
          <Link href="/" className="inline-flex min-h-11 items-center text-[var(--tp-text-muted)]">返回首页</Link>
        </footer>
      </main>
    </div>
  );
}
