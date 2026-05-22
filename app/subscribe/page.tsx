"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Check, Clock, Crown, Loader2, Smartphone, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Navbar } from "@/components/navbar";
import { PLAN_CONFIGS, type PlanConfig, type SubscriptionTier } from "@/lib/plans";

function PlanIcon({ tier, className }: { tier: SubscriptionTier; className?: string }) {
  if (tier === "max") return <Zap className={className} />;
  if (tier === "pro") return <Crown className={className} />;
  return <Sparkles className={className} />;
}

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
        const errMsg = data?.error?.code === "duplicate"
          ? "你已有一个待审核的相同方案申请，请等待管理员审核。"
          : (data?.error?.message ?? "提交失败，请稍后再试。");
        setSubmitResult({ ok: false, message: errMsg });
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

      {/* ====== Hero ====== */}
      <section className="mx-auto max-w-3xl px-4 pt-24 pb-10 sm:pt-32 sm:pb-14 text-center">
        {/* 装饰线 */}
        <div className="mx-auto mb-6 h-px w-16 bg-gradient-to-r from-transparent via-[#0099ff]/40 to-transparent" />

        <h1 className="text-[28px] sm:text-[40px] font-bold tracking-tight leading-[1.15] stagger-children">
          <span className="text-white">选择你的</span>
          <br className="sm:hidden" />
          <span className="bg-gradient-to-r from-[#0099ff] via-[#33adff] to-[#0099ff] bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-shift">
            {" "}学习方案
          </span>
        </h1>
        <p className="mt-4 text-[14px] sm:text-[15px] text-white/35 max-w-lg mx-auto text-balance">
          所有方案均包含 AI 要点提取、结构化摘要、对话式问答与英语学习功能
        </p>

        {/* 当前方案标签 */}
        {user && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/6 bg-white/[0.03] px-4 py-1.5 text-[12px] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
            当前方案：
            <span className="text-white/60 font-medium">
              {PLAN_CONFIGS.find((p) => p.tier === subscriptionTier)?.nameZh ?? "免费版"}
            </span>
          </div>
        )}
      </section>

      {/* ====== 方案选择卡片 ====== */}
      <section className="mx-auto max-w-5xl px-4 pb-10 sm:pb-16">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3 stagger-children">
          {PLAN_CONFIGS.map((plan) => {
            const isSelected = selectedTier === plan.tier;
            const isCurrent = user && subscriptionTier === plan.tier;

            return (
              <button
                key={plan.tier}
                type="button"
                onClick={() => setSelectedTier(plan.tier)}
                className={`group relative flex flex-col rounded-2xl border p-5 sm:p-6 text-left transition-all duration-300 card-lift ${
                  isSelected
                    ? plan.highlighted
                      ? "border-[#0099ff]/40 bg-[#0099ff]/6 ring-1 ring-[#0099ff]/15 shadow-[0_0_30px_rgba(0,153,255,0.06)]"
                      : "border-white/12 bg-white/[0.04] ring-1 ring-white/8"
                    : "border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                {/* 徽章 */}
                {(plan.highlighted || isCurrent) && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {plan.highlighted && (
                      <span className="rounded-full bg-[#0099ff]/15 px-2.5 py-0.5 text-[10px] font-medium text-[#0099ff] tracking-wide">
                        推荐
                      </span>
                    )}
                    {isCurrent && (
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] text-white/30">
                        当前
                      </span>
                    )}
                  </div>
                )}

                {/* 图标 + 名称 */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isSelected ? "bg-[#0099ff]/15 text-[#0099ff]" : "bg-white/[0.04] text-white/25 group-hover:text-white/40"
                  }`}>
                    <PlanIcon tier={plan.tier} className="h-4 w-4" />
                  </div>
                  <span className="text-[15px] font-semibold tracking-tight">{plan.nameZh}</span>
                </div>

                {/* 价格 */}
                <div className="mb-4">
                  {plan.price === 0 ? (
                    <span className="text-[32px] font-bold tracking-tight">¥0</span>
                  ) : (
                    <span className="text-[32px] font-bold tracking-tight">
                      ¥{plan.price}<span className="text-[13px] font-normal text-white/20">/月</span>
                    </span>
                  )}
                </div>

                {/* 配额 */}
                <div className="mb-4 flex items-center gap-3 text-[11px] text-white/25">
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.03] px-2 py-0.5">
                    每日 {plan.dailyLimit} 次
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.03] px-2 py-0.5">
                    每周 {plan.weeklyLimit === Infinity ? "∞" : plan.weeklyLimit} 次
                  </span>
                </div>

                {/* 特性列表 */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] text-white/35">
                      <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-white/15" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* 选中指示器 */}
                <div className={`mt-4 h-0.5 rounded-full transition-colors ${
                  isSelected ? "bg-[#0099ff]/30" : "bg-transparent"
                }`} />
              </button>
            );
          })}
        </div>
      </section>

      {/* ====== 付款区域 ====== */}
      <section className="mx-auto max-w-3xl px-4 pb-24 sm:pb-32">
        {!user ? (
          /* 未登录 */
          <div className="rounded-2xl border border-white/6 bg-[#070707] p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
              <Smartphone className="h-6 w-6 text-white/15" />
            </div>
            <p className="text-[15px] text-white/50 mb-6">登录后即可提交付款凭证，升级你的方案</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full bg-[#0099ff] px-6 py-2.5 text-[14px] font-medium text-white hover:bg-[#0099ff]/90 transition-colors btn-press">
                立即登录 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-6 py-2.5 text-[14px] font-medium text-white/60 hover:bg-white/[0.10] hover:text-white/80 transition-colors">
                免费注册
              </Link>
            </div>
          </div>
        ) : selectedTier === "free" ? (
          /* 免费方案 */
          <div className="rounded-2xl border border-white/5 bg-[#070707] p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/[0.06]">
              <Check className="h-5 w-5 text-emerald-400/40" />
            </div>
            <p className="text-[14px] text-white/30">免费版无需付款，注册即享每日 3 次、每周 7 次视频分析</p>
          </div>
        ) : pendingSub ? (
          /* 审核中 */
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/[0.06]">
              <Clock className="h-6 w-6 text-amber-400/50" />
            </div>
            <h3 className="text-[17px] font-semibold text-amber-300/80 mb-2">审核中</h3>
            <p className="text-[13px] text-white/30 max-w-sm mx-auto text-balance">
              你已提交 <span className="text-white/50 font-medium">{PLAN_CONFIGS.find((p) => p.tier === pendingSub.tier)?.nameZh}</span> 方案，
              管理员将在 24 小时内审核，请耐心等待。
            </p>
          </div>
        ) : (
          /* 付费方案 → 收款码 + 表单 */
          <div className="rounded-2xl border border-white/6 bg-[#070707] overflow-hidden">
            {/* 方案摘要条 */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <PlanIcon tier={selectedTier} className="h-4 w-4 text-[#0099ff]" />
              <span className="text-[14px] font-semibold">{selectedPlan.nameZh}</span>
              <span className="text-[12px] text-white/25">
                ¥{selectedPlan.price}/月 · 日 {selectedPlan.dailyLimit} 次 · 周 {selectedPlan.weeklyLimit} 次
              </span>
            </div>

            <div className="p-5 sm:p-6">
              {/* 桌面端：QR码和表单并排 */}
              <div className="grid sm:grid-cols-[1.2fr_1fr] gap-6 sm:gap-10">
                {/* 左侧：收款码 */}
                <div className="space-y-4">
                  <p className="text-[11px] font-medium text-white/20 tracking-wider uppercase">扫码支付</p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* 微信 */}
                    <div className="text-center group">
                      <div className="relative mx-auto mb-2 aspect-square w-full max-w-[200px] sm:max-w-[240px] rounded-2xl border border-[#07c160]/15 bg-[#07c160]/[0.03] overflow-hidden transition-all group-hover:border-[#07c160]/25">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/wechat-pay.jpg"
                          alt="微信收款码"
                          className="w-full h-full object-contain p-4"
                          onError={(e) => {
                            const el = e.currentTarget; el.style.display = "none";
                            const p = el.parentElement;
                            if (p) p.innerHTML = '<span class="flex items-center justify-center h-full text-[11px] text-white/12 text-center px-2">微信<br/>收款码</span>';
                          }}
                        />
                      </div>
                      <span className="text-[13px] font-medium text-[#07c160]/80">微信支付</span>
                    </div>
                    {/* 支付宝 */}
                    <div className="text-center group">
                      <div className="relative mx-auto mb-2 aspect-square w-full max-w-[200px] sm:max-w-[240px] rounded-2xl border border-[#1677ff]/15 bg-[#1677ff]/[0.03] overflow-hidden transition-all group-hover:border-[#1677ff]/25">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/alipay.jpg"
                          alt="支付宝收款码"
                          className="w-full h-full object-contain p-4"
                          onError={(e) => {
                            const el = e.currentTarget; el.style.display = "none";
                            const p = el.parentElement;
                            if (p) p.innerHTML = '<span class="flex items-center justify-center h-full text-[11px] text-white/12 text-center px-2">支付宝<br/>收款码</span>';
                          }}
                        />
                      </div>
                      <span className="text-[13px] font-medium text-[#1677ff]/80">支付宝</span>
                    </div>
                  </div>
                </div>

                {/* 右侧：表单 */}
                <div className="space-y-5">
                  <p className="text-[11px] font-medium text-white/20 tracking-wider uppercase">提交凭证</p>

                  {/* 步骤说明 */}
                  <div className="space-y-3">
                    {[
                      { num: "01", text: <>扫描左侧收款码，支付 <span className="text-white/50 font-medium">¥{selectedPlan.price}</span></> },
                      { num: "02", text: "在微信/支付宝账单中复制交易单号" },
                      { num: "03", text: "粘贴至下方输入框并提交，等待审核" },
                    ].map((step) => (
                      <div key={step.num} className="flex items-start gap-3">
                        <span className="font-mono text-[11px] font-semibold text-[#0099ff]/40 tabular-nums shrink-0 mt-0.5">
                          {step.num}
                        </span>
                        <span className="text-[13px] text-white/35">{step.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* 交易单号输入 */}
                  <div>
                    <input
                      id="txn-id"
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="粘贴微信/支付宝交易单号..."
                      className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder:text-white/12 focus:border-[#0099ff]/30 focus:outline-none focus:ring-2 focus:ring-[#0099ff]/10 transition-all input-glow"
                    />
                  </div>

                  {/* 提交按钮 */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="w-full rounded-xl py-3 text-[14px] font-semibold transition-all btn-press bg-[#0099ff] text-white hover:bg-[#0099ff]/90 shadow-[0_4px_20px_rgba(0,153,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />提交中...</span>
                    ) : (
                      `确认提交 · ¥${selectedPlan.price}/月`
                    )}
                  </button>

                  {/* 结果反馈 */}
                  {submitResult && (
                    <div className={`flex items-start gap-2.5 rounded-xl p-3.5 text-[13px] ${
                      submitResult.ok
                        ? "bg-emerald-500/8 text-emerald-400 border border-emerald-500/10"
                        : "bg-red-500/8 text-red-400 border border-red-500/10"
                    }`}>
                      {submitResult.ok
                        ? <Check className="h-4 w-4 shrink-0 mt-0.5" />
                        : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      }
                      {submitResult.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
