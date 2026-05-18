import { VideoUrlInput } from "@/components/video-url-input";

const features = [
  {
    title: "转录先行",
    body: "所有回答严格基于视频字幕，不凭空捏造内容，每条引用都可追溯到具体时间点。",
  },
  {
    title: "智能缓存",
    body: "同一视频的解析结果自动缓存，重复查看不消耗月度配额，随时回看已学内容。",
  },
  {
    title: "接口可替换",
    body: "AI、字幕、支付、存储四层均采用 Provider 接口设计，可灵活接入不同后端服务。",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── 顶部导航 ── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            VideoMind
          </span>
          <a
            href="/settings"
            className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:text-white hover:bg-white/8"
          >
            设置
          </a>
        </div>
      </nav>

      {/* ── 主布局 ── */}
      <main className="mx-auto max-w-6xl px-5 pt-32 pb-24">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* ── 左侧：标题 + 输入 + 特性 ── */}
          <div className="flex flex-col justify-center space-y-10">
            {/* Hero 标题区 */}
            <div className="space-y-5 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0099ff]/25 bg-[#0099ff]/8 px-4 py-1.5 text-[13px] font-medium text-[#0099ff]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0099ff]" />
                YouTube AI 学习工作区
              </div>

              <h1 className="heading-compressed max-w-2xl text-[56px] font-bold leading-[1.08] sm:text-[64px]">
                把任何公开的 YouTube 课程
                <br />
                <span className="text-[#0099ff]">变成你的学习笔记</span>
              </h1>

              <p className="max-w-lg text-[16px] leading-relaxed text-[#a6a6a6]">
                粘贴视频链接，即刻获取元数据、转录文本、摘要、带时间戳的要点和对话问答——所有分析都基于视频真实内容。
              </p>
            </div>

            {/* URL 输入区 */}
            <div className="animate-fade-in-up animate-fade-in-up-delay-1">
              <VideoUrlInput />
              <p className="mt-3 text-[13px] text-white/30">
                支持 youtube.com、youtu.be、shorts、embed 等格式
              </p>
            </div>

            {/* 特性卡片 */}
            <div className="grid gap-3 sm:grid-cols-3 animate-fade-in-up animate-fade-in-up-delay-2">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-[#090909] p-5 shadow-[rgba(0,153,255,0.08)_0px_0px_0px_1px] transition-shadow duration-300 hover:shadow-[rgba(0,153,255,0.18)_0px_0px_0px_1px]"
                >
                  <h3 className="text-[15px] font-semibold">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#a6a6a6]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 右侧：可视化预览区 ── */}
          <div className="hidden lg:flex lg:items-center animate-fade-in-up animate-fade-in-up-delay-3">
            <div className="w-full space-y-4 rounded-2xl border border-white/10 bg-[#090909] p-6 shadow-[rgba(0,153,255,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.3)_0px_16px_48px]">
              {/* 模拟视频播放器 */}
              <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] shadow-[rgba(0,153,255,0.12)_0px_0px_20px]" />

              {/* 视频标题骨架 */}
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded-full bg-white/10" />
                <div className="h-3 w-1/2 rounded-full bg-white/6" />
              </div>

              {/* 分析面板骨架 */}
              <div className="grid grid-cols-2 gap-3">
                {/* 摘要面板 */}
                <div className="space-y-2 rounded-lg border border-white/8 bg-white/3 p-3">
                  <div className="h-2.5 w-2/5 rounded-full bg-[#0099ff]/25" />
                  <div className="h-2 w-full rounded-full bg-white/6" />
                  <div className="h-2 w-4/5 rounded-full bg-white/6" />
                  <div className="h-2 w-3/5 rounded-full bg-white/6" />
                </div>
                {/* 要点面板 */}
                <div className="space-y-2 rounded-lg border border-white/8 bg-white/3 p-3">
                  <div className="h-2.5 w-2/5 rounded-full bg-[#0099ff]/25" />
                  <div className="h-2 w-full rounded-full bg-white/6" />
                  <div className="h-2 w-3/4 rounded-full bg-white/6" />
                  <div className="h-2 w-2/3 rounded-full bg-white/6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── 底部 ── */}
      <footer className="border-t border-white/8 px-5 py-8 text-center text-[13px] text-white/25">
        VideoMind · 基于真实转录的 AI 学习工具
      </footer>
    </div>
  );
}
