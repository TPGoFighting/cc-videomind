"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Clock, Crown, Loader2, Smartphone, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Navbar } from "@/components/navbar";
import { PLAN_CONFIGS, type PlanConfig, type SubscriptionTier } from "@/lib/plans";

export default function SubscribePage() {
  const { user, subscriptionTier } = useAuth();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("pro");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pendingSub, setPendingSub] = useState<{ tier: string; status: string; createdAt: string } | null>(null);

  const selectedPlan = PLAN_CONFIGS.find((p) => p.tier === selectedTier)!;

  useEffect(() => {
    if (!user) return;
    fetch("/api/payment/submit")
      .then((r) => r.json())
      .then((data) => { if (data.pending) setPendingSub(data.pending); })
      .catch(() => {});
  }, [user]);

  async function handleSubmit() {
    if (!user) return;
    if (!transactionId.trim()) {
      setSubmitResult({ ok: false, message: "请输入微信/支付宝交易单号" });
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/payment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier, transactionId: transactionId.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ ok: true, message: "提交成功！管理员将在 24 小时内审核，请耐心等待。" });
        setTransactionId("");
      } else {
        setSubmitResult({
          ok: false,
          message: data.error === "duplicate"
            ? "你已有一个待审核的相同方案申请，请等待管理员审核。"
            : (data.error_description ?? "提交失败，请稍后再试。"),
        });
      }
    } catch {
      setSubmitResult({ ok: false, message: "网络错误，请稍后再试。" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-2xl px-4 pt-24 pb-16 sm:pt-28 sm:pb-20">
        {/* Header */}
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-[26px] sm:text-[34px] font-bold tracking-tight">
            升级
            <span className="bg-gradient-to-r from-[#0099ff] via-[#33adff] to-[#0099ff] bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-shift">
              订阅方案
            </span>
          </h1>
          <p className="text-[14px] text-[#a6a6a6]">
            扫码支付后提交交易单号，管理员审核通过即可升级
          </p>
        </div>

        {/* 当前方案 + 方案选择 */}
        <div className="space-y-4 mb-8">
          {user && (
            <p className="text-center text-[12px] text-white/30">
              当前：
              <span className="text-white/50">
                {PLAN_CONFIGS.find((p) => p.tier === subscriptionTier)?.nameZh ?? "免费版"}
              </span>
            </p>
          )}

          {/* 紧凑方案选择器 */}
          <div className="grid grid-cols-3 gap-3">
            {PLAN_CONFIGS.map((plan) => (
              <button
                key={plan.tier}
                type="button"
                onClick={() => setSelectedTier(plan.tier)}
                className={`relative rounded-xl border px-4 py-3 text-left transition-all ${
                  selectedTier === plan.tier
                    ? plan.highlighted
                      ? "border-[#0099ff]/50 bg-[#0099ff]/8 ring-1 ring-[#0099ff]/15"
                      : "border-[#0099ff]/40 bg-[#0099ff]/6"
                    : "border-white/6 bg-white/[0.02] hover:border-white/12"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#0099ff]/15 px-2 py-0.5 text-[10px] text-[#0099ff]">
                    推荐
                  </span>
                )}
                {user && subscriptionTier === plan.tier && (
                  <span className="absolute top-1.5 right-1.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/25">
                    当前
                  </span>
                )}
                <div className="text-[14px] font-semibold">{plan.nameZh}</div>
                <div className="mt-1">
                  {plan.price === 0 ? (
                    <span className="text-[18px] font-bold">免费</span>
                  ) : (
                    <span className="text-[18px] font-bold">
                      ¥{plan.price}<span className="text-[11px] font-normal text-white/25">/月</span>
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[10px] text-white/30">
                  每天{plan.dailyLimit}次{plan.weeklyLimit < Infinity ? ` · 每周${plan.weeklyLimit}次` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 付费方案：收款码 + 表单 */}
        {!user ? (
          <div className="text-center rounded-2xl border border-white/6 bg-[#0a0a0a] p-10">
            <Smartphone className="h-10 w-10 text-white/20 mx-auto mb-4" />
            <p className="text-[15px] text-white/60 mb-5">请先登录后再提交付款凭证</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full bg-[#0099ff] px-6 py-2.5 text-[14px] font-medium text-white hover:bg-[#0099ff]/90">
                立即登录
              </Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-6 py-2.5 text-[14px] font-medium text-white/70 hover:bg-white/15">
                免费注册
              </Link>
            </div>
          </div>
        ) : selectedTier === "free" ? (
          <div className="text-center rounded-2xl border border-white/6 bg-[#0a0a0a] p-10">
            <p className="text-[14px] text-white/40">免费版无需付款，注册即享每日 3 次、每周 7 次视频分析</p>
          </div>
        ) : pendingSub ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-8 text-center">
            <Clock className="h-10 w-10 text-amber-400/60 mx-auto mb-3" />
            <h3 className="text-[16px] font-semibold text-amber-400 mb-2">审核中</h3>
            <p className="text-[13px] text-white/40">
              你已提交 <span className="text-white/60 font-medium">{PLAN_CONFIGS.find((p) => p.tier === pendingSub.tier)?.nameZh}</span> 方案，请等待管理员审核（通常 24 小时内）。
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-[#0a0a0a] p-5 sm:p-6">
            {/* 所选方案摘要 */}
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/5">
              {selectedTier === "max" ? <Zap className="h-5 w-5 text-[#0099ff]" /> : <Crown className="h-5 w-5 text-[#0099ff]" />}
              <div>
                <span className="text-[15px] font-semibold">{selectedPlan.nameZh}</span>
                <span className="ml-2 text-[13px] text-white/40">¥{selectedPlan.price}/月 · 每天{selectedPlan.dailyLimit}次 · 每周{selectedPlan.weeklyLimit}次</span>
              </div>
            </div>

            {/* 收款码 + 表单：桌面端并排 */}
            <div className="grid sm:grid-cols-[auto_1fr] gap-5">
              {/* 收款码 */}
              <div className="flex gap-4 justify-center sm:flex-col sm:gap-3">
                <div className="text-center">
                  <div className="mx-auto mb-2 h-[140px] w-[140px] rounded-xl border border-[#07c160]/20 bg-[#07c160]/[0.04] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/wechat-pay.jpg"
                      alt="微信收款码"
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        const el = e.currentTarget; el.style.display = "none";
                        const p = el.parentElement;
                        if (p) p.innerHTML = '<span class="flex items-center justify-center h-full text-[11px] text-white/15 text-center px-2">微信收款码<br/>wechat-pay.jpg</span>';
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-medium text-[#07c160]">微信</span>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-2 h-[140px] w-[140px] rounded-xl border border-[#1677ff]/20 bg-[#1677ff]/[0.04] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/alipay.jpg"
                      alt="支付宝收款码"
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        const el = e.currentTarget; el.style.display = "none";
                        const p = el.parentElement;
                        if (p) p.innerHTML = '<span class="flex items-center justify-center h-full text-[11px] text-white/15 text-center px-2">支付宝收款码<br/>alipay.jpg</span>';
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-medium text-[#1677ff]">支付宝</span>
                </div>
              </div>

              {/* 表单 */}
              <div className="space-y-4">
                <div className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-[11px] text-white/30 space-y-0.5">
                  <p>1. 微信/支付宝扫描左侧收款码</p>
                  <p>2. 支付 <span className="text-white/45 font-medium">¥{selectedPlan.price}</span>，在账单中复制交易单号</p>
                  <p>3. 填入下方并提交，等待管理员审核</p>
                </div>

                <div>
                  <input
                    id="txn-id"
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="粘贴微信/支付宝交易单号..."
                    className="w-full rounded-lg border border-white/8 bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder:text-white/15 focus:border-[#0099ff]/40 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="w-full rounded-xl py-3 text-[14px] font-medium transition-all btn-press bg-[#0099ff] text-white hover:bg-[#0099ff]/90 shadow-[rgba(0,153,255,0.25)_0px_4px_16px] disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />提交中...</span>
                  ) : (
                    `提交 · ¥${selectedPlan.price}/${selectedPlan.nameZh === "旗舰版" ? "月" : "月"}`
                  )}
                </button>

                {submitResult && (
                  <div className={`flex items-start gap-2 rounded-lg p-3 text-[13px] ${submitResult.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {submitResult.ok ? <Check className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                    {submitResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
