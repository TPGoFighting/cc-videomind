import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import type { JsonResponse } from "@/lib/types";

export async function readJson<T>(request: Request, schema: ZodSchema<T>) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 128_000) {
      return { ok: false as const, response: errorResponse("payload_too_large", "Request body is too large.", 413) };
    }

    const body = (await request.json()) as unknown;
    return { ok: true as const, data: schema.parse(body) };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false as const,
        response: errorResponse("invalid_input", "Request validation failed.", 400, error.flatten())
      };
    }

    return { ok: false as const, response: errorResponse("invalid_json", "Request body must be valid JSON.", 400) };
  }
}

export function successResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<JsonResponse<T>>({ ok: true, data }, init);
}

export function errorResponse(code: string, message: string, status = 500, details?: unknown) {
  return NextResponse.json<JsonResponse<never>>(
    { ok: false, error: { code, message, details } },
    { status }
  );
}
