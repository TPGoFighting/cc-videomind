import { ProxyAgent, setGlobalDispatcher } from "undici";

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
let _dispatcherSet = false;

function getProxyAgent(): ProxyAgent | null {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return null;
  if (!_proxyAgent) {
    _proxyAgent = new ProxyAgent(proxyUrl);
    if (!_dispatcherSet) {
      try {
        setGlobalDispatcher(_proxyAgent);
        _dispatcherSet = true;
      } catch {
        // ignore if already set
      }
    }
  }
  return _proxyAgent;
}

// Automatically init global dispatcher on module load if proxy env is present
getProxyAgent();

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number; service?: string } = {}
) {
  const { timeoutMs = 15000, service = "external service", ...requestInit } = init;
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
