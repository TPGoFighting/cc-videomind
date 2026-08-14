"use client";

import { Suspense, useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeReturnPath } from "@/lib/navigation";

const BENEFITS = ["保存词句与笔记", "跨设备继续学习", "进入今日复习"] as const;

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = normalizeReturnPath(searchParams.get("next"));
  const registerHref = returnTo === "/" ? "/register" : `/register?next=${encodeURIComponent(returnTo)}`;
  const { refreshProfile } = useAuth();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: { message?: string } };
      if (!payload.ok) {
        setError(payload.error?.message ?? "登录失败，请检查邮箱和密码后重试。");
        return;
      }

      await refreshProfile();
      router.push(returnTo);
      router.refresh();
    } catch {
      setError("暂时无法登录，请检查网络后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="继续学习"
      title="把今天学到的，留到明天"
      description="登录只用于保存你的学习进度。公开视频仍可先体验，等你要收藏、写笔记或复习时再回来。"
      benefits={BENEFITS}
    >
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">欢迎回来</h2>
        <p className="mt-2 text-sm text-[var(--tp-text-muted)]">
          {returnTo === "/" ? "登录后回到首页。" : "登录后会返回刚才的学习位置。"}
        </p>
      </div>

      <form onSubmit={handleSubmit} aria-busy={loading} className="mt-7 space-y-5">
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium text-[var(--tp-text-secondary)]">邮箱</label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            aria-describedby={error ? errorId : undefined}
            className="h-14"
          />
        </div>

        <PasswordField
          id="login-password"
          label="密码"
          value={password}
          onChange={setPassword}
          placeholder="输入密码"
          autoComplete="current-password"
          describedBy={error ? errorId : undefined}
          invalid={Boolean(error)}
        />

        {error ? (
          <p id={errorId} role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 px-3.5 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="accent" disabled={loading} className="h-14 w-full text-base">
          <LogIn className="h-4 w-4" aria-hidden />
          {loading ? "登录中…" : "登录并继续"}
        </Button>

        <p className="text-center text-sm text-[var(--tp-text-muted)]">
          还没有账号？{" "}
          <Link href={registerHref} className="inline-flex min-h-11 items-center text-[var(--tp-accent)] hover:text-[var(--tp-accent-hover)]">
            创建账户
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--tp-bg)]" aria-label="正在加载登录页面" />}>
      <LoginForm />
    </Suspense>
  );
}
