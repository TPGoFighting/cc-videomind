"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Loader2, RefreshCw, X } from "lucide-react";

type Tier = "pro" | "max";

type PayPhase = "creating" | "pending" | "paid" | "expired" | "error";

type OrderInfo = {
  orderId: string;
  codeUrl: string;
  amountTotal: number;
  tier: Tier;
};

type StatusResponse = {
  ok: boolean;
  data?: { status: string; codeUrl?: string | null; subscriptionExpiresAt?: string | null };
  error?: { message?: string };
};

const POLL_INTERVAL_MS = 3000;

export function DyPayCheckout({
  tier,
  onPaid,
}: {
  tier: Tier;
  amountCny: number;
  onPaid?: () => void;
}) {
  const [phase, setPhase] = useState<PayPhase>("creating");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const createOrder = useCallback(async () => {
    setPhase("creating");
    setErrorMsg("");
    try {
      const res = await fetch("/api/dypay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = (await res.json()) as { ok: boolean; data?: OrderInfo; error?: { message?: string } };
      if (!json.ok || !json.data) {
        setErrorMsg(json.error?.message ?? "下单失败，请稍后重试。");
        setPhase("error");
        return;
      }
      setOrder(json.data);
      setPhase("pending");
    } catch {
      setErrorMsg("网络错误，请稍后重试。");
      setPhase("error");
    }
  }, [tier]);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void createOrder();
  }, [createOrder]);

  useEffect(() => {
    if (!order?.codeUrl) return;
    QRCode.toDataURL(order.codeUrl, { margin: 1, width: 224 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [order?.codeUrl]);

  useEffect(() => {
    if (phase !== "pending" || !order) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/dypay/order-status?orderId=${order.orderId}`, { cache: "no-store" });
        const json = (await res.json()) as StatusResponse;
        if (!json.ok || !json.data) return;
        if (json.data.status === "paid") {
          stopPolling();
          setPhase("paid");
          onPaid?.();
        } else if (json.data.status === "expired") {
          stopPolling();
          setPhase("expired");
        } else if (json.data.codeUrl && json.data.codeUrl !== order.codeUrl) {
          setOrder((prev) => (prev && json.data?.codeUrl ? { ...prev, codeUrl: json.data.codeUrl } : prev));
        }
      } catch {
        // 网络抖动忽略，下轮重试
      }
    };
    void poll();
    pollRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return stopPolling;
  }, [phase, order, onPaid, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setOrder(null);
    setQrDataUrl(null);
    setErrorMsg("");
    void createOrder();
  }, [createOrder, stopPolling]);

  if (phase === "creating") {
    return (
      <div className="rounded-2xl border border-[#8fc6ff]/20 bg-[#0099ff]/[0.07] p-6">
        <div className="flex flex-col items-center gap-4 py-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#8fc6ff]" />
          <p className="text-sm text-white/55">正在生成支付码…</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.07] p-6">
        <p className="text-sm font-semibold text-red-200">生成支付码失败</p>
        <p className="mt-2 text-sm text-red-200/70">{errorMsg}</p>
        <button
          type="button"
          onClick={() => void createOrder()}
          className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 px-3.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />重试
        </button>
      </div>
    );
  }

  if (phase === "pending" && order) {
    return (
      <div className="rounded-2xl border border-[#8fc6ff]/25 bg-[#0099ff]/[0.07] p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0 rounded-2xl bg-white p-3 shadow-2xl shadow-black/30">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="抖音支付二维码" width={224} height={224} />
            ) : (
              <div className="h-56 w-56 animate-pulse rounded bg-white/80" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#8fc6ff]">等待支付中</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">¥{(order.amountTotal / 100).toFixed(2)}</p>
            <p className="mt-3 text-sm leading-7 text-white/55">
              打开抖音 App「扫一扫」完成支付；付款成功后权益自动到账。
            </p>
            <p className="mt-1 text-xs leading-6 text-white/40">
              手机端可截图二维码后，用抖音「扫一扫 → 相册」识别。二维码约 2 分钟自动刷新，订单 15 分钟内有效。
            </p>
            <button
              type="button"
              onClick={() => { stopPolling(); setPhase("expired"); }}
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 px-3.5 text-xs font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />取消订单
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "paid") {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] p-6">
        <p className="text-sm font-semibold text-emerald-200">支付成功，权益已自动开通。</p>
        <p className="mt-2 text-sm leading-7 text-emerald-100/70">配额即刻生效；可刷新账户状态查看最新到期时间。</p>
      </div>
    );
  }

  // expired
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
      <p className="text-sm font-semibold text-amber-100">订单已过期（超过 15 分钟未支付）。</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-100/25 px-3.5 text-xs font-medium text-amber-50 transition-colors hover:bg-amber-100/10"
      >
        <RefreshCw className="h-3.5 w-3.5" />重新下单
      </button>
    </div>
  );
}
