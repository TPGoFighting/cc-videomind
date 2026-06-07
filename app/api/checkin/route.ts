import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { errorResponse, successResponse } from "@/lib/utils/api";
import type { CheckinStatus } from "@/lib/types";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可查看。", 401);

  const supabase = createSupabaseServiceClient();
  if (!supabase) return successResponse({ streak: 0, todayCompleted: false, todayCount: 0, calendar: [] });

  const today = new Date().toISOString().slice(0, 10);

  // 获取近30天打卡数据
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: rows } = await supabase
    .from("user_checkins")
    .select("checkin_date, word_count")
    .eq("user_id", userId)
    .gte("checkin_date", thirtyDaysAgo)
    .order("checkin_date", { ascending: false });

  const calendar = (rows ?? []).map((r: Record<string, unknown>) => ({
    date: r.checkin_date as string,
    count: r.word_count as number,
  }));

  // 计算连续天数
  let streak = 0;
  const checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (calendar.some((c) => c.date === dateStr && c.count >= 10)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // 今天还没完成的话不打断连续
      if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  const todayCheckin = calendar.find((c) => c.date === today);

  return successResponse({
    streak,
    todayCompleted: (todayCheckin?.count ?? 0) >= 10,
    todayCount: todayCheckin?.count ?? 0,
    calendar,
  } satisfies CheckinStatus);
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可打卡。", 401);

  const supabase = createSupabaseServiceClient();
  if (!supabase) return errorResponse("database_error", "数据库配置有误。", 503);

  try {
    const body = await request.json().catch(() => ({}));
    const increment = Math.max(1, Number(body.wordCount ?? 1));
    
    const today = new Date().toISOString().slice(0, 10);

    // 1. 查询今天是否已经有打卡记录
    const { data: existing } = await supabase
      .from("user_checkins")
      .select("id, word_count")
      .eq("user_id", userId)
      .eq("checkin_date", today)
      .maybeSingle();

    if (existing) {
      // 如果有，累加 word_count
      const newCount = (existing.word_count ?? 0) + increment;
      const { error: updateError } = await supabase
        .from("user_checkins")
        .update({ word_count: newCount })
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      // 如果没有，新增今日记录
      const { error: insertError } = await supabase
        .from("user_checkins")
        .insert({
          user_id: userId,
          checkin_date: today,
          word_count: increment,
        });

      if (insertError) throw insertError;
    }

    // 2. 重新获取并返回今日最新的打卡状态
    // 获取近30天打卡数据
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .from("user_checkins")
      .select("checkin_date, word_count")
      .eq("user_id", userId)
      .gte("checkin_date", thirtyDaysAgo)
      .order("checkin_date", { ascending: false });

    const calendar = (rows ?? []).map((r: Record<string, unknown>) => ({
      date: r.checkin_date as string,
      count: r.word_count as number,
    }));

    let streak = 0;
    const checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (calendar.some((c) => c.date === dateStr && c.count >= 10)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    const todayCheckin = calendar.find((c) => c.date === today);

    return successResponse({
      streak,
      todayCompleted: (todayCheckin?.count ?? 0) >= 10,
      todayCount: todayCheckin?.count ?? 0,
      calendar,
    } satisfies CheckinStatus);
  } catch (err: any) {
    console.error("Checkin POST error:", err);
    return errorResponse("internal_error", err.message ?? "打卡失败，请重试。", 500);
  }
}
