import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

export function AuthShell({
  eyebrow,
  title,
  description,
  benefits,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  benefits: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--tp-bg)] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 text-[var(--tp-text)] md:px-8 md:pb-12 md:pt-8">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold text-[var(--tp-text-secondary)] transition-colors hover:text-[var(--tp-text)]">
          <Image src="/logo.png" alt="" width={28} height={28} className="rounded-md" />
          Teach Player
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm text-[var(--tp-text-muted)] transition-colors hover:text-[var(--tp-text)]">
          返回首页
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 py-12 md:min-h-[calc(100vh-8rem)] md:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.75fr)] md:py-16 lg:gap-20">
        <section className="max-w-2xl">
          <p className="text-sm font-semibold text-[var(--tp-accent)]">{eyebrow}</p>
          <h1 className="mt-4 max-w-[12ch] text-[clamp(2.75rem,6vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-balance">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--tp-text-muted)] md:text-lg">
            {description}
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-[var(--tp-text-secondary)] sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex min-h-11 items-start gap-2.5 border-t border-[var(--tp-border)] pt-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tp-accent)]" aria-hidden />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[1.25rem] border border-[var(--tp-border)] bg-[rgba(12,19,28,0.92)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:p-8">
          {children}
        </section>
      </main>
    </div>
  );
}
