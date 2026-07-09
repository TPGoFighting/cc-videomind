import { z, type ZodType } from "zod";
import { fetch } from "expo/fetch";
import {
  ChatAnswerSchema,
  CheckinStatusSchema,
  HistoryItemSchema,
  MomentsPayloadSchema,
  QuoteItemSchema,
  QuoteListSchema,
  ReviewListSchema,
  SaveQuoteRequestSchema,
  SaveWordResponseSchema,
  SubmitReviewSchema,
  SummaryPayloadSchema,
  TranscriptSegmentSchema,
  VideoAnalysisPayloadSchema,
  VideoAnalysisSchema,
  VideoMetadataSchema,
  VocabItemSchema,
  VocabListSchema,
  WordDefListSchema,
  extractVideoId,
  type ChatAnswer,
  type CheckinStatus,
  type HistoryItem,
  type JsonResponse,
  type MomentsPayload,
  type QuoteItem,
  type ReviewList,
  type SaveWordResponse,
  type SummaryPayload,
  type UserNote,
  type VideoAnalysis,
  type VideoAnalysisPayload,
  type VideoMetadata,
  type VocabItem,
  type WordDefList,
  type TranscriptSegment,
} from "@teach-player/shared";
import { MOCK_VIDEOS } from "./mock-data";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://video.tpgofighting.top").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
};

export type TranscriptTranslationRequestSegment = Pick<TranscriptSegment, "startTime" | "endTime" | "text"> & {
  index: number;
};

export type TranscriptTranslationUpdate = {
  index: number;
  text_zh: string;
};

export type GrammarAnalysisResult = {
  sentence: string;
  translation: string;
  posTags: Array<{ word: string; pos: string; color: string }>;
  structure: string;
  explanation: string;
};

const SubscriptionTierSchema = z.enum(["free", "pro", "max"]);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

const MeSchema = z.object({
  role: z.enum(["user", "admin"]).nullable(),
  email: z.string().email().nullable(),
  subscription_tier: SubscriptionTierSchema.nullable(),
  authenticated: z.boolean(),
});

const PaymentStatusSchema = z.object({
  pending: z.object({
    tier: z.enum(["pro", "max"]),
    status: z.enum(["pending", "approved", "rejected"]),
    createdAt: z.string(),
  }).nullable(),
});

const SubmitPaymentResponseSchema = z.object({
  ok: z.boolean(),
});

const AiSettingsSchema = z.object({
  admin: z.boolean(),
  config: z.record(z.string(), z.string().nullable()).default({}),
});

const AdminVideoSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  thumbnail: z.string().nullable(),
  channelName: z.string(),
  parsedAt: z.string(),
  parsedBy: z.string(),
});

const AdminVideosSchema = z.object({
  videos: z.array(AdminVideoSchema),
});

const PaymentSubmissionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  tier: z.enum(["pro", "max"]),
  transaction_id: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  reviewed_by: z.string().nullable(),
  admin_notes: z.string().nullable(),
  created_at: z.string(),
  reviewed_at: z.string().nullable(),
  userEmail: z.string().nullable(),
});

const AdminPaymentsSchema = z.object({
  submissions: z.array(PaymentSubmissionSchema),
});

const AdminPaymentReviewSchema = z.object({
  ok: z.boolean(),
  status: z.enum(["approved", "rejected"]),
});

export type AiSettings = z.infer<typeof AiSettingsSchema>;
export type AdminVideo = z.infer<typeof AdminVideoSchema>;
export type PaymentSubmission = z.infer<typeof PaymentSubmissionSchema>;
export type PaymentSubmissionStatus = "pending" | "approved" | "rejected" | "all";

const errorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export async function requestJson<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const payload = (await response.json()) as unknown;
    const errorEnvelope = errorEnvelopeSchema.safeParse(payload);
    if (errorEnvelope.success) {
      throw new ApiError(errorEnvelope.data.error.message, errorEnvelope.data.error.code, response.status);
    }

    const parsedEnvelope = z.object({ ok: z.literal(true), data: schema }).safeParse(payload);
    const parsedDirect = schema.safeParse(payload);
    const parsedData = parsedEnvelope.success ? parsedEnvelope.data.data : parsedDirect.success ? parsedDirect.data : null;
    if (!parsedData) {
      const schemaIssues = parsedEnvelope.success ? [] : parsedEnvelope.error.issues;
      console.warn(`[API] ${options.method ?? "GET"} ${path} response shape mismatch`, {
        status: response.status,
        received: JSON.stringify(payload).slice(0, 500),
        schemaError: schemaIssues.slice(0, 3),
      });
      throw new ApiError(
        `Server response shape mismatch (${path}): ${schemaIssues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
        "invalid_response",
        response.status
      );
    }

    if (!response.ok) {
      throw new ApiError("Request failed.", "http_error", response.status);
    }

    return parsedData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const isAbort = error instanceof Error && error.name === "AbortError";
    throw new ApiError(isAbort ? "Request timed out." : "Network request failed.", isAbort ? "timeout" : "network_error", 0);
  } finally {
    clearTimeout(timeout);
  }
}

export function postVideoAnalysis(input: string, token?: string | null, force?: boolean): Promise<VideoAnalysisPayload> {
  const trimmed = input.trim();
  const res = extractVideoId(trimmed);
  const videoId = res ? res.id : trimmed;
  const isBili = res?.provider === "bilibili";
  return requestJson("/api/video-analysis", VideoAnalysisPayloadSchema, {
    method: "POST",
    body: {
      videoId,
      force,
      ...(trimmed.startsWith("http") ? { url: trimmed } : {}),
      // B站纯 ID 时补全标准 URL，服务端需要完整 URL 来抓取
      ...(isBili && !trimmed.startsWith("http")
        ? { url: `https://www.bilibili.com/video/${res.id}` }
        : {}),
    },
    token,
    timeoutMs: isBili ? 300_000 : 90_000,
  });
}

const VideoMetaResultSchema = z.object({
  videoId: z.string(),
  metadata: VideoMetadataSchema.nullable(),
  transcript: z.array(TranscriptSegmentSchema).nullable(),
  analysis: VideoAnalysisSchema.nullable(),
  cached: z.boolean(),
});

export type VideoMetaResult = z.infer<typeof VideoMetaResultSchema>;

/**
 * 快速获取视频元数据（2-3s 内返回）
 * 如果服务端有完整缓存，也会返回 transcript + analysis
 * 不触发完整解析管线
 */
export function getVideoMeta(videoId: string, token?: string | null): Promise<VideoMetaResult> {
  return requestJson("/api/video-analysis/meta", VideoMetaResultSchema, {
    method: "POST",
    body: { videoId },
    token,
    timeoutMs: 10_000,
  });
}

export async function streamTranscriptTranslations(
  videoId: string,
  segments: TranscriptTranslationRequestSegment[],
  token: string | null | undefined,
  onTranslation: (update: TranscriptTranslationUpdate) => void,
  signal?: AbortSignal
): Promise<void> {
  if (segments.length === 0) {
    return;
  }

  const response = await fetch(`${apiBaseUrl}/api/transcript-translations/stream`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ videoId, segments }),
    signal,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let message = "";
    if (contentType.includes("html")) {
      message = `Translation server responded with status ${response.status}.`;
    } else {
      message = await response.text().catch(() => "");
    }
    
    if (message.trim().startsWith("<")) {
      message = `Translation server responded with status ${response.status}.`;
    }
    
    throw new ApiError(message || "Transcript translation failed.", "translation_failed", response.status);
  }

  if (!response.body) {
    const payload = await response.text();
    consumeSseText(payload, segments, onTranslation);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      consumeSseFrame(frame, segments, onTranslation);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    consumeSseFrame(buffer, segments, onTranslation);
  }
}

function consumeSseText(
  payload: string,
  segments: TranscriptTranslationRequestSegment[],
  onTranslation: (update: TranscriptTranslationUpdate) => void
) {
  for (const frame of payload.split(/\r?\n\r?\n/)) {
    consumeSseFrame(frame, segments, onTranslation);
  }
}

function consumeSseFrame(
  frame: string,
  segments: TranscriptTranslationRequestSegment[],
  onTranslation: (update: TranscriptTranslationUpdate) => void
) {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("\n")
    .trim();

  if (!data || data === "[DONE]") {
    return;
  }

  const parsed = parseTranslationEvent(data);
  const updates = Array.isArray(parsed?.translations) ? parsed.translations : [parsed];

  for (const update of updates) {
    const index = Number(update?.index);
    if (!Number.isInteger(index) || index < 0) {
      continue;
    }

    const source = segments.find((segment) => segment.index === index);
    const text_zh = firstNonEmptyString(update?.text_zh, update?.textZh, update?.translation, update?.text) ?? source?.text;
    if (text_zh) {
      onTranslation({ index, text_zh });
    }
  }
}

