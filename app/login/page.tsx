"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshProfile } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json() as { ok: boolean; error?: { message?: string } };
    if (!payload.ok) {
      setError(payload.error?.message ?? "登录失败，请稍后重试。");
      setLoading(false);
      return;
    }

    await refreshProfile();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 pb-20 md:pb-16 text-white">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-white/60 transition-colors hover:text-white"
        >
          <Image src="/logo.png" alt="Teach Player" width={28} height={28} className="rounded" />
          Teach Player
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg text-white">
              登录 Teach Player
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-[13px] font-medium text-white/70"
                >
                  邮箱
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-[13px] font-medium text-white/70"
                >
                  密码
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                <LogIn className="h-4 w-4" />
                {loading ? "登录中…" : "登录"}
              </Button>
              <p className="text-center text-[13px] text-white/40">
                还没有账号？{" "}
                <Link
                  href="/register"
                  className="text-[#0099ff] transition-colors hover:text-[#0099ff]/80"
                >
                  立即注册
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
