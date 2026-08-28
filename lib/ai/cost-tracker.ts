/**
 * 成本感知 AI 调用追踪
 *
 * 跟踪每个 Provider 的 token 成本，让用户选择质量 vs 成本权衡。
 *
 * @module ai/cost-tracker
 */

// ============================================================================
// 1. 成本配置
// ============================================================================

/** Provider 成本配置（每 1000 tokens） */
export interface ProviderCost {
  /** Provider 名称 */
  provider: string;

  /** 模型名称 */
  model: string;

  /** 输入成本（美元/1000 tokens） */
  inputCost: number;

  /** 输出成本（美元/1000 tokens） */
  outputCost: number;

  /** 质量分数（0-1） */
  qualityScore: number;

  /** 是否为推荐选项 */
  recommended?: boolean;
}

/** 预定义的 Provider 成本 */
export const PROVIDER_COSTS: ProviderCost[] = [
  // Anthropic
  {
    provider: "anthropic",
    model: "LongCat-2.0",
    inputCost: 0.002,
    outputCost: 0.008,
    qualityScore: 0.9,
    recommended: true,
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    inputCost: 0.003,
    outputCost: 0.015,
    qualityScore: 0.95,
  },

  // OpenAI
  {
    provider: "openai",
    model: "gpt-4o",
    inputCost: 0.005,
    outputCost: 0.015,
    qualityScore: 0.92,
  },
  {
    provider: "openai",
    model: "gpt-4o-mini",
    inputCost: 0.00015,
    outputCost: 0.0006,
    qualityScore: 0.75,
    recommended: true,
  },

  // DeepSeek
  {
    provider: "deepseek",
    model: "deepseek-chat",
    inputCost: 0.00014,
    outputCost: 0.00028,
    qualityScore: 0.85,
    recommended: true,
  },

  // Gemini
  {
    provider: "gemini",
    model: "gemini-2.0-flash",
    inputCost: 0.000075,
    outputCost: 0.0003,
    qualityScore: 0.8,
    recommended: true,
  },

  // 本地模型
  {
    provider: "local",
    model: "ollama-llama3",
    inputCost: 0,
    outputCost: 0,
    qualityScore: 0.6,
  },
];

// ============================================================================
// 2. 调用记录
// ============================================================================

/** 单次 AI 调用记录 */
export interface AiCallRecord {
  /** 调用 ID */
  id: string;

  /** 时间戳 */
  timestamp: Date;

  /** Provider */
  provider: string;

  /** 模型 */
  model: string;

  /** 功能类型 */
  feature: "analysis" | "chat" | "moments" | "summary" | "word-definitions" | "translation" | "comprehensive" | "grammar";

  /** 输入 token 数 */
  inputTokens: number;

  /** 输出 token 数 */
  outputTokens: number;

  /** 计算成本（美元） */
  cost: number;

  /** 耗时（毫秒） */
  elapsedMs: number;

  /** 是否成功 */
  success: boolean;

  /** 错误信息（如果失败） */
  error?: string;

  /** 用户 ID */
  userId?: string;

  /** 视频 ID */
  videoId?: string;
}

// ============================================================================
// 3. 成本追踪器
// ============================================================================

/** 成本追踪器类 */
export class CostTracker {
  private records: AiCallRecord[] = [];
  private maxRecords: number;

  constructor(maxRecords: number = 10000) {
    this.maxRecords = maxRecords;
  }

  /**
   * 记录 AI 调用
   */
  record(call: Omit<AiCallRecord, "id" | "timestamp" | "cost">): AiCallRecord {
    const costConfig = PROVIDER_COSTS.find(
      c => c.provider === call.provider && c.model === call.model
    );

    const cost = costConfig
      ? (call.inputTokens * costConfig.inputCost + call.outputTokens * costConfig.outputCost) / 1000
      : 0;

    const record: AiCallRecord = {
      ...call,
      id: this.generateId(),
      timestamp: new Date(),
      cost,
    };

    this.records.push(record);

    // 限制记录数量
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    return record;
  }

