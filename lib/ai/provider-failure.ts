import { ExternalServiceError } from "@/lib/utils/http";

export type AiProviderFailure = {
  code: string;
  message: string;
  status: number;
};

/**
 * Converts an upstream AI-provider failure into a safe, actionable API error.
 * This deliberately omits provider response bodies so credentials and internal
 * billing details never reach the browser.
 */
export function getAiProviderFailure(error: unknown): AiProviderFailure | null {
  if (!(error instanceof ExternalServiceError) || !error.service.startsWith("AI provider")) {
    return null;
  }

  switch (error.status) {
    case 401:
      return {
        code: "ai_credentials_invalid",
        message: "AI 服务认证失败。请检查服务器中的 AI API Key 和模型配置。",
        status: error.status,
      };
    case 403:
      if (["insufficient_quota", "quota_exhausted", "billing_required"].includes(error.code ?? "")) {
        return {
          code: "ai_quota_exhausted",
          message: "AI 服务免费额度已用尽。请在供应商控制台充值，或关闭“仅使用免费额度”后重试。",
          status: 403,
        };
      }
      return {
        code: "ai_credentials_invalid",
        message: "AI 服务认证失败。请检查服务器中的 AI API Key 和模型配置。",
        status: error.status,
      };
    case 402:
      return {
        code: "ai_quota_exhausted",
        message: "AI 服务额度不足。请为当前 AI 账户充值，或在服务器中配置可用的备用模型后重试。",
        status: 402,
      };
    case 429:
      return {
        code: "ai_rate_limited",
        message: "AI 服务暂时限流，请稍后重试。",
        status: 429,
      };
    default:
      return {
        code: "ai_provider_unavailable",
        message: "AI 服务暂时不可用，请稍后重试。",
        status: 503,
      };
  }
}
