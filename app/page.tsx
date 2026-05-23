import { Navbar } from "@/components/navbar";
import { AnimatedBackground } from "@/components/animated-background";
import { HeroSection } from "@/components/home/hero-section";
import { WhySection } from "@/components/home/why-section";
import { BentoFeatures } from "@/components/home/bento-features";
import { MarqueeStrip } from "@/components/home/marquee-strip";
import { PricingSection } from "@/components/home/pricing-section";
import { RoadmapSection } from "@/components/home/roadmap-section";
import { ScrollNav } from "@/components/home/scroll-nav";
import { StatsSection } from "@/components/stats-section";
import { ExampleVideos } from "@/components/example-videos";
import { VideoUrlInput } from "@/components/video-url-input";
import { MobileHome } from "@/components/mobile-home";
import { YouTubeStatusAlert } from "@/components/youtube-status-alert";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <Navbar />

      {/* 桌面端 — 完整丰富布局 */}
      <div className="hidden md:block">
        <AnimatedBackground variant="desktop" />

        {/* YouTube 连通性告警 */}
        <div className="mx-auto w-full max-w-full px-4 pt-16 sm:max-w-[90%] sm:px-5 md:max-w-[85%] lg:max-w-[80%]">
          <YouTubeStatusAlert />
        </div>

        {/* 1. Hero — SplitText 逐字揭示 + 鼠标视差 */}
        <div data-section="hero"><HeroSection /></div>

        {/* 2. 跑马灯 — 功能关键词无限滚动 */}
        <MarqueeStrip />

        {/* 3. 为什么做这个 — 项目起源故事 */}
        <div data-section="why"><WhySection /></div>

        {/* 4. 核心功能 — Bento 不规则网格 */}
        <div data-section="features"><BentoFeatures /></div>

        {/* 5. 数据说话 — 大数字渐变 */}
        <div data-section="stats"><StatsSection /></div>

        {/* 6. 订阅方案 — 3D 倾斜定价卡 */}
        <div data-section="pricing"><PricingSection /></div>

        {/* 7. 路线图 — 贝塞尔曲线时间线 */}
        <div data-section="roadmap"><RoadmapSection /></div>

        {/* 右侧滚动导航点 */}
        <ScrollNav />

        {/* 7. 示例视频推荐 */}
        <ExampleVideos />

        {/* 8. 底部 CTA */}
        <BottomCta />

        <footer className="relative border-t border-white/6 px-5 py-8 text-center">
          <p className="text-[13px] text-white/20">
            Teach Player · 基于真实转录的 AI 学习工具 · 让每一次观看都变成真正的学习
          </p>
        </footer>
      </div>

      {/* 移动端 — 精简布局 */}
      <div className="md:hidden">
        <MobileHome />
      </div>
    </div>
  );
}

function BottomCta() {
  return (
    <section className="relative mx-auto w-full max-w-full px-4 py-28 sm:max-w-[90%] sm:px-5 sm:py-40 md:max-w-[85%] lg:max-w-[80%]">
      {/* 背景分割线 */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#0099ff]/20 to-transparent" />

      <div className="relative overflow-hidden rounded-3xl border border-white/6 bg-[#050510] px-6 py-16 sm:px-16 sm:py-24">
        {/* 多层背景光晕 */}
        <div className="pointer-events-none absolute -top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#0099ff]/[0.03] blur-[120px]" />
        <div className="pointer-events-none absolute top-1/4 -right-1/4 w-[400px] h-[400px] rounded-full bg-[#a855f7]/[0.03] blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full bg-[#0099ff]/[0.02] blur-[80px]" />

        {/* 装饰性线框 */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none">
          <svg viewBox="0 0 800 400" className="w-full h-full">
            <circle cx="400" cy="200" r="180" fill="none" stroke="#0099ff" strokeWidth="0.5" />
            <circle cx="400" cy="200" r="140" fill="none" stroke="#a855f7" strokeWidth="0.3" strokeDasharray="8 6" />
            <ellipse cx="400" cy="200" rx="200" ry="100" fill="none" stroke="#0099ff" strokeWidth="0.3" transform="rotate(-15 400 200)" />
          </svg>
        </div>

        <div className="relative text-center space-y-8">
          <h2 className="text-[32px] sm:text-[48px] lg:text-[56px] font-extrabold tracking-[-0.02em] leading-[1.08]">
            准备好
            <span className="text-gradient"> 提升学习效率</span>
            了吗？
          </h2>
          <p className="text-[16px] sm:text-[17px] text-[#a6a6a6] max-w-lg mx-auto leading-relaxed">
            粘贴任意 YouTube 链接，秒级获取深度分析。从今天开始，把观看变成真正的学习。
          </p>
          <div className="max-w-md mx-auto">
            <VideoUrlInput />
          </div>
          <p className="text-[13px] text-white/20">
            支持 youtube.com / youtu.be / shorts / embed 等格式
          </p>
        </div>
      </div>
    </section>
  );
}
