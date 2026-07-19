import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { OpenAiCompatibleProvider, GeminiProvider } from "@/lib/ai/provider";
import { readJson } from "@/lib/utils/api";
import { withSecurity } from "@/lib/security/middleware";

const TestSchema = z.object({
  provider: z.string().min(1, "请选择 AI 提供商"),
  apiKey: z.string().min(1, "API Key 不能为空"),
  baseUrl: z.string().optional(),
  model: z.string().min(1, "模型名不能为空"),
});

/**
 * POST — 测试 AI 连接。用 defineWords(["test"]) 发一条轻量请求验证连通性。
 */
export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 16 * 1024,
    scope: "admin-settings-test",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => {
      const userId = await getAuthenticatedUserId(request);
      if (!userId) {
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
      }

      const parsed = await readJson(request, TestSchema);
      if (!parsed.ok) return parsed.response;

      const { provider, apiKey, baseUrl, model } = parsed.data;

      try {
        if (provider === "gemini") {
          const p = new GeminiProvider(apiKey, model);
          await p.defineWords({ lemmas: ["test"] });
        } else {
          // openai-compatible / deepseek / 自定义 都走 OpenAI 兼容协议
          const p = new OpenAiCompatibleProvider(
            apiKey,
            baseUrl || "https://api.openai.com/v1",
            model,
          );
          await p.defineWords({ lemmas: ["test"] });
        }

        return NextResponse.json({
          ok: true,
          message: "连接成功！AI 服务可正常访问。",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知错误";
        return NextResponse.json({ ok: false, error: `连接失败: ${msg}` });
      }
  });
}

