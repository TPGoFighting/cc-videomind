import { z } from "zod";
import {
  getLocalReviewCadence,
  saveLocalReviewCadence,
} from "@/lib/db/local-store";
import { isLocalMode } from "@/lib/local-mode";
import {
  getReviewCadencePolicy,
  ReviewCadenceSchema,
} from "@/lib/product/retention";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { queryTencent } from "@/lib/tencent-db";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

const UpdateReviewPreferencesSchema = z.object({
  cadence: ReviewCadenceSchema,
}).strict();

function preferenceResponse(cadence: "light" | "steady" | "focused") {
  const policy = getReviewCadencePolicy(cadence);
  return {
    cadence,
    label: policy.label,
    dailyLimit: policy.dailyLimit,
    firstReviewDelayHours: policy.firstReviewDelayHours,
  };
}

export async function GET(request: Request) {
  if (isLocalMode()) {
    return successResponse(preferenceResponse(await getLocalReviewCadence()));
  }
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可设置复习节奏。", 401);
  const result = await queryTencent<{ cadence: string }>(
    `SELECT cadence FROM user_review_preferences WHERE user_id = $1`,
    [userId],
  );
  const parsed = ReviewCadenceSchema.safeParse(result.rows[0]?.cadence);
  return successResponse(preferenceResponse(parsed.success ? parsed.data : "steady"));
}

export async function PUT(request: Request) {
  return withSecurity({
    allowedMethods: ["PUT"],
    maxBodySize: 8 * 1024,
    scope: "review-preferences",
    rateLimit: { maxRequests: 20, windowMs: 60_000 },
  }).wrap(request, async () => {
    const body = await readJson(request, UpdateReviewPreferencesSchema);
    if (!body.ok) return body.response;

    if (isLocalMode()) {
      await saveLocalReviewCadence(body.data.cadence);
      return successResponse(preferenceResponse(body.data.cadence));
    }
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "登录后可设置复习节奏。", 401);
    await queryTencent(
      `INSERT INTO user_review_preferences (user_id, cadence)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET cadence = EXCLUDED.cadence, updated_at = NOW()`,
      [userId, body.data.cadence],
    );
    return successResponse(preferenceResponse(body.data.cadence));
  });
}
