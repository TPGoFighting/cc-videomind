import { Navbar } from "@/components/navbar";
import { AnimatedBackground } from "@/components/animated-background";
import { GlbDecoration } from "@/components/glb-decoration";
import { GLB_MODELS } from "@/lib/glb-models";
import { HeroSection } from "@/components/home/hero-section";
import { WhySection } from "@/components/home/why-section";
import { BentoFeatures } from "@/components/home/bento-features";
import { MarqueeStrip } from "@/components/home/marquee-strip";
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

        {/* 1. Hero — SplitText 逐字揭示 + 鼠标视差 + 3D Parrot */}
        <div data-section="hero"><HeroSection /></div>

        {/* 2. 跑马灯 — 功能关键词无限滚动 */}
        <MarqueeStrip />

        {/* 3. 为什么做这个 — 项目起源故事 + 3D Stork */}
        <div data-section="why"><WhySection /></div>

        {/* 4. 核心功能 — Bento 不规则网格 + Box 3D 装饰 */}
        <div data-section="features" className="relative">
          {/* Box 盒子 — 右上角，象征知识模块 */}
          <div className="absolute right-[5%] top-[12%] w-[180px] h-[180px] hidden md:block z-10 opacity-40 pointer-events-none">
            <GlbDecoration model={GLB_MODELS.box} targetSize={2.2} rotateSpeed={0.004} floatAmount={0.1} mouseFollow={0.2} />
          </div>
          <BentoFeatures />
        </div>

        {/* 5. 数据说话 — 大数字渐变 + 3D Flamingo 右侧装饰 */}
        <div data-section="stats">
          <StatsSectionWithFlamingo />
        </div>

        {/* 6. 路线图 — 贝塞尔曲线时间线 + 3D SittingBox 左侧装饰 */}
        <div data-section="roadmap">
          <RoadmapSectionWithSittingBox />
        </div>

        {/* 右侧滚动导航点 */}
        <ScrollNav />

        {/* 7. 示例视频推荐 */}
        <ExampleVideos />

        {/* 8. 底部 CTA + 3D Horse */}
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

/** Stats 区域 + Flamingo 右侧 + Target 左侧装饰 */
function StatsSectionWithFlamingo() {
  return (
    <section className="relative">
      {/* Target 靶子 — 左侧，象征目标达成 */}
      <div className="absolute left-[4%] top-1/2 -translate-y-1/2 w-[220px] h-[220px] hidden md:block z-10 opacity-45 pointer-events-none">
        <GlbDecoration
          model={GLB_MODELS.target}
          targetSize={2.0}
          rotateSpeed={0.004}
          floatAmount={0.1}
          mouseFollow={0.25}
        />
      </div>
      <StatsSection />
      {/* 光晕背景 */}
      <div className="absolute right-[5%] top-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#0099ff]/[0.04] blur-[100px] pointer-events-none hidden lg:block" />
      {/* 3D Flamingo — 右侧中层装饰 */}
      <div className="absolute right-[3%] top-1/2 -translate-y-1/2 w-[300px] h-[300px] hidden lg:block z-10 opacity-55 pointer-events-none">
        <GlbDecoration
          model="/three_glb/Flamingo.glb"
          targetSize={1.8}
          rotateSpeed={0.003}
          floatAmount={0.12}
          mouseFollow={0.25}
        />
      </div>
    </section>
  );
}

/** Roadmap 区域 + Door 左侧 + SittingBox 右下装饰 */
function RoadmapSectionWithSittingBox() {
  return (
    <section className="relative">
      {/* Door 门 — 左上角，象征通向未来的门户 */}
      <div className="absolute left-[4%] top-[12%] w-[240px] h-[300px] hidden md:block z-10 opacity-40 pointer-events-none">
        <GlbDecoration
          model={GLB_MODELS.door}
          targetSize={3.5}
          rotateSpeed={0.002}
          floatAmount={0.06}
          mouseFollow={0.2}
        />
      </div>
      <RoadmapSection />
      {/* 光晕背景 */}
      <div className="absolute right-[8%] bottom-[12%] w-[300px] h-[300px] rounded-full bg-[#a855f7]/[0.04] blur-[100px] pointer-events-none hidden lg:block" />
      {/* 3D SittingBox — 右下角装饰，与时间线曲线终点呼应 */}
      <div className="absolute right-[6%] bottom-[8%] w-[220px] h-[220px] hidden lg:block z-10 opacity-45 pointer-events-none">
        <GlbDecoration
          model="/three_glb/SittingBox.glb"
          targetSize={1.6}
          rotateSpeed={0.005}
          floatAmount={0.08}
          mouseFollow={0.3}
        />
      </div>
    </section>
  );
}

function BottomCta() {
  return (
    <section className="relative mx-auto w-full max-w-full px-4 py-28 sm:max-w-[90%] sm:px-5 sm:py-40 md:max-w-[85%] lg:max-w-[80%]">
      {/* 背景分割线 */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#0099ff]/20 to-transparent" />

      {/* mysteryModel — 左下角背景装饰 */}
      <div className="absolute left-[2%] bottom-[15%] w-[300px] h-[300px] hidden md:block z-10 opacity-30 pointer-events-none">
        <GlbDecoration
          model={GLB_MODELS.mysteryModel}
          targetSize={3.0}
          rotateSpeed={0.002}
          floatAmount={0.06}
          mouseFollow={0.15}
        />
      </div>

      {/* 3D Horse 模型 — 放在卡片上方独立区域 */}
      <div className="flex justify-center mb-[-60px] relative z-10 hidden lg:flex">
        {/* 光晕背景 */}
        <div className="absolute inset-0 w-[400px] h-[400px] rounded-full bg-[#0099ff]/[0.04] blur-[120px] pointer-events-none -top-10" />
        <div className="w-[320px] h-[320px] relative">
          <GlbDecoration
            model="/three_glb/Horse.glb"
            targetSize={5.5}
            rotateSpeed={0.003}
            floatAmount={0.08}
            mouseFollow={0.2}
            initialRotationY={Math.PI / 2}
          />
        </div>
      </div>

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
