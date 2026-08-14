import { ProxyAgent } from "undici";

export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ExternalServiceError";
  }
}

let _proxyAgent: ProxyAgent | null = null;

function getProxyAgent(): ProxyAgent | null {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return null;
  // 生产机遗留的本地开发代理若未运行，会让一次 AI 请求白等到超时。
  // 这类 loopback 代理不可达时，直连比延迟回退更可靠。
  try {
    const hostname = new URL(proxyUrl).hostname;
    if (hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1") {
      return null;
    }
  } catch {
    return null;
  }
  if (!_proxyAgent) {
    _proxyAgent = new ProxyAgent(proxyUrl);
  }
  return _proxyAgent;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number; service?: string } = {}
) {
  const { timeoutMs = 10000, service = "external service", ...requestInit } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOnce = async (dispatcher?: ProxyAgent) => {
    const fetchOptions: RequestInit & { dispatcher?: ProxyAgent } = {
      ...requestInit,
      signal: controller.signal,
    };
    if (dispatcher) fetchOptions.dispatcher = dispatcher;

    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new ExternalServiceError(
        `${service} returned ${response.status}`,
        service,
        response.status
      );
    }
    return response;
  };

  const toExternalServiceError = (error: unknown): ExternalServiceError => {
    if (error instanceof ExternalServiceError) {
      return error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      return new ExternalServiceError(`${service} timed out`, service);
    }

    return new ExternalServiceError(`${service} request failed`, service);
  };

  try {
    const proxyAgent = getProxyAgent();
    try {
      return await fetchOnce(proxyAgent ?? undefined);
    } catch (proxyError) {
      // 代理进程可能临时不可用（例如本地代理已退出）。这种情况下直连
      // 仍可能可用；HTTP 状态错误则代表代理已成功转发，不应重复请求。
      const proxyUnavailable =
        proxyAgent &&
        !(proxyError instanceof ExternalServiceError) &&
        !(proxyError instanceof DOMException && proxyError.name === "AbortError");

      if (proxyUnavailable) {
        try {
          return await fetchOnce();
        } catch (directError) {
          throw toExternalServiceError(directError);
        }
      }

      throw toExternalServiceError(proxyError);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number; service?: string } = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, init);
  return (await response.json()) as T;
}
