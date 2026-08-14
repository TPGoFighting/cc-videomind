"use client";

import { Suspense, useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeReturnPath } from "@/lib/navigation";

const BENEFITS = ["保留视频出处", "同步收藏与笔记", "生成个人复习队列"] as const;

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const passwordHintId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = normalizeReturnPath(searchParams.get("next"));
  const loginHref = returnTo === "/" ? "/login" : `/login?next=${encodeURIComponent(returnTo)}`;
  const { refreshProfile } = useAuth();
  const passwordMismatch = Boolean(error) && password !== confirm;
  const weakPassword = Boolean(error) && password.length < 8;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("两次输入的密码不一致，请重新确认。");
      return;
    }
    if (password.length < 8) {
      setError("密码至少需要 8 位。");
      return;
    }
    if (!acceptedPolicies) {
      setError("请先阅读并同意服务条款与隐私政策。当前隐私政策会明确标出测试版尚未完成的数据权利。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: { message?: string } };
      if (!payload.ok) {
        setError(payload.error?.message ?? "暂时无法创建账户，请稍后重试。");
        return;
      }

      await refreshProfile();
      router.push(returnTo);
      router.refresh();
    } catch {
      setError("暂时无法创建账户，请检查网络后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="建立学习记录"
      title="保存一次，明天继续"
      description="创建账户后，词句、笔记和来源时间点会进入同一个学习队列。注册不会在此步骤收集支付信息。"
      benefits={BENEFITS}
    >
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">创建账户</h2>
        <p className="mt-2 text-sm text-[var(--tp-text-muted)]">只需要邮箱和密码。</p>
      </div>

      <form onSubmit={handleSubmit} aria-busy={loading} className="mt-7 space-y-5">
        <div className="space-y-2">
          <label htmlFor="register-email" className="text-sm font-medium text-[var(--tp-text-secondary)]">邮箱</label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={false}
            className="h-14"
          />
        </div>

        <div>
          <PasswordField
            id="register-password"
            label="密码"
            value={password}
            onChange={setPassword}
            placeholder="至少 8 位"
            autoComplete="new-password"
            describedBy={`${passwordHintId}${error ? ` ${errorId}` : ""}`}
            invalid={passwordMismatch || weakPassword}
          />
          <p id={passwordHintId} className="mt-2 text-sm text-[var(--tp-text-faint)]">至少 8 位，请避免使用其他网站的相同密码。</p>
        </div>

        <PasswordField
          id="register-confirm"
          label="确认密码"
          value={confirm}
          onChange={setConfirm}
          placeholder="再次输入密码"
          autoComplete="new-password"
          describedBy={error ? errorId : undefined}
          invalid={passwordMismatch}
        />

        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-[var(--tp-border)] bg-white/[0.025] px-3.5 py-3 text-sm leading-6 text-[var(--tp-text-secondary)]">
          <input
            type="checkbox"
            checked={acceptedPolicies}
            onChange={(event) => setAcceptedPolicies(event.target.checked)}
            aria-invalid={Boolean(error?.startsWith("请先阅读")) || undefined}
            aria-describedby={error?.startsWith("请先阅读") ? errorId : undefined}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--tp-accent)]"
          />
          <span>
            我已阅读并同意{" "}
            <Link href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-[var(--tp-accent)] hover:text-[var(--tp-accent-hover)]">服务条款</Link>
            {" "}与{" "}
            <Link href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-[var(--tp-accent)] hover:text-[var(--tp-accent-hover)]">隐私政策</Link>
            。
          </span>
        </label>

        {error ? (
          <p id={errorId} role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 px-3.5 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="accent" disabled={loading} className="h-14 w-full text-base">
          <UserPlus className="h-4 w-4" aria-hidden />
          {loading ? "创建中…" : "创建账户并继续"}
        </Button>

        <p className="text-center text-sm text-[var(--tp-text-muted)]">
          已有账号？{" "}
          <Link href={loginHref} className="inline-flex min-h-11 items-center text-[var(--tp-accent)] hover:text-[var(--tp-accent-hover)]">
            直接登录
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--tp-bg)]" aria-label="正在加载注册页面" />}>
      <RegisterForm />
    </Suspense>
  );
}
