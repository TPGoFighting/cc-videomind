/**
 * 优雅降级机制
 *
 * 当 AI Provider 失败或限流时，提供降级策略：
 * 1. 尝试缓存结果
 * 2. 使用备用 Provider
 * 3. 返回原始数据 + 提示信息
 *
 * @module ai/degradation
 */

import type { TranscriptSegment, VideoAnalysis, ChatAnswer, KeyMoment, SummaryTakeaway, WordDefinition } from "@/lib/types";

// ============================================================================
// 1. 降级状态枚举
// ============================================================================

/** 降级级别 */
export type DegradationLevel = "none" | "cached" | "fallback" | "degraded";

/** 降级结果 */
export interface DegradedResult<T> {
  /** 实际数据 */
  data: T;

  /** 降级级别 */
  level: DegradationLevel;

  /** 降级消息（给用户看） */
  message?: string;

  /** 原始错误（给开发者看） */
  originalError?: Error;

  /** 使用的 Provider */
  provider?: string;

  /** 耗时（毫秒） */
  elapsedMs?: number;
}

// ============================================================================
// 2. 降级策略配置
// ============================================================================

/** 降级策略配置 */
export interface DegradationConfig {
  /** 是否启用缓存回退 */
  enableCacheFallback?: boolean;

  /** 是否启用备用 Provider */
  enableFallbackProvider?: boolean;

  /** 是否返回降级结果（而非抛出错误） */
  enableDegradedResponse?: boolean;

  /** 缓存过期时间（毫秒） */
  cacheMaxAgeMs?: number;

  /** 降级消息模板 */
  messages?: {
    cached?: string;
    fallback?: string;
    degraded?: string;
  };
}

/** 默认配置 */
const DEFAULT_CONFIG: DegradationConfig = {
  enableCacheFallback: true,
  enableFallbackProvider: true,
  enableDegradedResponse: true,
  cacheMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 天
  messages: {
    cached: "AI 分析结果来自缓存",
    fallback: "AI 分析使用了备用模型",
    degraded: "AI 分析暂时不可用，仅显示原始字幕",
  },
};

// ============================================================================
// 3. 降级执行器
// ============================================================================

/**
 * 执行 AI 操作并处理降级
 *
 * @param operation - 主要 AI 操作
 * @param options - 降级配置
 * @returns 降级结果
 */
export async function withDegradation<T>(
  operation: () => Promise<T>,
  options: DegradationConfig & {
    /** 缓存获取函数 */
    cacheGet?: () => Promise<T | null>;

    /** 缓存设置函数 */
    cacheSet?: (data: T) => Promise<void>;

    /** 备用操作 */
    fallbackOperation?: () => Promise<T>;

    /** 操作名称（用于日志） */
    operationName?: string;
  } = {}
): Promise<DegradedResult<T>> {
  const config = { ...DEFAULT_CONFIG, ...options };
  const startTime = Date.now();

  // 尝试主要操作
  try {
    const data = await operation();
    return {
      data,
      level: "none",
      elapsedMs: Date.now() - startTime,
    };
  } catch (primaryError) {
    console.error(`[${options.operationName ?? "AI"}] 主要操作失败:`, primaryError);

    // 策略1：尝试缓存
    if (config.enableCacheFallback && options.cacheGet) {
      try {
        const cached = await options.cacheGet();
        if (cached) {
          console.log(`[${options.operationName ?? "AI"}] 使用缓存结果`);
          return {
            data: cached,
            level: "cached",
            message: config.messages?.cached,
            originalError: primaryError instanceof Error ? primaryError : new Error(String(primaryError)),
            elapsedMs: Date.now() - startTime,
          };
        }
      } catch (cacheError) {
        console.error(`[${options.operationName ?? "AI"}] 缓存获取失败:`, cacheError);
      }
    }

    // 策略2：尝试备用 Provider
    if (config.enableFallbackProvider && options.fallbackOperation) {
      try {
        const fallbackData = await options.fallbackOperation();
        console.log(`[${options.operationName ?? "AI"}] 使用备用 Provider`);

        // 尝试缓存结果
        if (config.enableCacheFallback && options.cacheSet) {
          options.cacheSet(fallbackData).catch(() => {});
        }

        return {
          data: fallbackData,
          level: "fallback",
          message: config.messages?.fallback,
          originalError: primaryError instanceof Error ? primaryError : new Error(String(primaryError)),
          elapsedMs: Date.now() - startTime,
        };
      } catch (fallbackError) {
        console.error(`[${options.operationName ?? "AI"}] 备用 Provider 也失败:`, fallbackError);
      }
    }

    // 策略3：返回降级结果（如果启用）
    if (config.enableDegradedResponse) {
      return {
        data: null as T,
        level: "degraded",
        message: config.messages?.degraded,
        originalError: primaryError instanceof Error ? primaryError : new Error(String(primaryError)),
        elapsedMs: Date.now() - startTime,
      };
    }

    // 所有策略都失败，抛出原始错误
    throw primaryError;
  }
}

