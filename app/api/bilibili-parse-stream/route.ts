import { NextRequest } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse } from "@/lib/utils/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return withSecurity({
    allowedMethods: ["GET"],
    maxBodySize: 64 * 1024,
    scope: "bili-parse-stream",
    rateLimit: { maxRequests: 12, windowMs: 60_000 },
  }).wrap(request, async () => {
    return errorResponse(
      "bilibili_subtitle_import_required",
      "B 站链接请导入 SRT、VTT 或 B 站 JSON 字幕；自动抓取音频已停用。",
      410,
    );
  });
}
