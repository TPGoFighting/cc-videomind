import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { getAppSettings, isAdmin } from "@/lib/supabase/admin";
import { OpenAiCompatibleProvider, GeminiProvider } from "@/lib/ai/provider";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";
import { readJson } from "@/lib/utils/api";
import { withSecurity } from "@/lib/security/middleware";

const TestSchema = z.object({
  provider: z.string().min(1, "请选择 AI 提供商"),
  apiKey: z.string().optional(),
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
      if (!(await isAdmin(userId))) {
        return NextResponse.json({ error: "仅管理员可测试全局 AI 配置" }, { status: 403 });
      }

      const parsed = await readJson(request, TestSchema);
      if (!parsed.ok) return parsed.response;

      const stored = await getAppSettings();
      const provider = parsed.data.provider || stored.ai_provider || "openai-compatible";
      const apiKey = parsed.data.apiKey?.trim() || stored.ai_api_key || "";
      const baseUrl = parsed.data.baseUrl?.trim() || stored.ai_api_base_url || "https://api.openai.com/v1";
      const model = parsed.data.model || stored.ai_model || "deepseek-v4-flash";
      if (!apiKey) {
        return NextResponse.json({ ok: false, error: "API Key 不能为空" }, { status: 400 });
      }

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
        const providerFailure = getAiProviderFailure(err);
        return NextResponse.json({
          ok: false,
          error: providerFailure?.message ?? "连接失败：AI 服务暂时不可用，请检查配置。",
        });
      }
  });
}
