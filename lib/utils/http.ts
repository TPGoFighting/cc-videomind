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

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number; service?: string } = {}
) {
  const { timeoutMs = 10000, service = "external service", ...requestInit } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...requestInit,
      signal: controller.signal
    });

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
