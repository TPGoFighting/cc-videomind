import { useCallback } from "react";
import { useStorageState } from "@/hooks/use-storage-state";
import { useAuth } from "@/providers/auth-provider";
import { postCheckin } from "@/lib/api";

/**
 * 打卡逻辑 hook
 * 管理连续打卡天数、打卡历史热力图、今日是否已打卡
 */
export function useCheckin() {
  const { accessToken } = useAuth();
  const [streak, setStreak] = useStorageState<number>("tp:review-streak", 0);
  const [lastCheckinDate, setLastCheckinDate] = useStorageState<string | null>("tp:last-checkin-date", null);
  const [checkinHistory, setCheckinHistory] = useStorageState<Array<{ date: string; count: number }>>(
    "tp:checkin-history",
    []
  );

  /** 每答对一道题时调用，累加热力图 & 首次答对触发打卡弹窗 */
  const triggerCheckin = useCallback((): boolean => {
    const todayStr = new Date().toISOString().split("T")[0];

    if (lastCheckinDate === todayStr) {
      // 今天已打卡，仅累加热力图计数
      const updatedHistory = checkinHistory.map((h) => {
        if (h.date === todayStr) return { ...h, count: h.count + 5 };
        return h;
      });
      const hasRecord = checkinHistory.some(h => h.date === todayStr);
      if (!hasRecord) updatedHistory.push({ date: todayStr, count: 5 });
      setCheckinHistory(updatedHistory);
      return false; // 不弹窗
    }

    // 首次打卡，计算连续天数
    let newStreak = streak;
    if (lastCheckinDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      newStreak = lastCheckinDate === yesterdayStr ? streak + 1 : 1;
    } else {
      newStreak = 1;
    }

    setStreak(newStreak);
    setLastCheckinDate(todayStr);
    const newRecord = { date: todayStr, count: 10 };
    setCheckinHistory([...checkinHistory.filter(h => h.date !== todayStr), newRecord]);

    return true; // 需要弹窗
  }, [streak, lastCheckinDate, checkinHistory, setStreak, setLastCheckinDate, setCheckinHistory]);

  /** 完成一轮挑战（5题）后提交到云端 */
  const submitCompletion = useCallback(async (totalQuestions: number) => {
    if (accessToken) {
      try {
        const newStatus = await postCheckin(totalQuestions, accessToken);
        if (newStatus && typeof newStatus.streak === "number") {
          setStreak(newStatus.streak);
          if (Array.isArray(newStatus.calendar)) {
            setCheckinHistory(newStatus.calendar);
          }
        }
      } catch (err) {
        console.error("Failed to post checkin to database:", err);
      }
    } else {
      // 游客模式：仅本地打卡
      const todayStr = new Date().toISOString().split("T")[0];
      const newHistory = [...checkinHistory];
      const record = newHistory.find(h => h.date === todayStr);
      if (record) {
        record.count += totalQuestions;
      } else {
        newHistory.push({ date: todayStr, count: totalQuestions });
      }
      setCheckinHistory(newHistory);
    }
  }, [accessToken, checkinHistory, setStreak, setCheckinHistory]);

  return {
    streak,
    checkinHistory,
    triggerCheckin,
    submitCompletion,
  };
}
