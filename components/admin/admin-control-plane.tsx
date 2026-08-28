"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Database,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  ServerCog,
  ShieldAlert,
  Wifi,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProviderInfo = {
  id: string;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
};

type EndpointInfo = {
  id: string;
  label: string;
  method: string;
  path: string;
  cache: string;
  description: string;
};

type ControlPlaneSnapshot = {
  config: {
    provider: string;
    baseUrl: string;
    model: string;
    apiKeyMasked: string;
    hasApiKey: boolean;
    sources: {
      provider: ConfigSource;
      apiKey: ConfigSource;
      baseUrl: ConfigSource;
      model: ConfigSource;
    };
    envOverrides: Record<string, boolean>;
  };
  providers: ProviderInfo[];
  endpoints: EndpointInfo[];
  cachePolicy: Array<{ resource: string; ttl: string }>;
};

type DraftConfig = {
  provider: string;
  baseUrl: string;
  model: string;
};

type Notice = { type: "success" | "error"; text: string } | null;
type ConfigSource = "environment" | "user" | "database" | "default" | "unset";

const SOURCE_LABELS: Record<ConfigSource, string> = {
  environment: "环境变量覆盖",
  user: "用户配置",
  database: "数据库配置",
  default: "系统默认",
  unset: "未配置",
};

