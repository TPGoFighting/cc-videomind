import { z } from "zod";
import { getTencentUser } from "@/lib/tencent-auth";
import { updateAppSetting } from "@/lib/supabase/admin";
import { clearAiProviderCache, getEffectiveAiConfigResolution } from "@/lib/ai/provider";
import { errorResponse, successResponse } from "@/lib/utils/api";
import { recordAdminAuditEventSafely } from "@/lib/product/admin-audit";

const PROVIDERS = [
  {
    id: "glm",
    displayName: "智谱 GLM",
    defaultBaseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
    defaultModel: "glm-5.3-flash",
  },
  {
    id: "qwen",
    displayName: "阿里云百炼 Qwen",
    defaultBaseUrl: "https://ws-9zgy1043e1kpictf.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen3.7-plus",
  },
  {
    id: "deepseek",
    displayName: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-flash",
  },
  {
    id: "openai-compatible",
    displayName: "OpenAI 兼容",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  {
    id: "gemini",
    displayName: "Google Gemini",
    defaultBaseUrl: "",
    defaultModel: "gemini-2.5-flash",
  },
] as const;

const AI_ENDPOINTS = [
  { id: "transcript", label: "字幕解析", method: "POST", path: "/api/transcript", cache: "30 天", description: "抓取并持久化原始字幕，优先复用视频缓存。" },
  { id: "analysis", label: "视频分析", method: "POST", path: "/api/analyze", cache: "7 天", description: "生成结构化学习分析，并使用共享缓存与 single-flight。" },
  { id: "translation", label: "字幕翻译", method: "POST · SSE", path: "/api/translate-transcript", cache: "批次增量", description: "每 25 句一批，完成一批就返回并写入进度缓存。" },
  { id: "summary", label: "重点总结", method: "POST", path: "/api/generate-summary", cache: "7 天", description: "生成结构化 takeaways，命中 comprehensive 缓存时直接返回。" },
  { id: "moments", label: "关键时刻", method: "POST", path: "/api/generate-moments", cache: "7 天", description: "生成带时间点的 moments，失败时返回可识别错误。" },
  { id: "chat", label: "字幕问答", method: "POST", path: "/api/chat", cache: "按请求", description: "基于字幕上下文回答问题，并保留引用诊断。" },
  { id: "words", label: "词义解析", method: "POST", path: "/api/word-definitions", cache: "客户端", description: "批量请求词义、词性、例句等学习数据。" },
] as const;

const UpdateSchema = z.object({
  provider: z.string().trim().min(1).max(80).optional(),
  apiKey: z.string().trim().min(1).max(512).optional(),
  baseUrl: z.string().trim().url().max(500).optional(),
  model: z.string().trim().min(1).max(160).optional(),
}).strict();

export async function GET(request: Request) {
  const admin = await getTencentUser(request);
  if (!admin) return errorResponse("unauthorized", "请先登录。", 401);
  if (admin.role !== "admin") return errorResponse("forbidden", "仅管理员可访问 AI 控制台。", 403);

  const resolution = await getEffectiveAiConfigResolution();
  const apiKey = resolution.config.apiKey;
  return successResponse({
    config: {
      provider: resolution.config.provider,
      baseUrl: resolution.config.baseUrl,
      model: resolution.config.model,
      apiKeyMasked: maskApiKey(apiKey),
      hasApiKey: Boolean(apiKey),
      sources: resolution.sources,
      envOverrides: resolution.envOverrides,
    },
    providers: PROVIDERS,
    endpoints: AI_ENDPOINTS,
    cachePolicy: [
      { resource: "字幕", ttl: "30 天" },
      { resource: "分析 / 总结 / Moments", ttl: "7 天" },
      { resource: "翻译", ttl: "批次完成即写入，完整结果长期复用" },
    ],
  });
}

export async function PUT(request: Request) {
  const admin = await getTencentUser(request);
  if (!admin) return errorResponse("unauthorized", "请先登录。", 401);
  if (admin.role !== "admin") return errorResponse("forbidden", "仅管理员可修改 AI 配置。", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "请求体必须是有效 JSON。", 400);
  }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("invalid_input", "配置格式不正确，请检查提供商、Base URL 和模型名。", 400, parsed.error.flatten());
  }

  const updates: Array<[string, string]> = [];
  if (parsed.data.provider) updates.push(["ai_provider", parsed.data.provider]);
  if (parsed.data.apiKey) updates.push(["ai_api_key", parsed.data.apiKey]);
  if (parsed.data.baseUrl) updates.push(["ai_api_base_url", parsed.data.baseUrl]);
  if (parsed.data.model) updates.push(["ai_model", parsed.data.model]);
  if (updates.length === 0) return errorResponse("empty_update", "至少填写一项配置。", 400);

  try {
    for (const [key, value] of updates) {
      await updateAppSetting(key, value, admin.id);
    }
    clearAiProviderCache();
    await recordAdminAuditEventSafely(admin.id, {
      action: "settings_updated",
      targetType: "setting",
      targetId: updates.map(([key]) => key).join(","),
    });
    return successResponse({ ok: true, updatedKeys: updates.map(([key]) => key) });
  } catch (error) {
    console.error("[Admin:ControlPlane] 更新失败:", error instanceof Error ? error.message : error);
    return errorResponse("update_failed", "AI 配置保存失败，请稍后重试。", 500);
  }
}

function maskApiKey(key: string): string {
  if (!key) return "未设置";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}
