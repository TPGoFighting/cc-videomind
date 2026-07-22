import { z } from "zod";

const DEFAULT_ASR_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_ASR_MODEL = "FunAudioLLM/SenseVoiceSmall";
const DEFAULT_ASR_TIMEOUT_MS = 120_000;

const AsrSegmentSchema = z.object({
  text: z.string(),
  start: z.number().finite(),
  end: z.number().finite(),
});

const AsrResponseSchema = z
  .object({
    text: z.string().optional(),
    segments: z.array(AsrSegmentSchema).optional(),
  })
  .passthrough()
  .refine(
    (value) => Boolean(value.text?.trim()) || Boolean(value.segments?.length),
    "ASR response contains neither text nor segments",
  );

export type AsrResponse = z.infer<typeof AsrResponseSchema>;

export interface AsrConfiguration {
  apiKey: string;
  baseUrl: string;
  model: string;
}

type AsrEnvironment = Record<string, string | undefined>;

export class AsrConfigurationError extends Error {
  constructor() {
    super("ASR service is not configured");
    this.name = "AsrConfigurationError";
  }
}

export class AsrServiceError extends Error {
  readonly status: number;
  readonly reason: "request_failed" | "invalid_response";

  constructor(
    status: number,
    reason: "request_failed" | "invalid_response",
  ) {
    super("ASR service request failed");
    this.name = "AsrServiceError";
    this.status = status;
    this.reason = reason;
  }
}

export function getAsrConfiguration(
  environment: AsrEnvironment = process.env,
): AsrConfiguration {
  const apiKey = environment.ASR_API_KEY?.trim();
  if (!apiKey) {
    throw new AsrConfigurationError();
  }

  const baseUrl = (environment.ASR_API_BASE_URL || DEFAULT_ASR_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
  const model = (environment.ASR_MODEL || DEFAULT_ASR_MODEL).trim();

  return { apiKey, baseUrl, model };
}

export async function requestAsrTranscript(
  configuration: AsrConfiguration,
  input: { file: Blob; filename: string },
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<AsrResponse> {
  const formData = new FormData();
  formData.append("file", input.file, input.filename);
  formData.append("model", configuration.model);

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${configuration.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${configuration.apiKey}`,
    },
    body: formData,
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_ASR_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new AsrServiceError(response.status, "request_failed");
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const parsed = AsrResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AsrServiceError(502, "invalid_response");
  }

  return parsed.data;
}
