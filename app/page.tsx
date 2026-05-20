import { Navbar } from "@/components/navbar";
import { VideoUrlInput } from "@/components/video-url-input";
import {
  ArrowRight,
  FileText,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Youtube,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "精准转录分析",
    body: "所有回答严格基于视频字幕，不凭空捏造内容。每条引用都可追溯到具体时间点，点击即可跳转。",
  },
  {
    icon: Zap,
    title: "智能缓存加速",
    body: "同一视频只解析一次，结果自动缓存 7 天。历史记录永久可查，重复回看不消耗月度配额。",
  },
  {
    icon: Lightbulb,
    title: "要点时刻提取",
    body: "AI 自动标记视频中的关键转折点、反常识观点和核心数据，支持中英双语显示。",
  },
  {
    icon: MessageSquare,
    title: "对话式问答",
    body: "基于视频内容自由提问，AI 引用具体时间戳作答。支持跟随式追问，像和导师对话一样自然。",
  },
  {
    icon: Youtube,
    title: "多格式兼容",
    body: "支持 youtube.com、youtu.be、shorts、embed 等所有 YouTube 链接格式，粘贴即用。",
  },
  {
    icon: Sparkles,
    title: "接口可替换",
    body: "AI 模型、字幕源、支付、存储四层均采用 Provider 接口设计，可灵活接入不同后端服务。",
  },
];

