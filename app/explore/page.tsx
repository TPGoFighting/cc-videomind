import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ExploreCatalog } from "@/components/explore/explore-catalog";

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-[var(--tp-bg)] pb-24 text-[var(--tp-text)] md:pb-16">
      <Navbar />

      <main className="mx-auto w-[min(90rem,calc(100%-2rem))] pt-24 sm:pt-32">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--tp-text-muted)] transition-colors hover:text-[var(--tp-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          返回首页
        </Link>

        <section className="mt-8 grid gap-8 border-b border-[var(--tp-border)] pb-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-[var(--tp-accent)]">经过人工核对的起点</p>
            <h1 className="mt-4 max-w-[13ch] text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
              选一条值得学完的视频
            </h1>
          </div>
          <div className="max-w-xl lg:justify-self-end">
            <p className="text-base leading-7 text-[var(--tp-text-muted)]">
              首发目录宁可少，也只保留能说明语言、难度、字幕和学习收益的知识视频。内容不会在客户端临时抓取后突然跳动。
            </p>
            <Link href="/#product" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--tp-accent)] hover:text-[var(--tp-accent-hover)]">
              粘贴自己的 YouTube 视频
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>

        <ExploreCatalog />

        <section className="mt-16 rounded-[1.25rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] px-5 py-8 sm:px-8 sm:py-10">
          <p className="text-sm font-semibold text-[var(--tp-accent)]">目录标准</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">公开推荐必须回答“为什么值得学”</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--tp-text-muted)]">
            每条内容都需要明确的知识主题、可用字幕和学习结果。预告片、音乐、随机热点与无法说明收益的视频不会出现在首发推荐中。
          </p>
        </section>
      </main>
    </div>
  );
}
