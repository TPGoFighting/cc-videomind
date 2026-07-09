import { withSecurity } from "@/lib/security/middleware";
import { getLatestTranslation, getTranslation } from "@/lib/supabase/translations";
import { errorResponse } from "@/lib/utils/api";

export async function GET(request: Request) {
  return withSecurity({
    allowedMethods: ["GET"],
    scope: "translations",
    skipCsrf: true,
  }).wrap(request, async () => {
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");
    const language = url.searchParams.get("language") ?? "zh";
    const versionStr = url.searchParams.get("version");

    if (!videoId) {
      return errorResponse("missing_params", "videoId is required.", 400);
    }

    let result;
    if (versionStr) {
      const version = parseInt(versionStr, 10);
      if (isNaN(version) || version < 1) {
        return errorResponse("invalid_version", "version must be a positive integer.", 400);
      }
      const record = await getTranslation(videoId, language, version);
      if (!record) {
        return errorResponse("not_found", "Translation not found.", 404);
      }
      result = {
        segments: record.segments,
        version: record.version,
        language: record.language,
        provider: record.provider,
        model: record.model,
        createdAt: record.created_at,
      };
    } else {
      const latest = await getLatestTranslation(videoId, language);
      if (!latest) {
        return errorResponse("not_found", "No translation found for this video and language.", 404);
      }
      result = {
        segments: latest.segments,
        version: latest.version,
        language,
        createdAt: null,
      };
    }

    return Response.json({ ok: true, data: result });
  });
}
