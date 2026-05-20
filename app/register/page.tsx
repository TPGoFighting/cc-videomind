"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== confirm) {
      setError("两次输入的密码不一致，请重新输入。");
      return;
    }

    if (password.length < 8) {
      setError("密码长度至少需要 8 位。");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
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
              注册 Teach Player
            </CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-center">
                <p className="text-[14px] leading-relaxed text-white/70">
                  我们已向 <span className="font-semibold text-white">{email}</span>{" "}
                  发送了一封验证邮件，请点击邮件中的链接完成注册。
                </p>
                <Button
                  type="button"
                  onClick={() => router.push("/login")}
                  variant="secondary"
                  className="w-full"
                >
                  前往登录
                </Button>
              </div>
            ) : (
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
                    placeholder="至少 8 位"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="confirm"
                    className="text-[13px] font-medium text-white/70"
                  >
                    确认密码
                  </label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="再次输入密码"
                    required
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={loading} className="w-full">
                  <UserPlus className="h-4 w-4" />
                  {loading ? "注册中…" : "注册"}
                </Button>
                <p className="text-center text-[13px] text-white/40">
                  已有账号？{" "}
                  <Link
                    href="/login"
                    className="text-[#0099ff] transition-colors hover:text-[#0099ff]/80"
                  >
                    立即登录
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
