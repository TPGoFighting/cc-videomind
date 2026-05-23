import { Navbar } from "@/components/navbar";
import { AnimatedBackground } from "@/components/animated-background";
import { HeroSection } from "@/components/home/hero-section";
import { WhySection } from "@/components/home/why-section";
import { Capabilities } from "@/components/home/capabilities";
import { PricingSection } from "@/components/home/pricing-section";
import { RoadmapSection } from "@/components/home/roadmap-section";
import { StatsSection } from "@/components/stats-section";
import { ExampleVideos } from "@/components/example-videos";
import { VideoUrlInput } from "@/components/video-url-input";
import { MobileHome } from "@/components/mobile-home";
import { YouTubeStatusAlert } from "@/components/youtube-status-alert";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <Navbar />

      {/* 桌面端 */}
      <div className="hidden md:block">
        <AnimatedBackground />

        {/* YouTube 连通性告警 */}
        <div className="mx-auto w-full max-w-full px-4 pt-16 sm:max-w-[90%] sm:px-5 md:max-w-[85%] lg:max-w-[80%]">
          <YouTubeStatusAlert />
        </div>

        <HeroSection />
        <WhySection />
        <Capabilities />
        <StatsSection />
        <PricingSection />
        <RoadmapSection />
        <ExampleVideos />
        <BottomCta />

        <footer className="relative mx-auto w-full max-w-full px-4 py-12 sm:max-w-[90%] sm:px-5 md:max-w-[85%] lg:max-w-[80%]">
          <div className="border-t border-[var(--border)] pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-[12px] text-[var(--text-tertiary)]">
              Teach Player · 基于真实转录的 AI 学习工具
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]/50">
              让每一次观看都变成真正的学习
            </p>
          </div>
        </footer>
      </div>

      {/* 移动端 */}
      <div className="md:hidden">
        <MobileHome />
      </div>
    </div>
  );
}

function BottomCta() {
  return (
    <section className="relative mx-auto w-full max-w-full px-4 py-32 sm:max-w-[90%] sm:px-5 sm:py-44 md:max-w-[85%] lg:max-w-[80%]">
      <div className="absolute left-0 top-0 w-[60px] h-px bg-[var(--text-tertiary)]/30" />

      <h2 className="mb-8 text-[clamp(32px,5vw,56px)] font-[900] tracking-[-0.03em] leading-[1.08]">
        准备好
        <br />
        <span className="text-[var(--accent)]">提升学习效率</span>
        了吗？
      </h2>
      <p className="mb-10 max-w-md text-[15px] text-[var(--text-secondary)] leading-relaxed">
        粘贴任意 YouTube 链接，秒级获取深度分析。从今天开始，把观看变成真正的学习。
      </p>
      <div className="max-w-lg">
        <VideoUrlInput />
      </div>
      <p className="mt-4 text-[12px] text-[var(--text-tertiary)]">
        支持 youtube.com / youtu.be / shorts / embed 等格式
      </p>
    </section>
  );
}
