import { ProxyAgent, fetch as undiciFetch } from "undici";

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

  try {
    const proxyAgent = getProxyAgent();
    const fetchOptions: RequestInit & { dispatcher?: ProxyAgent } = {
      ...requestInit,
      signal: controller.signal,
    };
    if (proxyAgent) {
      fetchOptions.dispatcher = proxyAgent;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new ExternalServiceError(
        `${service} returned ${response.status}`,
        service,
        response.status
      );
    }

    return response;
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ExternalServiceError(`${service} timed out`, service);
    }

    throw new ExternalServiceError(`${service} request failed`, service);
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
