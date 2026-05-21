"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, ExternalLink, Loader2, LogIn, LogOut, Save, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const AI_PROVIDER_OPTIONS = [
  { value: "deepseek", label: "DeepSeek" },
  { value: "openai-compatible", label: "OpenAI Compatible" },
  { value: "gemini", label: "Gemini" },
] as const;

type AiConfigData = Record<string, string | null>;

export default function SettingsPage() {
  const { user, loading: authLoading, isAdmin, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [config, setConfig] = useState<AiConfigData>({});
  const [edited, setEdited] = useState<AiConfigData>({});
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string | null>(null);

  // 加载 AI 配置
  useEffect(() => {
    if (!user) return;
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data: { admin: boolean; config: AiConfigData }) => {
        setConfig(data.config);
        setEdited(data.config);
      })
      .catch(console.error)
      .finally(() => setLoadingConfig(false));
  }, [user]);

  // 保存后刷新 profile（确保 isAdmin 状态同步）
  useEffect(() => {
    if (!authLoading && user) {
      refreshProfile();
    }
  }, [authLoading, user, refreshProfile]);

  async function saveKey(key: string, value: string) {
    setSaving((prev) => ({ ...prev, [key]: true }));
    setStatus(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setStatus(payload.error ?? "保存失败");
        return;
      }
      setConfig((prev) => ({ ...prev, [key]: value }));
    } catch {
      setStatus("网络错误，请稍后重试。");
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  // ── 未登录状态 ──
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center px-4 pt-14 pb-20 md:pb-16">
          <div className="text-center space-y-4">
            <p className="text-[15px] text-white/50">请登录后访问设置页面</p>
            <Button onClick={() => router.push("/login")}>
              <LogIn className="h-4 w-4" />
              前往登录
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-full px-3 pt-16 pb-20 space-y-8 sm:max-w-[90%] sm:px-5 sm:pt-20 md:max-w-[85%] lg:max-w-[80%] md:pb-16">
        {/* 返回 */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回首页
        </Link>

        {/* 账户信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white text-base">账户信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white/50">邮箱</span>
              <span className="text-[13px] font-medium">
                {user?.email ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white/50">角色</span>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                {isAdmin && (
                  <Shield className="h-3.5 w-3.5 text-[#0099ff]" />
                )}
                {isAdmin ? "管理员" : "用户"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 快捷入口 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white text-base">快捷入口</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/quotes"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-white/60 transition-colors hover:bg-white/6 hover:text-white min-h-[44px]"
            >
              <Bookmark className="h-4 w-4" />
              句子本
            </Link>
          </CardContent>
        </Card>

        {/* 退出登录 */}
        <Card>
          <CardContent className="pt-6">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/");
                router.refresh();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-[14px] font-medium text-red-400 transition-colors hover:bg-red-500/15 min-h-[48px]"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </CardContent>
        </Card>

        {/* AI 配置（仅 admin） */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-white text-base">
                AI 接口配置
              </CardTitle>
              <p className="text-[13px] text-white/40">
                此处配置将覆盖环境变量中的默认值，保存后立即生效。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-white/70">
                  AI 提供商
                </label>
                <select
                  value={edited.ai_provider ?? ""}
                  onChange={(e) =>
                    setEdited((prev) => ({
                      ...prev,
                      ai_provider: e.target.value,
                    }))
                  }
                  onBlur={() => {
                    if (edited.ai_provider !== config.ai_provider) {
                      saveKey("ai_provider", edited.ai_provider ?? "");
                    }
                  }}
                  className="w-full rounded-xl border border-white/15 bg-white/85 px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-colors hover:border-white/25 focus-visible:border-[#0099ff] focus-visible:ring-2 focus-visible:ring-[rgba(0,153,255,0.15)]"
                >
                  {AI_PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-white/70">
                  API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={edited.ai_api_key ?? ""}
                    onChange={(e) =>
                      setEdited((prev) => ({
                        ...prev,
                        ai_api_key: e.target.value,
                      }))
                    }
                    placeholder={
                      config.ai_api_key
                        ? "已设置（输入新值覆盖）"
                        : "sk-..."
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveKey("ai_api_key", edited.ai_api_key ?? "")}
                    disabled={
                      saving["ai_api_key"] ||
                      edited.ai_api_key === config.ai_api_key
                    }
                  >
                    {saving["ai_api_key"] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    保存
                  </Button>
                </div>
              </div>

              {/* Base URL */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-white/70">
                  Base URL
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={edited.ai_api_base_url ?? ""}
                    onChange={(e) =>
                      setEdited((prev) => ({
                        ...prev,
                        ai_api_base_url: e.target.value,
                      }))
                    }
                    placeholder={config.ai_api_base_url || "https://api.openai.com/v1"}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      saveKey("ai_api_base_url", edited.ai_api_base_url ?? "")
                    }
                    disabled={
                      saving["ai_api_base_url"] ||
                      edited.ai_api_base_url === config.ai_api_base_url
                    }
                  >
                    {saving["ai_api_base_url"] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    保存
                  </Button>
                </div>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-white/70">
                  Model
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={edited.ai_model ?? ""}
                    onChange={(e) =>
                      setEdited((prev) => ({
                        ...prev,
                        ai_model: e.target.value,
                      }))
                    }
                    placeholder={config.ai_model || "deepseek-v4-flash"}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveKey("ai_model", edited.ai_model ?? "")}
                    disabled={
                      saving["ai_model"] ||
                      edited.ai_model === config.ai_model
                    }
                  >
                    {saving["ai_model"] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    保存
                  </Button>
                </div>
              </div>

              {/* 状态提示 */}
              {status && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                  {status}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* 管理员：所有解析视频 */}
        {isAdmin && <AdminVideosPanel />}

        {/* 非 admin 加载中 */}
        {!isAdmin && loadingConfig && authLoading && (
          <Card>
            <CardContent className="py-8">
              <div className="space-y-3">
                <div className="mx-auto h-4 w-2/5 animate-breathe rounded-full bg-white/8" />
                <div className="mx-auto h-3 w-3/5 animate-breathe rounded-full bg-white/6" />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// ─── 管理员视频面板 ───

interface AdminVideo {
  videoId: string;
  title: string;
  thumbnail: string | null;
  channelName: string;
  parsedAt: string;
  parsedBy: string;
}

function AdminVideosPanel() {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/videos")
      .then((r) => r.json())
      .then((data: { ok: boolean; data: { videos: AdminVideo[] } }) => {
        if (data.ok) setVideos(data.data.videos ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white text-base">
          <Shield className="h-4 w-4 text-[#0099ff]" />
          所有用户解析视频
        </CardTitle>
        <p className="text-[13px] text-white/40">
          全站用户解析过的视频一览
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white/6 animate-breathe" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <p className="text-[13px] text-white/30 py-4 text-center">暂无解析记录</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {videos.map((v) => (
              <Link
                key={v.videoId}
                href={`/video/${v.videoId}`}
                className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]"
              >
                {v.thumbnail ? (
                  <Image
                    src={v.thumbnail}
                    alt={v.title}
                    width={96}
                    height={54}
                    unoptimized
                    className="h-12 w-20 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-white/6">
                    <ExternalLink className="h-4 w-4 text-white/15" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[13px] font-medium text-white/80">
                    {v.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-white/35">
                    {v.channelName} · {new Date(v.parsedAt).toLocaleDateString("zh-CN")}
                  </p>
                  <p className="text-[11px] text-white/20">
                    by {v.parsedBy}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/15" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