  /**
   * 获取统计信息
   */
  getStats(options: {
    startTime?: Date;
    endTime?: Date;
    provider?: string;
    feature?: string;
    userId?: string;
  } = {}): {
    totalCalls: number;
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    averageCost: number;
    averageLatency: number;
    successRate: number;
    byProvider: Record<string, { calls: number; cost: number }>;
    byFeature: Record<string, { calls: number; cost: number }>;
  } {
    let filtered = this.records;

    if (options.startTime) {
      filtered = filtered.filter(r => r.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      filtered = filtered.filter(r => r.timestamp <= options.endTime!);
    }
    if (options.provider) {
      filtered = filtered.filter(r => r.provider === options.provider);
    }
    if (options.feature) {
      filtered = filtered.filter(r => r.feature === options.feature);
    }
    if (options.userId) {
      filtered = filtered.filter(r => r.userId === options.userId);
    }

    const totalCalls = filtered.length;
    const totalCost = filtered.reduce((sum, r) => sum + r.cost, 0);
    const totalInputTokens = filtered.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = filtered.reduce((sum, r) => sum + r.outputTokens, 0);
    const averageCost = totalCalls > 0 ? totalCost / totalCalls : 0;
    const averageLatency = totalCalls > 0
      ? filtered.reduce((sum, r) => sum + r.elapsedMs, 0) / totalCalls
      : 0;
    const successRate = totalCalls > 0
      ? filtered.filter(r => r.success).length / totalCalls
      : 0;

    const byProvider: Record<string, { calls: number; cost: number }> = {};
    const byFeature: Record<string, { calls: number; cost: number }> = {};

    for (const record of filtered) {
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = { calls: 0, cost: 0 };
      }
      byProvider[record.provider].calls++;
      byProvider[record.provider].cost += record.cost;

      if (!byFeature[record.feature]) {
        byFeature[record.feature] = { calls: 0, cost: 0 };
      }
      byFeature[record.feature].calls++;
      byFeature[record.feature].cost += record.cost;
    }

    return {
      totalCalls,
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      averageCost,
      averageLatency,
      successRate,
      byProvider,
      byFeature,
    };
  }

  /**
   * 获取推荐 Provider
   */
  getRecommendedProvider(options: {
    maxCost?: number;
    minQuality?: number;
    feature?: string;
  } = {}): ProviderCost | null {
    let candidates = [...PROVIDER_COSTS];

    if (options.maxCost !== undefined) {
      candidates = candidates.filter(
        c => (c.inputCost + c.outputCost) / 2 <= options.maxCost!
      );
    }

    if (options.minQuality !== undefined) {
      candidates = candidates.filter(c => c.qualityScore >= options.minQuality!);
    }

    if (candidates.length === 0) return null;

    // 按推荐优先级 + 质量分数排序
    candidates.sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return b.qualityScore - a.qualityScore;
    });

    return candidates[0];
  }

  /**
   * 导出记录（用于分析）
   */
  exportRecords(options: {
    startTime?: Date;
    endTime?: Date;
    format?: "json" | "csv";
  } = {}): string {
    let filtered = this.records;

    if (options.startTime) {
      filtered = filtered.filter(r => r.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      filtered = filtered.filter(r => r.timestamp <= options.endTime!);
    }

    if (options.format === "csv") {
      const headers = [
        "id", "timestamp", "provider", "model", "feature",
        "inputTokens", "outputTokens", "cost", "elapsedMs",
        "success", "error", "userId", "videoId",
      ];
      const rows = filtered.map(r => [
        r.id,
        r.timestamp.toISOString(),
        r.provider,
        r.model,
        r.feature,
        r.inputTokens,
        r.outputTokens,
        r.cost.toFixed(6),
        r.elapsedMs,
        r.success,
        r.error ?? "",
        r.userId ?? "",
        r.videoId ?? "",
      ].join(","));
      return [headers.join(","), ...rows].join("\n");
    }

    return JSON.stringify(filtered, null, 2);
  }

  private generateId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ============================================================================
// 4. 全局实例
// ============================================================================

/** 全局成本追踪器 */
export const costTracker = new CostTracker();

// ============================================================================
// 5. 便捷函数
// ============================================================================

/**
 * 记录 AI 调用（便捷函数）
 */
export function recordAiCall(call: Omit<AiCallRecord, "id" | "timestamp" | "cost">): AiCallRecord {
  return costTracker.record(call);
}

/**
 * 获取成本统计（便捷函数）
 */
export function getCostStats(options: Parameters<CostTracker["getStats"]>[0] = {}) {
  return costTracker.getStats(options);
}

/**
 * 获取推荐 Provider（便捷函数）
 */
export function getRecommendedProvider(options: Parameters<CostTracker["getRecommendedProvider"]>[0] = {}) {
  return costTracker.getRecommendedProvider(options);
}
