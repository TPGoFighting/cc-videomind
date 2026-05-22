"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Check, Clock, ExternalLink, Loader2, LogIn, LogOut, Plug, Save, Shield, Wifi, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProviderInfo = { id: string; displayName: string; defaultBaseUrl: string; defaultModel: string };
type AiConfigData = Record<string, string | null>;

function maskKey(key: string | null | undefined): string {
  if (!key || key.length <= 8) return "未设置";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

// ── 全局配置卡片（仅管理员可见）──
function GlobalConfigCard({
  config,
  edited,
  setEdited,
  saving,
  saveKey,
  status,
  providers,
}: {
  config: AiConfigData;
  edited: AiConfigData;
  setEdited: (updater: (prev: AiConfigData) => AiConfigData) => void;
  saving: Record<string, boolean>;
  saveKey: (scope: "global" | "personal", key: string, value: string) => Promise<void>;
  status: { type: "error" | "success"; message: string } | null;
  providers: ProviderInfo[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white text-base">
          <Shield className="h-4 w-4 text-[#0099ff]" />
          全局默认配置
        </CardTitle>
        <p className="text-[13px] text-white/40">
          所有未设置个人 API 配置的用户将使用此默认配置。保存后立即生效。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前生效摘要 */}
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 space-y-1.5">
          <p className="text-[11px] text-white/30 uppercase tracking-wider">当前生效</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-[12px] text-white/40">提供商</span>
            <span className="text-[12px] text-white/70">
              {config.ai_provider || "未设置"}
            </span>
            <span className="text-[12px] text-white/40">API Key</span>
            <span className="text-[12px] text-white/70 font-mono">{maskKey(config.ai_api_key)}</span>
            <span className="text-[12px] text-white/40">Base URL</span>
            <span className="text-[12px] text-white/70 truncate max-w-[200px]">
              {config.ai_api_base_url || "未设置"}
            </span>
            <span className="text-[12px] text-white/40">模型</span>
            <span className="text-[12px] text-white/70 font-mono">{config.ai_model || "未设置"}</span>
          </div>
        </div>

        {/* Provider */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-white/70">AI 提供商</label>
          <select
            value={edited.ai_provider ?? ""}
            onChange={(e) => {
              const newProvider = e.target.value;
              const def = providers.find(p => p.id === newProvider);
              setEdited((prev) => ({
                ...prev,
                ai_provider: newProvider,
                ai_api_base_url: prev.ai_api_base_url || def?.defaultBaseUrl || "",
                ai_model: prev.ai_model || def?.defaultModel || "",
              }));
            }}
            onBlur={() => {
              if (edited.ai_provider !== config.ai_provider) {
                saveKey("global", "ai_provider", edited.ai_provider ?? "");
              }
            }}
            className="w-full rounded-xl border border-white/15 bg-white/85 px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-colors hover:border-white/25 focus-visible:border-[#0099ff] focus-visible:ring-2 focus-visible:ring-[rgba(0,153,255,0.15)]"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-white/70">API Key</label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={edited.ai_api_key ?? ""}
              onChange={(e) => setEdited((prev) => ({ ...prev, ai_api_key: e.target.value }))}
              placeholder={config.ai_api_key ? "已设置（输入新值覆盖）" : "sk-..."}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => saveKey("global", "ai_api_key", edited.ai_api_key ?? "")}
              disabled={saving["global:ai_api_key"] || edited.ai_api_key === config.ai_api_key}
            >
              {saving["global:ai_api_key"] ? (
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
          <label className="text-[13px] font-medium text-white/70">Base URL</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={edited.ai_api_base_url ?? ""}
              onChange={(e) => setEdited((prev) => ({ ...prev, ai_api_base_url: e.target.value }))}
              placeholder={config.ai_api_base_url || "https://api.openai.com/v1"}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => saveKey("global", "ai_api_base_url", edited.ai_api_base_url ?? "")}
              disabled={saving["global:ai_api_base_url"] || edited.ai_api_base_url === config.ai_api_base_url}
            >
              {saving["global:ai_api_base_url"] ? (
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
          <label className="text-[13px] font-medium text-white/70">Model</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={edited.ai_model ?? ""}
              onChange={(e) => setEdited((prev) => ({ ...prev, ai_model: e.target.value }))}
              placeholder={config.ai_model || "deepseek-v4-flash"}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => saveKey("global", "ai_model", edited.ai_model ?? "")}
              disabled={saving["global:ai_model"] || edited.ai_model === config.ai_model}
            >
              {saving["global:ai_model"] ? (
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
          <p className={`rounded-lg px-3 py-2 text-[13px] ${status.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {status.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── 个人配置卡片（所有登录用户可见）──
function PersonalConfigCard({
  config,
  edited,
  setEdited,
  saving,
  testing,
  testResult,
  saveKey,
  testConnection,
  status,
  providers,
}: {
  config: AiConfigData;
  edited: AiConfigData;
  setEdited: (updater: (prev: AiConfigData) => AiConfigData) => void;
  saving: Record<string, boolean>;
  testing: boolean;
  testResult: { ok: boolean; message: string } | null;
  saveKey: (scope: "global" | "personal", key: string, value: string) => Promise<void>;
  testConnection: () => Promise<void>;
  status: { type: "error" | "success"; message: string } | null;
  providers: ProviderInfo[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-white text-base">我的 API 配置</CardTitle>
        <p className="text-[13px] text-white/40">
          此处设置仅影响你自己的 AI 请求，优先级高于全局默认配置。留空则使用全局默认。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前生效摘要 */}
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 space-y-1.5">
          <p className="text-[11px] text-white/30 uppercase tracking-wider">当前设置</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-[12px] text-white/40">提供商</span>
            <span className="text-[12px] text-white/70">
              {config.ai_provider || "（使用全局配置）"}
            </span>
            <span className="text-[12px] text-white/40">API Key</span>
            <span className="text-[12px] text-white/70 font-mono">{maskKey(config.ai_api_key)}</span>
            <span className="text-[12px] text-white/40">Base URL</span>
            <span className="text-[12px] text-white/70 truncate max-w-[200px]">
              {config.ai_api_base_url || "（使用全局配置）"}
            </span>
            <span className="text-[12px] text-white/40">模型</span>
            <span className="text-[12px] text-white/70 font-mono">
              {config.ai_model || "（使用全局配置）"}
            </span>
          </div>
        </div>

        {/* Provider */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-white/70">AI 提供商</label>
          <select
            value={edited.ai_provider ?? ""}
            onChange={(e) => {
              const newProvider = e.target.value;
              const def = providers.find(p => p.id === newProvider);
              setEdited((prev) => ({
                ...prev,
                ai_provider: newProvider || null,
                ai_api_base_url: prev.ai_api_base_url || def?.defaultBaseUrl || "",
                ai_model: prev.ai_model || def?.defaultModel || "",
              }));
            }}
            onBlur={() => {
              if (edited.ai_provider !== config.ai_provider) {
                saveKey("personal", "ai_provider", edited.ai_provider ?? "");
              }
            }}
            className="w-full rounded-xl border border-white/15 bg-white/85 px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-colors hover:border-white/25 focus-visible:border-[#0099ff] focus-visible:ring-2 focus-visible:ring-[rgba(0,153,255,0.15)]"
          >
            <option value="">使用全局配置</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-white/70">API Key</label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={edited.ai_api_key ?? ""}
              onChange={(e) => setEdited((prev) => ({ ...prev, ai_api_key: e.target.value }))}
              placeholder={config.ai_api_key ? "已设置（输入新值覆盖）" : "使用全局默认..."}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => saveKey("personal", "ai_api_key", edited.ai_api_key ?? "")}
              disabled={saving["personal:ai_api_key"] || edited.ai_api_key === config.ai_api_key}
            >
              {saving["personal:ai_api_key"] ? (
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
          <label className="text-[13px] font-medium text-white/70">Base URL</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={edited.ai_api_base_url ?? ""}
              onChange={(e) => setEdited((prev) => ({ ...prev, ai_api_base_url: e.target.value }))}
              placeholder="使用全局默认..."
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => saveKey("personal", "ai_api_base_url", edited.ai_api_base_url ?? "")}
              disabled={saving["personal:ai_api_base_url"] || edited.ai_api_base_url === config.ai_api_base_url}
            >
              {saving["personal:ai_api_base_url"] ? (
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
          <label className="text-[13px] font-medium text-white/70">Model</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={edited.ai_model ?? ""}
              onChange={(e) => setEdited((prev) => ({ ...prev, ai_model: e.target.value }))}
              placeholder="使用全局默认..."
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => saveKey("personal", "ai_model", edited.ai_model ?? "")}
              disabled={saving["personal:ai_model"] || edited.ai_model === config.ai_model}
            >
              {saving["personal:ai_model"] ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              保存
            </Button>
          </div>
        </div>

        {/* 测试连接 */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            {testing ? "测试中..." : "测试连接"}
          </Button>
          {testResult && (
            <p className={`rounded-lg px-3 py-2 text-[13px] ${testResult.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {testResult.ok ? <Wifi className="h-3.5 w-3.5 inline mr-1" /> : null}
              {testResult.message}
            </p>
          )}
        </div>

        {/* 状态提示 */}
        {status && (
          <p className={`rounded-lg px-3 py-2 text-[13px] ${status.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {status.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading, isAdmin, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [globalConfig, setGlobalConfig] = useState<AiConfigData>({});
  const [personalConfig, setPersonalConfig] = useState<AiConfigData>({});
  const [editedGlobal, setEditedGlobal] = useState<AiConfigData>({});
  const [editedPersonal, setEditedPersonal] = useState<AiConfigData>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  // 加载配置
  useEffect(() => {
    if (!user) return;
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data: { admin: boolean; global: AiConfigData; personal: AiConfigData; providers: ProviderInfo[] }) => {
        setGlobalConfig(data.global ?? {});
        setEditedGlobal(data.global ?? {});
        setPersonalConfig(data.personal ?? {});
        setEditedPersonal(data.personal ?? {});
        setProviders(data.providers ?? []);
      })
      .catch(console.error);
  }, [user]);

  // 刷新 profile 确保 isAdmin 同步
  useEffect(() => {
    if (!authLoading && user) {
      refreshProfile();
    }
  }, [authLoading, user, refreshProfile]);

  async function saveKey(scope: "global" | "personal", key: string, value: string) {
    const saveId = `${scope}:${key}`;
    setSaving((prev) => ({ ...prev, [saveId]: true }));
    clearStatus();

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, key, value }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: { message?: string } };
      if (!res.ok || !payload.ok) {
        setStatus({ type: "error", message: payload.error?.message ?? "保存失败" });
        return;
      }
      if (scope === "global") {
        setGlobalConfig((prev) => ({ ...prev, [key]: value }));
      } else {
        setPersonalConfig((prev) => ({ ...prev, [key]: value }));
      }
      showSuccess("已保存");
    } catch {
      setStatus({ type: "error", message: "网络错误，请稍后重试。" });
    } finally {
      setSaving((prev) => ({ ...prev, [saveId]: false }));
    }
  }

  function clearStatus() {
    setStatus(null);
    setTestResult(null);
  }

  function showSuccess(msg: string) {
    setStatus({ type: "success", message: msg });
    setTimeout(() => setStatus(null), 3000);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: editedPersonal.ai_provider || editedGlobal.ai_provider || "deepseek",
          apiKey: editedPersonal.ai_api_key || editedGlobal.ai_api_key || "",
          baseUrl: editedPersonal.ai_api_base_url || editedGlobal.ai_api_base_url || undefined,
          model: editedPersonal.ai_model || editedGlobal.ai_model || "deepseek-v4-flash",
        }),
      });
      const data = await res.json();
      setTestResult({ ok: data.ok ?? false, message: data.ok ? data.message : (data.error ?? "测试失败") });
    } catch {
      setTestResult({ ok: false, message: "网络错误，无法连接测试端点" });
    } finally {
      setTesting(false);
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

        {/* 全局默认配置（仅 admin） */}
        {isAdmin && (
          <GlobalConfigCard
            config={globalConfig}
            edited={editedGlobal}
            setEdited={setEditedGlobal}
            saving={saving}
            saveKey={saveKey}
            status={status}
            providers={providers}
          />
        )}

        {/* 个人 API 配置（仅管理员） */}
        {isAdmin && (
        <PersonalConfigCard
          config={personalConfig}
          edited={editedPersonal}
          setEdited={setEditedPersonal}
          saving={saving}
          testing={testing}
          testResult={testResult}
          saveKey={saveKey}
          testConnection={testConnection}
          status={status}
          providers={providers}
        />
        )}

        {/* 管理员：所有解析视频 */}
        {isAdmin && <AdminVideosPanel />}

        {/* 管理员：付款审核 */}
        {isAdmin && <AdminPaymentsPanel />}
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

// ─── 管理员付款审核面板 ───

interface PaymentSubmission {
  id: string;
  user_id: string;
  tier: string;
  transaction_id: string;
  status: string;
  reviewed_by: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  userEmail: string | null;
}

function AdminPaymentsPanel() {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, [filter]);

  async function loadSubmissions() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?status=${filter}`);
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    } catch {
      console.error("加载付款提交失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(submissionId: string, action: "approve" | "reject") {
    setProcessing(submissionId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: action === "approve" ? "已批准并升级用户方案" : "已拒绝" });
        loadSubmissions();
      } else {
        setMessage({ type: "error", text: data.error_description ?? "操作失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setProcessing(null);
    }
  }

  const tierLabel = (t: string) => (t === "pro" ? "Pro 专业版" : "Max 旗舰版");
  const statusLabel = (s: string) => {
    switch (s) {
      case "pending": return { text: "待审核", color: "text-amber-400 bg-amber-400/10" };
      case "approved": return { text: "已通过", color: "text-emerald-400 bg-emerald-400/10" };
      case "rejected": return { text: "已拒绝", color: "text-red-400 bg-red-400/10" };
      default: return { text: s, color: "text-white/40 bg-white/6" };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white text-base">
          <Shield className="h-4 w-4 text-[#0099ff]" />
          付款审核
        </CardTitle>
        <p className="text-[13px] text-white/40">
          审核用户提交的微信/支付宝付款凭证
        </p>
      </CardHeader>
      <CardContent>
        {/* 过滤器 */}
        <div className="flex gap-2 mb-4">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                filter === f
                  ? "bg-[#0099ff]/15 text-[#0099ff]"
                  : "bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60"
              }`}
            >
              {f === "pending" ? "待审核" : f === "approved" ? "已通过" : f === "rejected" ? "已拒绝" : "全部"}
            </button>
          ))}
          <button
            type="button"
            onClick={loadSubmissions}
            className="ml-auto rounded-lg px-3 py-1.5 text-[12px] text-white/30 hover:text-white/50 transition-colors"
          >
            刷新
          </button>
        </div>

        {/* 消息 */}
        {message && (
          <p className={`mb-3 rounded-lg px-3 py-2 text-[13px] ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}>
            {message.text}
          </p>
        )}

        {/* 列表 */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-white/6 animate-breathe" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-[13px] text-white/30 py-8 text-center">暂无{filter === "pending" ? "待审核" : ""}付款记录</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {submissions.map((s) => {
              const st = statusLabel(s.status);
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-white/6 bg-white/[0.02] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white/80">
                          {s.userEmail ?? "未知用户"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.color}`}>
                          {s.status === "pending" ? <Clock className="h-3 w-3" /> : s.status === "approved" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {st.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[12px] text-white/35">
                        <span>{tierLabel(s.tier)} · ¥{s.tier === "pro" ? "15" : "50"}</span>
                        <span>单号: {s.transaction_id}</span>
                      </div>
                      <p className="text-[11px] text-white/25">
                        {new Date(s.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>

                    {/* 待审核：操作按钮 */}
                    {s.status === "pending" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={processing === s.id}
                          onClick={() => handleReview(s.id, "approve")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[12px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {processing === s.id ? "处理中..." : "通过"}
                        </button>
                        <button
                          type="button"
                          disabled={processing === s.id}
                          onClick={() => handleReview(s.id, "reject")}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