function parseTranslationEvent(data: string): any {
  try {
    return JSON.parse(data);
  } catch {
    const outputMatches = Array.from(data.matchAll(/\[OUTPUT_(\d+)]([\s\S]*?)\[\/OUTPUT_\1]/g));
    if (outputMatches.length > 0) {
      return {
        translations: outputMatches.map((match) => ({
          index: Number(match[1]),
          text_zh: match[2]?.trim(),
        })),
      };
    }

    const match = data.match(/^\s*(\d+)\s*[:：]\s*(.+?)\s*$/s);
    return match ? { index: Number(match[1]), text_zh: match[2] } : null;
  }
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

export function postMoments(videoId: string, token?: string | null): Promise<MomentsPayload> {
  return requestJson("/api/generate-moments", MomentsPayloadSchema, {
    method: "POST",
    body: { videoId, mode: "smart" },
    token,
    timeoutMs: 90_000,
  });
}

export function postSummary(videoId: string, token?: string | null): Promise<SummaryPayload> {
  return requestJson("/api/generate-summary", SummaryPayloadSchema, {
    method: "POST",
    body: { videoId },
    token,
    timeoutMs: 90_000,
  });
}

export async function postChat(videoId: string, question: string, token?: string | null): Promise<ChatAnswer> {
  try {
    return await requestJson("/api/chat", ChatAnswerSchema, {
      method: "POST",
      body: { videoId, question },
      token,
      timeoutMs: 60_000,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn("[API] postChat failed, generating mock response fallback in development mode:", error);
      const mockVideo = MOCK_VIDEOS.find(v => v.videoId === videoId);
      const title = mockVideo?.title ?? "该视频";
      
      // Simulate a short network delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      return {
        answer: `【本地模拟答复】关于您提问的“${question}”，在此视频《${title}》中，主要通过具体的实例展示了其核心的认知方法与实战步骤。具体而言，主讲人强调需要进行细致的规划，将大目标拆解为可操作的小任务，并且要专注于每一次的刻意练习（Deliberate Practice）。`,
        citations: [
          {
            startTime: 12,
            endTime: 32,
            quote: "Applying these techniques can improve efficiency by fifty percent."
          },
          {
            startTime: 45,
            endTime: 58,
            quote: "First, identify your primary goal and write it down. This makes it tangible."
          }
        ]
      };
    }
    throw error;
  }
}

export function getHistory(token?: string | null): Promise<HistoryItem[]> {
  return requestJson("/api/history", z.array(HistoryItemSchema), { token });
}

export function postNote(videoId: string, body: string, timestampSeconds?: number, token?: string | null): Promise<JsonResponse<unknown>> {
  return requestJson("/api/notes", z.unknown(), {
    method: "POST",
    body: { videoId, body, timestampSeconds },
    token,
  }).then((data) => ({ ok: true, data }));
}

export function getMe(token?: string | null): Promise<z.infer<typeof MeSchema>> {
  return requestJson("/api/me", MeSchema, { token });
}

export function getPaymentStatus(token?: string | null): Promise<z.infer<typeof PaymentStatusSchema>> {
  return requestJson("/api/payment/submit", PaymentStatusSchema, { token });
}

export function submitPayment(
  tier: "pro" | "max",
  transactionId: string,
  token?: string | null
): Promise<z.infer<typeof SubmitPaymentResponseSchema>> {
  return requestJson("/api/payment/submit", SubmitPaymentResponseSchema, {
    method: "POST",
    body: { tier, transactionId },
    token,
  });
}

export function getAdminSettings(token?: string | null): Promise<AiSettings> {
  return requestJson("/api/admin/settings", AiSettingsSchema, { token });
}

export function updateAdminSetting(
  key: "ai_provider" | "ai_api_key" | "ai_api_base_url" | "ai_model",
  value: string,
  token?: string | null
): Promise<z.infer<typeof SubmitPaymentResponseSchema>> {
  return requestJson("/api/admin/settings", SubmitPaymentResponseSchema, {
    method: "PUT",
    body: { key, value },
    token,
  });
}

export function getAdminVideos(token?: string | null): Promise<AdminVideo[]> {
  return requestJson("/api/admin/videos", AdminVideosSchema, { token }).then((data) => data.videos);
}

export function getAdminPayments(
  status: PaymentSubmissionStatus,
  token?: string | null
): Promise<PaymentSubmission[]> {
  return requestJson(`/api/admin/payments?status=${encodeURIComponent(status)}`, AdminPaymentsSchema, { token })
    .then((data) => data.submissions);
}

export function reviewAdminPayment(
  submissionId: string,
  action: "approve" | "reject",
  token?: string | null
): Promise<z.infer<typeof AdminPaymentReviewSchema>> {
  return requestJson("/api/admin/payments", AdminPaymentReviewSchema, {
    method: "PUT",
    body: { submissionId, action },
    token,
  });
}

export function getVocabulary(token?: string | null): Promise<VocabItem[]> {
  return requestJson("/api/user-vocabulary", VocabListSchema, { token })
    .then((list) => list.vocabulary);
}

export function postVocabulary(lemma: string, videoId: string, token?: string | null): Promise<SaveWordResponse> {
  return requestJson("/api/user-vocabulary", SaveWordResponseSchema, {
    method: "POST",
    body: { lemma, videoId } satisfies { lemma: string; videoId: string },
    token,
  });
}

export function deleteVocabulary(id: string, token?: string | null): Promise<JsonResponse<unknown>> {
  return requestJson(`/api/user-vocabulary?id=${encodeURIComponent(id)}`, z.unknown(), {
    method: "DELETE",
    token,
  }).then(() => ({ ok: true as const, data: undefined }));
}

export function getQuotes(token?: string | null): Promise<QuoteItem[]> {
  return requestJson("/api/user-quotes", QuoteListSchema, { token })
    .then((list) => list.quotes);
}

export function postQuote(
  videoId: string,
  textEn: string,
  textZh: string | undefined,
  startTime: number,
  endTime: number,
  notes?: string,
  token?: string | null
): Promise<JsonResponse<unknown>> {
  return requestJson("/api/user-quotes", z.unknown(), {
    method: "POST",
    body: SaveQuoteRequestSchema.parse({ videoId, textEn, textZh, startTime, endTime, notes }),
    token,
  }).then(() => ({ ok: true, data: undefined }));
}

export function deleteQuote(id: string, token?: string | null): Promise<JsonResponse<unknown>> {
  return requestJson(`/api/user-quotes?id=${encodeURIComponent(id)}`, z.unknown(), {
    method: "DELETE",
    token,
  }).then(() => ({ ok: true, data: undefined }));
}

const NoteItemServerSchema = z.object({
  id: z.string().uuid(),
  video_id: z.string(),
  body: z.string(),
  timestamp_seconds: z.number().nullish(),
  created_at: z.string(),
  video_title: z.string().nullish(),
});

export function getNotes(token?: string | null): Promise<UserNote[]> {
  return requestJson("/api/notes", z.array(NoteItemServerSchema), { token })
    .then((notes) => notes.map((n) => ({
      id: n.id,
      videoId: n.video_id,
      body: n.body,
      timestampSeconds: n.timestamp_seconds ?? undefined,
      videoTitle: n.video_title ?? undefined,
      createdAt: n.created_at,
    })));
}

export function deleteNote(noteId: string, token?: string | null): Promise<JsonResponse<unknown>> {
  return requestJson("/api/notes", z.unknown(), {
    method: "DELETE",
    body: { noteId },
    token,
  }).then(() => ({ ok: true, data: undefined }));
}

export function getReview(token?: string | null): Promise<ReviewList> {
  return requestJson("/api/review", ReviewListSchema, { token });
}

export function postReview(reviews: { lemma: string; quality: number }[], token?: string | null): Promise<JsonResponse<unknown>> {
  return requestJson("/api/review", z.unknown(), {
    method: "POST",
    body: SubmitReviewSchema.parse({ reviews }),
    token,
  }).then(() => ({ ok: true, data: undefined }));
}

export function getCheckin(token?: string | null): Promise<CheckinStatus> {
  return requestJson("/api/checkin", CheckinStatusSchema, { token });
}

export function postCheckin(wordCount: number, token?: string | null): Promise<CheckinStatus> {
  return requestJson("/api/checkin", CheckinStatusSchema, {
    method: "POST",
    body: { wordCount },
    token,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// P1: AI Grammar Parsing (Mock Implementation since backend is not available locally)
// ─────────────────────────────────────────────────────────────────────────────
export async function postGrammarAnalysis(
  sentence: string,
  videoId: string,
  token: string | null
): Promise<GrammarAnalysisResult> {
  // Simulate network delay for AI generation
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    sentence,
    translation: "这是一个由 AI 生成的模拟中文翻译，用于解释当前句子的含义。",
    posTags: sentence.split(" ").map((w, i) => {
      // Mock some part-of-speech tags
      const isNoun = w.length > 5;
      const isVerb = i === 1 || i === 3;
      return {
        word: w,
        pos: isNoun ? "Noun" : isVerb ? "Verb" : "Adj",
        color: isNoun ? "#3B82F6" : isVerb ? "#10B981" : "#F59E0B",
      };
    }),
    structure: "主谓宾结构 (S-V-O)",
    explanation: "这句话主要使用了现在进行时。注意这里的动词搭配...（AI 详细解析提示）。",
  };
}

export function postWordDefinitions(word: string, token?: string | null): Promise<WordDefList> {
  const lemma = normalizeLookupWord(word);
  return requestJson("/api/word-definitions", WordDefListSchema, {
    method: "POST",
    body: { lemmas: [lemma] },
    token,
    timeoutMs: 60_000,
  });
}

function normalizeLookupWord(word: string): string {
  return word
    .normalize("NFKC")
    .replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "")
    .replace(/[鈥檂]/g, "'")
    .toLowerCase();
}
