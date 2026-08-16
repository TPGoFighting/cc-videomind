"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { Check, Clock3, Copy, Loader2, ShieldCheck, X } from "lucide-react";
import { gsap } from "gsap";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-context";
import { DyPayCheckout } from "@/components/dypay-checkout";

type Tier = "pro" | "max";

type Plan = {
  tier: Tier;
  amountCny: number;
  accessDays: number;
  analysisLimit: number;
};

type BillingData = {
  dypayAvailable?: boolean;
  manualPayment: { available: boolean; qrImageUrl?: string; receiverHint?: string | null };
  plans: Plan[];
  currentSubscription: { tier: "free" | Tier; expiresAt: string | null };
  pending: {
    tier: Tier;
    status: "pending";
    amountCny: number;
    accessDays: number;
    createdAt: string;
  } | null;
};

type RefundData = {
  refund: null | {
    paymentId: string;
    tier: Tier;
    amountCny: number | null;
    requestedAt: string | null;
    refundedAt: string | null;
    eligibility: { eligible: boolean; reason: string | null };
  };
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" }).format(new Date(iso));
}

export default function BillingPage() {
  const { user, loading, refreshProfile } = useAuth();
  const pageRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<BillingData | null>(null);
  const [refund, setRefund] = useState<RefundData["refund"]>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadBilling = useCallback(async () => {
    const [response, refundResponse] = await Promise.all([
      fetch("/api/payment/submit", { cache: "no-store" }),
      fetch("/api/payment/refund-request", { cache: "no-store" }),
    ]);
    const payload = await response.json() as { data?: BillingData; error?: { message?: string } };
    const refundPayload = await refundResponse.json() as { data?: RefundData; error?: { message?: string } };
    if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "无法加载付款信息。");
    if (!refundResponse.ok || !refundPayload.data) throw new Error(refundPayload.error?.message ?? "无法加载退款状态。");
    const billingData = payload.data;
    setData(billingData);
    setRefund(refundPayload.data.refund);
    setSelectedTier((current) => current ?? billingData.pending?.tier ?? null);
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      void loadBilling().catch((error: unknown) => {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "无法加载付款信息。" });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBilling, user]);

  useGSAP(() => {
    if (!pageRef.current) return;
    gsap.fromTo(
      pageRef.current.querySelectorAll("[data-billing-reveal]"),
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.58, stagger: 0.08, ease: "power3.out" },
    );
    if (cardsRef.current) {
      gsap.fromTo(
        cardsRef.current.children,
        { opacity: 0, y: 28, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.62, stagger: 0.12, ease: "power3.out", delay: 0.16 },
      );
    }
  }, { scope: pageRef, dependencies: [Boolean(data)] });

  const selectedPlan = useMemo(
    () => data?.plans.find((plan) => plan.tier === selectedTier) ?? null,
    [data?.plans, selectedTier],
  );

  async function copyReceiverHint() {
    if (!data?.manualPayment.receiverHint || !navigator.clipboard) return;
    await navigator.clipboard.writeText(data.manualPayment.receiverHint);
    setMessage({ type: "success", text: "收款信息已复制。" });
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlan || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedPlan.tier, transactionId, acceptedTerms }),
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "提交失败，请稍后重试。");
      setTransactionId("");
      setAcceptedTerms(false);
      await loadBilling();
      setMessage({ type: "success", text: "付款申请已提交。我们会在 1 个工作日内审核，并以站内状态为准。" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "提交失败，请稍后重试。" });
    } finally {
      setBusy(false);
    }
  }

  async function cancelPending() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payment/submit", { method: "DELETE" });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "取消失败，请稍后重试。");
      await loadBilling();
      setSelectedTier(null);
      setMessage({ type: "success", text: "待审核付款申请已取消，未开通任何权益。" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "取消失败，请稍后重试。" });
    } finally {
      setBusy(false);
    }
  }

  async function requestRefund() {
    if (busy || !refund?.eligibility.eligible) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payment/refund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "退款申请提交失败，请稍后重试。");
      await loadBilling();
      setMessage({ type: "success", text: "退款申请已提交。我们会在 1 个工作日内回应；退款到账仍以线下处理结果为准。" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "退款申请提交失败，请稍后重试。" });
    } finally {
      setBusy(false);
    }
  }

  if (!loading && !user) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#080b0f] text-white">
        <Navbar />
        <section className="mx-auto flex min-h-screen max-w-5xl items-center px-5 pt-14 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm text-[#8fc6ff]">内测套餐</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">先登录，再查看私密付款信息。</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/55">收款码和订单审核仅面向已登录用户开放，付款前会完整展示价格、权益、审核方式和退款规则。</p>
            <Link href="/login?next=/billing" className="mt-9 inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-sm font-semibold text-[#080b0f] transition-transform hover:-translate-y-0.5">登录后查看</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main ref={pageRef} className="min-h-screen overflow-x-hidden bg-[#080b0f] pb-24 pt-14 text-white">
      <Navbar />
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
        <div data-billing-reveal className="flex flex-col justify-between gap-8 border-b border-white/10 pb-10 md:flex-row md:items-end">
          <div className="max-w-5xl">
            <p className="text-sm font-medium text-[#8fc6ff]">内测套餐</p>
            <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">把学习配额留给真正会回看的视频。</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/55">没有自动续费。付款后提交支付宝交易单号，由人工审核开通；付款截图无需上传，也不应发送到公开渠道。</p>
          </div>
          {data && data.currentSubscription.tier !== "free" && (
            <div className="rounded-2xl border border-[#8fc6ff]/20 bg-[#0099ff]/10 px-5 py-4 text-sm text-[#cfeaff]">
              当前为 {data.currentSubscription.tier === "pro" ? "Pro" : "Max"}，有效至 {formatDate(data.currentSubscription.expiresAt)}
            </div>
          )}
        </div>

        {message && <p data-billing-reveal className={`mt-8 rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-red-400/20 bg-red-400/10 text-red-200"}`}>{message.text}</p>}

        {!data ? (
          <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/45" /></div>
        ) : (
          <>
            <div ref={cardsRef} className="mt-12 grid grid-flow-dense gap-4 md:grid-cols-2">
              {data.plans.map((plan) => {
                const selected = selectedTier === plan.tier;
                const isPro = plan.tier === "pro";
                return (
                  <button
                    key={plan.tier}
                    type="button"
                    disabled={Boolean(data.pending)}
                    onClick={() => setSelectedTier(plan.tier)}
                    className={`group min-h-64 overflow-hidden rounded-3xl border p-7 text-left transition-all duration-500 ${selected ? "border-[#8fc6ff]/70 bg-[#0d2235]" : "border-white/10 bg-white/[0.035] hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.06]"} disabled:cursor-default disabled:hover:translate-y-0`}
                  >
                    <div className="flex items-start justify-between gap-5">
                      <span className="text-xl font-semibold tracking-[-0.035em]">{isPro ? "Pro" : "Max"}</span>
                      {isPro && <span className="rounded-full border border-[#8fc6ff]/25 bg-[#0099ff]/10 px-3 py-1 text-xs text-[#8fc6ff]">推荐</span>}
                    </div>
                    <div className="mt-10 flex items-end gap-2"><strong className="text-5xl tracking-[-0.06em]">¥{plan.amountCny}</strong><span className="mb-1.5 text-sm text-white/45">/{plan.accessDays} 天</span></div>
                    <p className="mt-5 text-sm leading-7 text-white/60">{plan.accessDays} 天内总计 {plan.analysisLimit} 次不同视频分析，含完整学习与复习闭环。</p>
                    <div className="mt-7 flex items-center gap-2 text-sm font-medium text-white/80"><Check className="h-4 w-4 text-[#8fc6ff]" />人工审核后开通</div>
                  </button>
                );
              })}
            </div>

            {data.pending ? (
              <section data-billing-reveal className="mt-16 rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-7 sm:p-9">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-amber-100"><Clock3 className="h-5 w-5" />等待人工审核</div>
                    <p className="mt-3 text-sm leading-7 text-amber-100/70">你提交了 {data.pending.tier === "pro" ? "Pro" : "Max"} ¥{data.pending.amountCny} 的付款申请。请勿重复付款；我们将在 1 个工作日内审核。</p>
                    <p className="mt-2 text-xs text-amber-100/45">提交时间：{formatDate(data.pending.createdAt)}</p>
                  </div>
                  <button type="button" disabled={busy} onClick={cancelPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-100/25 px-4 text-sm font-medium text-amber-50 transition-colors hover:bg-amber-100/10 disabled:opacity-50"><X className="h-4 w-4" />取消申请</button>
                </div>
              </section>
            ) : selectedPlan && (
              <section data-billing-reveal className="mt-16 grid gap-8 rounded-3xl border border-white/10 bg-white/[0.035] p-7 sm:p-9 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="flex flex-col justify-between">
                  <div>
                    <p className="text-sm text-white/45">扫码支付</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">¥{selectedPlan.amountCny} · {selectedPlan.accessDays} 天</h2>
                    <p className="mt-4 text-sm leading-7 text-white/55">推荐使用抖音扫码支付，付款成功后权益自动到账、无需等待审核；也可使用备选的支付宝人工转账审核通道。</p>
                  </div>
                  <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/55"><ShieldCheck className="mb-3 h-5 w-5 text-[#8fc6ff]" />付款不会自动续费；开通后起算 {selectedPlan.accessDays} 天。未完成任何 AI 分析可在 7 天内申请全额退款。</div>
                </div>
                <div className="space-y-6">
                  {data.dypayAvailable && (
                    <DyPayCheckout
                      tier={selectedPlan.tier}
                      amountCny={selectedPlan.amountCny}
                      onPaid={() => { void refreshProfile(); void loadBilling(); }}
                    />
                  )}
                  {data.manualPayment.available && data.manualPayment.qrImageUrl ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                      <div className="grid gap-6 sm:grid-cols-[11rem_1fr] sm:items-start">
                        <div className="rounded-2xl bg-white p-3 shadow-2xl shadow-black/30"><img src={data.manualPayment.qrImageUrl} alt="支付宝收款码" className="aspect-square w-full object-contain" /></div>
                        <form onSubmit={submitPayment} className="space-y-4">
                          <div className="flex items-center justify-between gap-4"><p className="text-sm font-medium text-white/70">备选：人工转账审核</p>{data.manualPayment.receiverHint && <button type="button" onClick={copyReceiverHint} className="inline-flex items-center gap-1 text-xs text-[#8fc6ff] hover:text-white"><Copy className="h-3.5 w-3.5" />复制收款信息</button>}</div>
                          {data.manualPayment.receiverHint && <p className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-white/55">{data.manualPayment.receiverHint}</p>}
                          <label className="block text-sm text-white/60">支付宝交易单号<input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="仅数字、字母、下划线或连字符" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#8fc6ff]" required minLength={6} maxLength={100} pattern="[A-Za-z0-9_-]+" /></label>
                          <label className="flex cursor-pointer items-start gap-3 text-xs leading-6 text-white/55"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 rounded border-white/25 bg-black/30 accent-[#0099ff]" required />我已阅读并同意 <Link href="/terms" className="text-[#8fc6ff] hover:text-white">服务条款</Link> 与 <Link href="/support" className="text-[#8fc6ff] hover:text-white">付款审核和退款说明</Link>。</label>
                          <button type="submit" disabled={busy || !acceptedTerms || !transactionId.trim()} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "提交人工审核申请"}</button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    !data.dypayAvailable && (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm leading-7 text-white/55">当前未配置收款渠道，新的付款申请已暂停。请稍后再试，不要向公开渠道或个人私信发送付款信息。</div>
                    )
                  )}
                </div>
              </section>
            )}

            {refund && (
              <section data-billing-reveal className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-7 sm:p-9">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                  <div className="max-w-2xl">
                    <h2 className="text-xl font-semibold tracking-[-0.035em]">退款状态</h2>
                    {refund.refundedAt ? (
                      <p className="mt-3 text-sm leading-7 text-emerald-100/75">该订单已被管理员标记为线下退款完成。权益已恢复为免费版；如到账异常，请通过站内支持继续处理。</p>
                    ) : refund.requestedAt ? (
                      <p className="mt-3 text-sm leading-7 text-amber-100/75">退款申请已提交，等待人工处理。请勿重复申请；我们会在 1 个工作日内回应。</p>
                    ) : refund.eligibility.eligible ? (
                      <p className="mt-3 text-sm leading-7 text-white/55">这笔已开通订单仍在 7 天退款期内，且开通后尚未完成 AI 视频分析。申请只会创建人工工单，不会自动发起转账。</p>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-white/45">当前订单不满足自动退款资格。若核心服务故障导致无法使用，请通过支持页提交个案说明。</p>
                    )}
                  </div>
                  {refund.eligibility.eligible && (
                    <button type="button" disabled={busy} onClick={requestRefund} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200/30 px-4 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-100/10 disabled:opacity-50">申请退款</button>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        <div data-billing-reveal className="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/45"><Link href="/terms" className="hover:text-white">服务条款</Link><Link href="/support" className="hover:text-white">付款审核与退款</Link><button type="button" onClick={() => void refreshProfile()} className="hover:text-white">刷新账户状态</button></div>
      </section>
    </main>
  );
}
