"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CONFIRMATION_TEXT = "删除我的账户";

type DeletionRequest = {
  id: string;
  status: "pending" | "processing" | "completed" | "cancelled" | "failed";
  requestedAt: string;
  processAfter: string;
  completedAt: string | null;
  errorCode: string | null;
  canCancel: boolean;
};

type DeletionScope = {
  deletes: readonly string[];
  retains: readonly string[];
};

const EMPTY_SCOPE: DeletionScope = { deletes: [], retains: [] };
const FIXTURE_SCOPE: DeletionScope = {
  deletes: ["登录会话与个人 AI 配置", "视频历史、笔记、收藏词句与复习记录", "待处理任务和产品分析同意状态"],
  retains: ["付款状态与不可逆摘要", "不含邮箱和学习正文的删除处理记录", "保留期内已去标识化的聚合事件"],
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function deletionErrorMessage(code: string | null) {
  if (code === "admin_requires_manual_review") return "管理员账户需要先移交权限，再由支持人员处理。";
  if (code === "processing_failed") return "删除任务暂未完成，系统会保留状态供支持人员处理。";
  return "删除任务未完成，请通过支持页报告问题。";
}

export function PrivacyControlsCard({ fixture = false }: { fixture?: boolean }) {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [analyticsAvailable, setAnalyticsAvailable] = useState(true);
  const [deletionAvailable, setDeletionAvailable] = useState(true);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [scope, setScope] = useState<DeletionScope>(fixture ? FIXTURE_SCOPE : EMPTY_SCOPE);
  const [loading, setLoading] = useState(!fixture);
  const [savingAnalytics, setSavingAnalytics] = useState(false);
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (fixture) return;
    let active = true;
    Promise.all([
      fetch("/api/privacy-preferences", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/account/deletion-request", { cache: "no-store" }).then((response) => response.json()),
    ])
      .then(([privacyPayload, deletionPayload]) => {
        if (!active) return;
        setAnalyticsEnabled(Boolean(privacyPayload.data?.analyticsEnabled));
        setAnalyticsAvailable(privacyPayload.data?.available !== false);
        setDeletionAvailable(deletionPayload.data?.available !== false);
        setDeletionRequest(deletionPayload.data?.request ?? null);
        setScope(deletionPayload.data?.scope ?? EMPTY_SCOPE);
      })
      .catch(() => {
        if (active) setNotice({ type: "error", message: "暂时无法读取隐私设置，请稍后重试。" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fixture]);

  async function updateAnalytics(enabled: boolean) {
    setSavingAnalytics(true);
    setNotice(null);
    if (fixture) {
      setAnalyticsEnabled(enabled);
      setSavingAnalytics(false);
      setNotice({ type: "success", message: enabled ? "开发验收：分析偏好已开启。" : "开发验收：分析偏好已关闭。" });
      return;
    }
    try {
      const response = await fetch("/api/privacy-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyticsEnabled: enabled }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "保存失败");
      setAnalyticsEnabled(enabled);
      setNotice({
        type: "success",
        message: enabled ? "已开启最小化产品分析。" : "已关闭产品分析，之后不会写入新的非必要事件。",
      });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "保存失败，请稍后重试。" });
    } finally {
      setSavingAnalytics(false);
    }
  }

  async function submitDeletion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingDeletion(true);
    setNotice(null);
    if (fixture) {
      const now = new Date();
      setDeletionRequest({
        id: "fixture-deletion-request",
        status: "pending",
        requestedAt: now.toISOString(),
        processAfter: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: null,
        errorCode: null,
        canCancel: true,
      });
      setPassword("");
      setConfirmation("");
      setSubmittingDeletion(false);
      setNotice({ type: "success", message: "开发验收：删除请求已进入 7 天撤销期。" });
      return;
    }
    try {
      const response = await fetch("/api/account/deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "提交失败");
      setDeletionRequest(payload.data.request);
      setScope(payload.data.scope ?? scope);
      setPassword("");
      setConfirmation("");
      setNotice({ type: "success", message: "删除请求已提交。处理前可以在这里撤销。" });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "提交失败，请稍后重试。" });
    } finally {
      setSubmittingDeletion(false);
    }
  }

  async function cancelDeletion() {
    setSubmittingDeletion(true);
    setNotice(null);
    if (fixture && deletionRequest) {
      setDeletionRequest({ ...deletionRequest, status: "cancelled", canCancel: false });
      setSubmittingDeletion(false);
      setNotice({ type: "success", message: "开发验收：账户删除请求已撤销。" });
      return;
    }
    try {
      const response = await fetch("/api/account/deletion-request", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "撤销失败");
      setDeletionRequest(payload.data.request);
      setNotice({ type: "success", message: "账户删除请求已撤销。" });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "撤销失败，请稍后重试。" });
    } finally {
      setSubmittingDeletion(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <ShieldCheck className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
          隐私与账户权利
          {fixture ? <span className="rounded-full border border-[var(--tp-border)] px-2 py-0.5 text-[10px] font-medium text-white/45">开发验收</span> : null}
        </CardTitle>
        <p className="text-[13px] leading-5 text-white/50">产品分析默认关闭；你的学习正文不会写入分析事件。</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex min-h-24 items-center justify-center text-sm text-white/45">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            正在读取隐私设置…
          </div>
        ) : (
          <>
            <section aria-labelledby="analytics-preference-title" className="space-y-3">
              <div>
                <h3 id="analytics-preference-title" className="text-sm font-semibold text-white">最小化产品分析</h3>
                <p className="mt-1 text-[13px] leading-6 text-white/50">
                  仅记录功能结果、耗时区间、错误码、缓存命中和学习动作类型，最长保留 180 天；不记录原始 URL、字幕、Prompt、回答或笔记正文。
                </p>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                <span className="text-sm text-white/75">允许记录非必要产品分析事件</span>
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  disabled={!analyticsAvailable || savingAnalytics}
                  onChange={(event) => void updateAnalytics(event.target.checked)}
                  className="h-5 w-5 accent-[var(--tp-accent)]"
                />
              </label>
              {!analyticsAvailable ? <p className="text-xs text-white/40">本地模式不记录产品分析事件。</p> : null}
            </section>

            <section aria-labelledby="account-export-title" className="space-y-3 border-t border-white/8 pt-5">
              <div>
                <h3 id="account-export-title" className="text-sm font-semibold text-white">导出我的数据</h3>
                <p className="mt-1 text-[13px] leading-6 text-white/50">下载账户、学习记录、复习状态和付款状态的 JSON 副本；密码、会话令牌和个人 API Key 不会进入文件。</p>
              </div>
              <a
                href={fixture ? "#account-export-title" : "/api/account/export"}
                download={fixture ? undefined : true}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--tp-border-strong)] px-5 text-sm font-semibold text-[var(--tp-text)] transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tp-accent)]"
              >
                <Download className="h-4 w-4" aria-hidden />
                下载数据副本
              </a>
            </section>

            <section aria-labelledby="account-deletion-title" className="space-y-4 border-t border-red-400/15 pt-5">
              <div>
                <h3 id="account-deletion-title" className="flex items-center gap-2 text-sm font-semibold text-red-300">
                  <Trash2 className="h-4 w-4" aria-hidden />
                  删除账户
                </h3>
                <p className="mt-1 text-[13px] leading-6 text-white/50">验证密码后进入 7 天撤销期。到期后会删除学习内容并注销登录；管理员账户需要先移交权限。</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-white/70">会删除</p>
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-white/45">
                    {scope.deletes.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-white/70">最小保留例外</p>
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-white/45">
                    {scope.retains.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              </div>

              {deletionRequest?.status === "pending" || deletionRequest?.status === "processing" ? (
                <div className="rounded-xl border border-amber-300/20 bg-amber-300/8 p-4">
                  <p className="text-sm font-semibold text-amber-200">
                    {deletionRequest.status === "pending" ? "删除请求等待处理" : "账户正在删除"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/55">计划处理时间：{formatDate(deletionRequest.processAfter)}</p>
                  {deletionRequest.canCancel ? (
                    <Button type="button" variant="outline" onClick={() => void cancelDeletion()} disabled={submittingDeletion} className="mt-3 min-h-11">
                      <Undo2 className="h-4 w-4" aria-hidden />
                      撤销删除请求
                    </Button>
                  ) : null}
                </div>
              ) : deletionRequest?.status === "failed" ? (
                <div className="rounded-xl border border-red-400/20 bg-red-400/8 p-4 text-sm text-red-200">
                  {deletionErrorMessage(deletionRequest.errorCode)}
                </div>
              ) : (
                <form onSubmit={submitDeletion} className="space-y-4 rounded-xl border border-red-400/15 bg-red-400/[0.035] p-4">
                  <div className="space-y-2">
                    <label htmlFor="delete-account-password" className="text-sm font-medium text-white/70">当前密码</label>
                    <Input
                      id="delete-account-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={8}
                      className="min-h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="delete-account-confirmation" className="text-sm font-medium text-white/70">
                      输入“{CONFIRMATION_TEXT}”确认
                    </label>
                    <Input
                      id="delete-account-confirmation"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      required
                      className="min-h-12"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!deletionAvailable || submittingDeletion || confirmation !== CONFIRMATION_TEXT || password.length < 8}
                    className="min-h-12 w-full border border-red-400/30 bg-red-500/15 text-red-200 hover:bg-red-500/25"
                  >
                    {submittingDeletion ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                    提交删除请求
                  </Button>
                  {!deletionAvailable ? <p className="text-xs text-white/45">当前账户需要先完成权限移交，暂不能自助删除。</p> : null}
                </form>
              )}
            </section>

            <p className="border-t border-white/8 pt-4 text-xs leading-5 text-white/40">
              查看完整处理说明可阅读 <Link href="/privacy" className="text-[var(--tp-accent)]">隐私政策</Link>；产品问题和处理异常可前往 <Link href="/support" className="text-[var(--tp-accent)]">支持页</Link>。
            </p>
          </>
        )}

        {notice ? (
          <p role="status" className={`rounded-lg px-3 py-2 text-[13px] ${notice.type === "success" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
            {notice.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
