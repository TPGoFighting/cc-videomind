/**
 * AI Provider Registry — 多模型适配器 + 自动 fallback
 *
 * 策略：
 *   1. 优先用配置的主模型
 *   2. 失败时按优先级回退到备选模型
 *   3. 所有模型共享同一 baseUrl（MaaS 平台），只切换 model 名
 *
 * 回退链完全由调用方决定，不硬编码任何厂商的模型名：
 *   - 主模型由 config.model 传入
 *   - 备选模型由环境变量 AI_FALLBACK_MODELS（逗号分隔）提供，需匹配你配置的 baseUrl
 */

function parseFallbackModels(): string[] {
  const raw = (process.env.AI_FALLBACK_MODELS ?? "").trim();
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const m = part.trim();
    if (m && !seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

export function getModelFallbackChain(primaryModel: string): string[] {
  // 主模型放最前面，后面追加去重后的备选模型，保持顺序稳定
  const chain = [primaryModel];
  for (const m of parseFallbackModels()) {
    if (!chain.includes(m)) chain.push(m);
  }
  return chain;
}
