import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-text)]">
      <Navbar />
      <main className="mx-auto w-[min(52rem,calc(100%-2rem))] pb-28 pt-24 sm:pt-28 md:pb-16">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--tp-text-muted)] transition-colors hover:text-[var(--tp-text)]">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          返回首页
        </Link>

        <header className="mt-8 border-b border-[var(--tp-border)] pb-8">
          <p className="text-sm font-semibold text-[var(--tp-accent)]">公开支持边界</p>
          <h1 className="mt-3 max-w-3xl text-[clamp(2.75rem,7vw,5rem)] font-semibold leading-[0.98] tracking-[-0.055em]">支持与退款说明</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--tp-text-muted)]">产品问题有公开、可追踪的渠道；账户数据操作留在登录后的站内流程，不要求你在公开页面披露隐私。</p>
        </header>

        <div className="divide-y divide-[var(--tp-border)]">
          <section className="py-8" aria-labelledby="support-product">
            <h2 id="support-product" className="text-xl font-semibold">产品问题与功能反馈</h2>
            <p className="mt-4 text-base leading-8 text-[var(--tp-text-secondary)]">可以通过项目的 GitHub Issues 提交可复现的产品问题。请提供页面、操作步骤和非敏感错误码，不要公开密码、Cookie、API Key、付款凭证、邮箱或学习正文。</p>
            <a
              href="https://github.com/TPGoFighting/cc-videomind/issues"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] bg-[var(--tp-accent)] px-5 text-sm font-semibold text-[#08101a] transition-colors hover:bg-[var(--tp-accent-hover)]"
            >
              打开问题追踪页
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </section>

          <section className="py-8" aria-labelledby="support-account">
            <h2 id="support-account" className="text-xl font-semibold">账户与数据权利</h2>
            <p className="mt-4 text-base leading-8 text-[var(--tp-text-secondary)]">登录后可在设置页关闭非必要分析、导出数据、提交账户删除请求，并在 7 天撤销期内取消。这样可以验证账户归属，也避免在公开 Issue 中发送个人信息。</p>
            <Link href="/settings" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--tp-accent)]">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              前往隐私与账户设置
            </Link>
          </section>

          <section className="py-8" aria-labelledby="support-payment">
            <h2 id="support-payment" className="text-xl font-semibold">付款审核与退款</h2>
            <div className="mt-4 space-y-4 text-base leading-8 text-[var(--tp-text-secondary)]">
              <p>当前公开版本没有自动扣款入口。只有站内明确展示价格、权益、审核状态和私密支持方式的付款记录才构成有效交易。</p>
              <p>若付款入口未来开放，退款范围、处理时限和私密联系渠道会随订单展示；不要在 GitHub Issues 上传交易号或付款截图。未出现这些信息时，请不要付款。</p>
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap gap-4 border-t border-[var(--tp-border)] pt-8 text-sm">
          <Link href="/privacy" className="inline-flex min-h-11 items-center text-[var(--tp-accent)]">隐私政策</Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center text-[var(--tp-accent)]">服务条款</Link>
          <Link href="/" className="inline-flex min-h-11 items-center text-[var(--tp-text-muted)]">返回首页</Link>
        </footer>
      </main>
    </div>
  );
}
