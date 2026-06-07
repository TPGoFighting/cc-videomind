/**
 * AI Provider Registry — 多模型适配器 + 自动 fallback
 *
 * 策略：
 *   1. 优先用配置的主模型
 *   2. 失败时按优先级回退到备选模型
 *   3. 所有模型共享同一 baseUrl（MaaS 平台），只切换 model 名
 */

const FALLBACK_MODELS = [
  "deepseek-ai/DeepSeek-V3",
  "deepseek-ai/DeepSeek-R1",
  "Qwen/Qwen2.5-72B-Instruct",
  "THUDM/glm-4-9b-chat"
] as const;

export function getModelFallbackChain(primaryModel: string): string[] {
  // 把主模型放最前面，去重
  const chain = [primaryModel];
  for (const m of FALLBACK_MODELS) {
    if (!chain.includes(m)) chain.push(m);
  }
  return chain;
}

export { FALLBACK_MODELS };