// ============================================================================
// 4. 特定功能的降级包装器
// ============================================================================

/**
 * 视频分析降级包装器
 */
export async function withAnalysisDegradation(
  operation: () => Promise<VideoAnalysis>,
  transcript: TranscriptSegment[],
  options: DegradationConfig = {}
): Promise<DegradedResult<VideoAnalysis | Partial<VideoAnalysis>>> {
  return withDegradation(operation, {
    ...options,
    operationName: "video-analysis",
    enableDegradedResponse: true,
  });
}

/**
 * 对话问答降级包装器
 */
export async function withChatDegradation<T extends ChatAnswer>(
  operation: () => Promise<T>,
  options: DegradationConfig = {}
): Promise<DegradedResult<T>> {
  return withDegradation(operation, {
    ...options,
    operationName: "chat",
    enableDegradedResponse: true,
  });
}

/**
 * 关键时刻降级包装器
 */
export async function withMomentsDegradation(
  operation: () => Promise<KeyMoment[]>,
  options: DegradationConfig = {}
): Promise<DegradedResult<KeyMoment[]>> {
  return withDegradation(operation, {
    ...options,
    operationName: "moments",
    enableDegradedResponse: true,
  });
}

/**
 * 内容摘要降级包装器
 */
export async function withSummaryDegradation(
  operation: () => Promise<SummaryTakeaway[]>,
  options: DegradationConfig = {}
): Promise<DegradedResult<SummaryTakeaway[]>> {
  return withDegradation(operation, {
    ...options,
    operationName: "summary",
    enableDegradedResponse: true,
  });
}

/**
 * 词义生成降级包装器
 */
export async function withWordDefsDegradation(
  operation: () => Promise<WordDefinition[]>,
  options: DegradationConfig = {}
): Promise<DegradedResult<WordDefinition[]>> {
  return withDegradation(operation, {
    ...options,
    operationName: "word-definitions",
    enableDegradedResponse: true,
  });
}

// ============================================================================
// 5. 降级响应构建器
// ============================================================================

/**
 * 构建降级响应（用于 API 返回）
 */
export function buildDegradedResponse<T>(
  result: DegradedResult<T>,
  fallbackData?: T
): {
  ok: boolean;
  data?: T;
  degraded?: boolean;
  message?: string;
} {
  if (result.level === "none") {
    return { ok: true, data: result.data };
  }

  if (result.level === "degraded" && !result.data) {
    return {
      ok: false,
      degraded: true,
      message: result.message ?? "服务暂时不可用",
    };
  }

  return {
    ok: true,
    data: result.data ?? fallbackData,
    degraded: true,
    message: result.message,
  };
}

/**
 * 构建降级的视频分析响应
 */
export function buildDegradedAnalysisResponse(
  result: DegradedResult<VideoAnalysis | Partial<VideoAnalysis> | null>,
  transcript: TranscriptSegment[]
): {
  ok: boolean;
  data: VideoAnalysis;
  degraded?: boolean;
  message?: string;
} {
  if (result.level === "none" && result.data) {
    return { ok: true, data: result.data as VideoAnalysis };
  }

  // 从字幕构建基础分析
  const fallbackAnalysis: VideoAnalysis = {
    summary: "AI 深入解析暂时不可用。以下内容根据字幕的时间位置整理，可先用于阅读和回看。",
    takeaways: [
      "开头：" + (transcript.slice(0, 10).map((segment) => segment.text).join(" ").slice(0, 180) || "暂无可读内容。"),
      "中段：" + (transcript.slice(Math.floor(transcript.length / 2), Math.floor(transcript.length / 2) + 10).map((segment) => segment.text).join(" ").slice(0, 180) || "暂无可读内容。"),
      "结尾：" + (transcript.slice(-10).map((segment) => segment.text).join(" ").slice(0, 180) || "暂无可读内容。"),
    ],
    suggestedQuestions: ["视频的主要内容是什么？"],
    highlights: transcript.slice(0, 5).map(s => ({
      startTime: s.startTime,
      endTime: s.endTime,
      title: "字幕片段",
      quote: s.text.slice(0, 100),
      reason: "自动提取",
    })),
  };

  return {
    ok: true,
    data: (result.data as VideoAnalysis) ?? fallbackAnalysis,
    degraded: true,
    message: result.message,
  };
}
