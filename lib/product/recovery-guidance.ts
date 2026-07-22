export type FailureArea = "transcript" | "analysis" | "translation" | "chat";

export type RecoveryAction =
  | "retry"
  | "choose_video"
  | "open_youtube"
  | "login"
  | "continue_with_transcript"
  | "edit_question";

export type RecoveryGuidance = {
  title: string;
  message: string;
  primaryAction: RecoveryAction;
  secondaryAction?: RecoveryAction;
};

const AI_CONFIGURATION_CODES = new Set([
  "ai_credentials_invalid",
  "ai_quota_exhausted",
  "ai_provider_unavailable",
]);

const TRANSCRIPT_RESTRICTION_CODES = new Set([
  "AGE_RESTRICTED",
  "CONSENT_REQUIRED",
  "NO_PLAYER_RESPONSE",
]);

const TRANSCRIPT_UNAVAILABLE_CODES = new Set([
  "NO_CAPTION_TRACKS",
  "no_transcript",
]);

/**
 * Keep recovery copy deterministic and independent from upstream provider text.
 * The UI can safely expose these messages without leaking provider internals.
 */
export function getRecoveryGuidance(
  area: FailureArea,
  code: string | null | undefined,
): RecoveryGuidance {
  const normalizedCode = code?.trim() || "unknown";

  if (area === "transcript") {
    if (normalizedCode === "quota_exceeded" || normalizedCode === "unauthorized") {
      return {
        title: "本次体验已到保存边界",
        message: "已获得的内容不会消失。登录后可继续解析、保存并进入复习。",
        primaryAction: "login",
        secondaryAction: "choose_video",
      };
    }
    if (normalizedCode === "invalid_video_url") {
      return {
        title: "这个链接暂时无法识别",
        message: "请使用公开的 YouTube 视频链接，或从已核对的视频中选择一条。",
        primaryAction: "choose_video",
      };
    }
    if (TRANSCRIPT_RESTRICTION_CODES.has(normalizedCode)) {
      return {
        title: "视频访问受限",
        message: "该视频需要额外验证，Teach Player 无法读取字幕。可在 YouTube 检查后换一条公开视频。",
        primaryAction: "open_youtube",
        secondaryAction: "choose_video",
      };
    }
    if (TRANSCRIPT_UNAVAILABLE_CODES.has(normalizedCode)) {
      return {
        title: "没有可用字幕",
        message: "请选择已开启英文字幕的公开视频；也可以先在 YouTube 检查字幕开关。",
        primaryAction: "choose_video",
        secondaryAction: "open_youtube",
      };
    }
    return {
      title: "字幕读取暂时中断",
      message: "可以直接重试；如果仍失败，请换一条已核对的视频。",
      primaryAction: "retry",
      secondaryAction: "choose_video",
    };
  }

  if (area === "analysis") {
    if (AI_CONFIGURATION_CODES.has(normalizedCode)) {
      return {
        title: "深入解析暂时不可用",
        message: "字幕和已获得的内容仍可继续使用；服务恢复后再补充要点与摘要。",
        primaryAction: "continue_with_transcript",
        secondaryAction: "retry",
      };
    }
    if (normalizedCode === "ai_rate_limited") {
      return {
        title: "深入解析正在排队",
        message: "字幕已经可用。建议先阅读，稍后再试要点与摘要。",
        primaryAction: "continue_with_transcript",
        secondaryAction: "retry",
      };
    }
    return {
      title: "字幕已就绪，解析尚未完成",
      message: "可以先阅读、跳转和收藏；重试不会清除当前字幕。",
      primaryAction: "continue_with_transcript",
      secondaryAction: "retry",
    };
  }

  if (area === "translation") {
    if (normalizedCode === "no_transcript") {
      return {
        title: "还不能生成翻译",
        message: "需要先取得原始字幕。请重试字幕读取或换一条视频。",
        primaryAction: "retry",
        secondaryAction: "choose_video",
      };
    }
    return {
      title: "翻译暂时没有完成",
      message: "英文原文仍然可读；稍后重试不会覆盖当前字幕。",
      primaryAction: "retry",
    };
  }

  if (normalizedCode === "ai_rate_limited") {
    return {
      title: "问答正在排队",
      message: "问题已保留，请稍后再次发送。",
      primaryAction: "retry",
    };
  }
  if (AI_CONFIGURATION_CODES.has(normalizedCode)) {
    return {
      title: "视频问答暂时不可用",
      message: "问题已保留；你仍可阅读字幕和已有要点。",
      primaryAction: "edit_question",
    };
  }
  return {
    title: "暂时无法从字幕回答",
    message: "问题已保留。可以换一种更具体的问法，或稍后重试。",
    primaryAction: "edit_question",
    secondaryAction: "retry",
  };
}