export function AdminControlPlane() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [snapshot, setSnapshot] = useState<ControlPlaneSnapshot | null>(null);
  const [draft, setDraft] = useState<DraftConfig>({ provider: "", baseUrl: "", model: "" });
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [testResult, setTestResult] = useState<Notice>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/control-plane", { cache: "no-store" });
      const payload = await response.json() as { data?: ControlPlaneSnapshot; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "无法加载 AI 控制台。");
      }
      setSnapshot(payload.data);
      setDraft({
        provider: payload.data.config.provider,
        baseUrl: payload.data.config.baseUrl,
        model: payload.data.config.model,
      });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "无法加载 AI 控制台。" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) void loadSnapshot();
  }, [isAdmin, loadSnapshot, user]);

  const selectedProvider = useMemo(
    () => snapshot?.providers.find((provider) => provider.id === draft.provider),
    [draft.provider, snapshot?.providers],
  );

  function applyProvider(providerId: string) {
    const provider = snapshot?.providers.find((item) => item.id === providerId);
    setDraft((current) => ({
      provider: providerId,
      baseUrl: provider?.defaultBaseUrl ?? current.baseUrl,
      model: provider?.defaultModel ?? current.model,
    }));
    setNotice(null);
    setTestResult(null);
  }

  async function saveConfig() {
    setSaving(true);
    setNotice(null);
    try {
      const body: Record<string, string> = { ...draft };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const response = await fetch("/api/admin/control-plane", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "配置保存失败。");
      setApiKey("");
      setNotice({ type: "success", text: "配置已保存，后续 AI 请求会使用新设置。" });
      await loadSnapshot();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "配置保存失败。" });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const body: Record<string, string> = { ...draft };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const response = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { ok?: boolean; message?: string; error?: string };
      setTestResult({
        type: payload.ok && response.ok ? "success" : "error",
        text: payload.ok ? (payload.message ?? "连接成功。") : (payload.error ?? "连接失败。"),
      });
    } catch {
      setTestResult({ type: "error", text: "网络错误，无法连接测试端点。" });
    } finally {
      setTesting(false);
    }
  }

  if (authLoading || (user && isAdmin && loading && !snapshot)) {
    return (
      <div className="min-h-screen bg-[#08101a] text-white">
        <Navbar />
        <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 pt-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#5ba8ff]" />
        </main>
      </div>
    );
  }

  if (!user) {
    return <AccessMessage text="请先登录，再访问管理员 AI 控制台。" action="登录" href="/login" />;
  }

  if (!isAdmin) {
    return <AccessMessage text="当前账户没有管理员权限。" action="返回设置" href="/settings" />;
  }

  return (
    <div className="min-h-screen bg-[#08101a] text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-20 pt-20 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/settings" className="mb-4 inline-flex min-h-11 items-center gap-2 text-[13px] text-white/50 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              返回设置
            </Link>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5ba8ff]">Teach Player / Admin</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI 控制台</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              统一管理模型、兼容接口、密钥轮换和 AI 功能路由。密钥只用于服务器端请求，页面仅显示脱敏结果。
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadSnapshot()} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            刷新状态
          </Button>
        </div>

        {snapshot && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatusTile icon={<Bot className="h-4 w-4" />} label="实际生效模型" value={snapshot.config.model || "未设置"} source={snapshot.config.sources.model} tone="blue" />
              <StatusTile icon={<ServerCog className="h-4 w-4" />} label="实际生效接口" value={snapshot.config.baseUrl || "未设置"} source={snapshot.config.sources.baseUrl} tone="slate" />
              <StatusTile icon={<KeyRound className="h-4 w-4" />} label="API Key 状态" value={snapshot.config.hasApiKey ? snapshot.config.apiKeyMasked : "未设置"} source={snapshot.config.sources.apiKey} tone="slate" />
              <StatusTile icon={<Database className="h-4 w-4" />} label="缓存策略" value="批次增量 / 30 天复用" tone="green" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <ServerCog className="h-5 w-5 text-[#5ba8ff]" />
                    全局模型与接口
                  </CardTitle>
                  <p className="text-[13px] text-white/40">保存后清除 Provider 配置缓存，新的请求立即读取最新配置。</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={<span className="flex items-center gap-2">提供商 <SourceBadge source={snapshot.config.sources.provider} /></span>}>
                      <select
                        value={draft.provider}
                        onChange={(event) => applyProvider(event.target.value)}
                        className="h-12 w-full rounded-[var(--radius)] border border-[var(--tp-border)] bg-[var(--tp-surface)] px-4 text-sm text-[var(--tp-text)] outline-none focus:border-[var(--tp-accent)]"
                      >
                        <option value="">选择提供商</option>
                        {snapshot.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName}</option>)}
                      </select>
                    </Field>
                    <Field label={<span className="flex items-center gap-2">模型名 <SourceBadge source={snapshot.config.sources.model} /></span>}>
                      <Input value={draft.model} onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))} placeholder={selectedProvider?.defaultModel ?? "glm-5.3-flash"} />
                    </Field>
                  </div>
                  <Field label={<span className="flex items-center gap-2">兼容 API Base URL <SourceBadge source={snapshot.config.sources.baseUrl} /></span>}>
                    <Input value={draft.baseUrl} onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))} placeholder={selectedProvider?.defaultBaseUrl ?? "https://open.bigmodel.cn/api/coding/paas/v4"} />
                  </Field>
                  <Field label={<span className="flex items-center gap-2">API Key（留空则沿用当前密钥） <SourceBadge source={snapshot.config.sources.apiKey} /></span>}>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={snapshot.config.hasApiKey ? snapshot.config.apiKeyMasked : "输入服务器密钥"} autoComplete="new-password" />
                      <div className="flex shrink-0 items-center gap-2 rounded-[var(--radius)] border border-white/10 bg-white/[0.03] px-3 text-xs text-white/45">
                        <KeyRound className="h-4 w-4" />
                        {snapshot.config.hasApiKey ? snapshot.config.apiKeyMasked : "未设置"}
                      </div>
                    </div>
                  </Field>
                  {Object.values(snapshot.config.envOverrides).some(Boolean) && (
                    <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-xs leading-5 text-amber-200/80">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                      <div>
                        <p className="font-medium text-amber-100">环境变量覆盖生效</p>
                        <p className="mt-1">当前实际请求优先使用服务器环境变量；页面已在每个字段旁标明来源。保存数据库配置后，仍需同步环境变量才能改变被覆盖的字段。</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row">
                    <Button type="button" variant="accent" onClick={() => void saveConfig()} disabled={saving || !draft.provider || !draft.model || !draft.baseUrl}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? "保存中..." : "保存全局配置"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void testConnection()} disabled={testing || !draft.provider || !draft.model}>
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                      {testing ? "测试中..." : "测试当前连接"}
                    </Button>
                  </div>
                  {notice && <Notice notice={notice} />}
                  {testResult && <Notice notice={testResult} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Activity className="h-5 w-5 text-emerald-300" />
                    运行规则
                  </CardTitle>
                  <p className="text-[13px] text-white/40">当前服务如何选择模型、缓存和失败恢复路径。</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {snapshot.cachePolicy.map((item) => (
                    <div key={item.resource} className="flex items-start justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.025] p-3">
                      <span className="text-sm text-white/65">{item.resource}</span>
                      <span className="text-right text-xs leading-5 text-white/40">{item.ttl}</span>
                    </div>
                  ))}
                  <div className="rounded-xl border border-[#5ba8ff]/15 bg-[#5ba8ff]/6 p-4 text-sm leading-6 text-white/60">
                    <p className="mb-1 flex items-center gap-2 font-medium text-[#9dceff]"><CheckCircle2 className="h-4 w-4" />翻译响应方式</p>
                    每 25 句作为一个批次；批次完成后立即推送 SSE，并写入可续传的字幕缓存。失败批次会向客户端报告，已成功的译文会保留。
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Activity className="h-5 w-5 text-[#5ba8ff]" />
                  AI API 路由目录
                </CardTitle>
                <p className="text-[13px] text-white/40">所有 AI 功能共用上方 Provider 配置；每条路由的缓存和返回策略在这里可见。</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {snapshot.endpoints.map((endpoint) => (
                    <div key={endpoint.id} className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-semibold text-white/85">{endpoint.label}</h2>
                          <p className="mt-1 font-mono text-[11px] text-[#8fc6ff]/75">{endpoint.method} {endpoint.path}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-2 py-1 text-[10px] text-emerald-200/75">{endpoint.cache}</span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-white/45">{endpoint.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[13px] font-medium text-white/65">{label}</span>
      {children}
    </label>
  );
}

function Notice({ notice }: { notice: Exclude<Notice, null> }) {
  return (
    <p className={notice.type === "success" ? "flex items-center gap-2 rounded-xl bg-emerald-300/8 px-3 py-2 text-sm text-emerald-200" : "flex items-center gap-2 rounded-xl bg-red-400/8 px-3 py-2 text-sm text-red-200"}>
      {notice.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
      {notice.text}
    </p>
  );
}

function StatusTile({ icon, label, value, source, tone }: { icon: React.ReactNode; label: string; value: string; source?: ConfigSource; tone: "blue" | "slate" | "green" }) {
  const colors = {
    blue: "border-[#5ba8ff]/15 bg-[#5ba8ff]/6 text-[#9dceff]",
    slate: "border-white/10 bg-white/[0.035] text-white/70",
    green: "border-emerald-300/15 bg-emerald-300/6 text-emerald-200",
  } as const;
  return (
    <div className={`rounded-xl border p-4 ${colors[tone]}`}>
      <div className="flex items-center justify-between gap-2 text-xs opacity-70"><span className="flex items-center gap-2">{icon}{label}</span>{source && <SourceBadge source={source} />}</div>
      <p className="mt-3 truncate text-sm font-semibold" title={value}>{value}</p>
    </div>
  );
}

function SourceBadge({ source }: { source: ConfigSource }) {
  const colors: Record<ConfigSource, string> = {
    environment: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    user: "border-violet-300/20 bg-violet-300/10 text-violet-200",
    database: "border-[#5ba8ff]/20 bg-[#5ba8ff]/10 text-[#b4d9ff]",
    default: "border-white/15 bg-white/8 text-white/55",
    unset: "border-red-300/20 bg-red-300/10 text-red-200",
  };
  return <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-4 ${colors[source]}`}>{SOURCE_LABELS[source]}</span>;
}

function AccessMessage({ text, action, href }: { text: string; action: string; href: string }) {
  return (
    <div className="min-h-screen bg-[#08101a] text-white">
      <Navbar />
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 pt-14 text-center">
        <ShieldAlert className="h-8 w-8 text-amber-300" />
        <p className="text-sm text-white/60">{text}</p>
        <Link href={href}><Button type="button" variant="outline">{action}</Button></Link>
      </main>
    </div>
  );
}