const steps = [
  {
    step: "01",
    title: "粘贴链接",
    desc: "复制任意 YouTube 公开视频链接",
  },
  {
    step: "02",
    title: "AI 解析",
    desc: "自动提取字幕、元数据与核心观点",
  },
  {
    step: "03",
    title: "交互学习",
    desc: "阅读摘要、提问答疑、收藏笔记",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* 全局背景光晕 */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-[#0099ff]/[0.04] blur-[120px]" />
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-[#0099ff]/[0.03] blur-[100px] animate-float-slow" />
        <div className="absolute top-[50%] right-[5%] w-[400px] h-[400px] rounded-full bg-[#0099ff]/[0.02] blur-[80px] animate-float-slow-delayed" />
      </div>

      <Navbar />

      {/* ═══ Hero 区域 ═══ */}
      <section className="relative mx-auto w-full max-w-full px-4 pt-24 pb-8 sm:max-w-[90%] sm:px-5 sm:pt-32 sm:pb-12 lg:max-w-[80%]">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* 左侧：标题 + 输入 */}
          <div className="flex flex-col justify-center space-y-8">
            {/* 徽章 */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0099ff]/20 bg-[#0099ff]/6 px-4 py-1.5 text-[13px] font-medium text-[#0099ff] backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0099ff]/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0099ff]" />
                </span>
                YouTube AI 学习工作区
              </div>
            </div>

            {/* 标题 */}
            <div className="space-y-4 animate-fade-in-up animate-fade-in-up-delay-1">
              <h1 className="heading-compressed max-w-2xl text-[36px] font-bold leading-[1.1] sm:text-[50px] lg:text-[64px] lg:leading-[1.06] tracking-tight">
                把任何公开的 YouTube 课程
                <br />
                <span className="bg-gradient-to-r from-[#0099ff] via-[#33adff] to-[#0099ff] bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-shift">
                  变成你的学习笔记
                </span>
              </h1>

              <p className="max-w-lg text-[16px] leading-relaxed text-[#a6a6a6]">
                粘贴视频链接，即刻获取元数据、转录文本、摘要、带时间戳的要点和对话问答——所有分析都基于视频真实内容。
              </p>
            </div>

            {/* URL 输入 */}
            <div className="animate-fade-in-up animate-fade-in-up-delay-2">
              <VideoUrlInput />
              <p className="mt-3 text-[13px] text-white/25">
                支持 youtube.com / youtu.be / shorts / embed 等格式
              </p>
            </div>

            {/* 操作步骤 */}
            <div className="hidden sm:flex items-center gap-3 animate-fade-in-up animate-fade-in-up-delay-3">
              {steps.map((s, i) => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="flex items-center gap-2.5 rounded-lg border border-white/6 bg-white/[0.02] px-3.5 py-2.5 backdrop-blur-sm transition-colors hover:border-white/12 hover:bg-white/[0.04]">
                    <span className="font-mono text-[11px] font-semibold text-[#0099ff]/50 tabular-nums">
                      {s.step}
                    </span>
                    <span className="text-[13px] font-medium text-white/50">
                      {s.title}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-white/10 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：动态预览卡片 */}
          <div className="hidden lg:flex lg:items-center animate-fade-in-up animate-fade-in-up-delay-3">
            <PreviewCard />
          </div>
        </div>
      </section>

      {/* ═══ 特性网格 ═══ */}
      <section className="relative mx-auto w-full max-w-full px-4 py-16 sm:max-w-[90%] sm:px-5 sm:py-24 lg:max-w-[80%]">
        <div className="mb-10 text-center space-y-3">
          <h2 className="text-[24px] font-bold tracking-tight sm:text-[30px]">
            不只是转录工具
          </h2>
          <p className="text-[15px] text-[#a6a6a6] max-w-xl mx-auto">
            从被动观看到主动学习——每一个功能都围绕&ldquo;真正理解视频内容&rdquo;而设计
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative rounded-2xl border border-white/6 bg-[#0a0a0a] p-6 transition-all duration-500 hover:border-[#0099ff]/20 hover:bg-[#0d0d0d] hover:shadow-[rgba(0,153,255,0.06)_0px_0px_40px]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* 悬停光晕 */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-20 w-3/4 rounded-full bg-[#0099ff]/[0.06] blur-[30px]" />
                </div>

                <div className="relative">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] transition-colors duration-300 group-hover:border-[#0099ff]/25 group-hover:bg-[#0099ff]/8">
                    <Icon className="h-5 w-5 text-[#0099ff]/70 transition-colors duration-300 group-hover:text-[#0099ff]" />
                  </div>

                  <h3 className="text-[15px] font-semibold tracking-tight transition-colors duration-300 group-hover:text-white/95">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#a6a6a6] transition-colors duration-300 group-hover:text-white/55">
                    {item.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ 底部 ═══ */}
      <footer className="relative border-t border-white/6 px-5 py-8 text-center">
        <p className="text-[13px] text-white/20">
          Teach Player · 基于真实转录的 AI 学习工具
        </p>
      </footer>
    </div>
  );
}

/** 右侧预览卡片 —— 动态骨架屏 + 呼吸动画 */
function PreviewCard() {
  return (
    <div className="relative w-full rounded-2xl border border-white/8 bg-[#0a0a0a] p-6 shadow-[rgba(0,153,255,0.06)_0px_0px_0px_1px,rgba(0,0,0,0.3)_0px_16px_48px]">
      {/* 模拟视频播放器 */}
      <div className="relative aspect-video w-full rounded-xl bg-gradient-to-br from-[#0f1923] via-[#0d1b2a] to-[#1b2838] overflow-hidden shadow-[rgba(0,153,255,0.1)_0px_0px_30px_inset]">
        {/* 播放按钮 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/10 transition-transform duration-300 hover:scale-110">
            <div className="ml-1 h-0 w-0 border-l-[14px] border-t-[9px] border-b-[9px] border-l-white/80 border-t-transparent border-b-transparent" />
          </div>
        </div>
        {/* 进度条 */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div className="h-full w-1/3 rounded-r-full bg-[#0099ff]/60" />
        </div>
      </div>

      {/* 视频标题骨架 */}
      <div className="mt-4 space-y-2">
        <div className="h-4 w-3/4 rounded-full bg-white/8 animate-shimmer-1" />
        <div className="h-3 w-1/2 rounded-full bg-white/5" />
      </div>

      {/* 分析面板骨架 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* 摘要 */}
        <div className="space-y-2 rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
          <div className="h-2.5 w-2/5 rounded-full bg-[#0099ff]/20 animate-breathe" />
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-white/5" />
            <div className="h-2 w-5/6 rounded-full bg-white/5" />
            <div className="h-2 w-4/6 rounded-full bg-white/5" />
          </div>
        </div>
        {/* 要点 */}
        <div className="space-y-2 rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
          <div className="h-2.5 w-2/5 rounded-full bg-[#0099ff]/20 animate-breathe" />
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-white/5" />
            <div className="h-2 w-4/5 rounded-full bg-white/5" />
            <div className="h-2 w-3/5 rounded-full bg-white/5" />
          </div>
        </div>
      </div>

      {/* 转录行 */}
      <div className="mt-3 space-y-1.5">
        {[4, 3, 4, 2].map((w, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-2.5 w-8 shrink-0 rounded-full bg-[#0099ff]/15" />
            <div
              className="h-2 rounded-full bg-white/5"
              style={{ width: `${w * 12 + 15}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
