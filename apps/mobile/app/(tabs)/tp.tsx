import { useMemo, useState, useEffect } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  BookOpen,
  ArrowRight,
  Flame,
  Headphones,
  Layers,
  Lock,
  Mic,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  HelpCircle,
  type LucideIcon,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { useStorageState } from "@/hooks/use-storage-state";
import { ParsingStatusButton } from "@/components/parsing-status-button";
import { Screen } from "@/components/ui";
import { type MockWord } from "@/lib/mock-data";
import { TP_PRACTICE_MODULES, type TpPracticeKind, type TpPracticeModule } from "@/lib/tp-practice";
import { DEFAULT_USER_AVATAR } from "@/lib/user-profile";
import { CheckinModal } from "@/components/checkin-modal";
import { getCheckin } from "@/lib/api";



const NODE_ICONS: Record<TpPracticeKind, LucideIcon> = {
  speaking: Mic,
  listening: Headphones,
  mistakes: RotateCcw,
  words: BookOpen,
  stories: Layers,
};

const PREVIEW_RENDERERS: Record<TpPracticeKind, (accent: string) => React.ReactNode> = {
  speaking: (accent) => (
    <View style={styles.previewBars}>
      {[14, 25, 38, 22, 32].map((height, index) => (
        <View key={index} style={[styles.waveBar, { height, backgroundColor: accent }]} />
      ))}
    </View>
  ),
  listening: (accent) => (
    <View style={styles.listenPreview}>
      <View style={[styles.soundRing, { borderColor: `${accent}33` }]} />
      <Headphones color={accent} size={30} strokeWidth={3} />
    </View>
  ),
  mistakes: (accent) => (
    <View style={styles.mistakePreview}>
      <View style={[styles.mistakeCard, { backgroundColor: `${accent}22`, transform: [{ rotate: "-8deg" }] }]} />
      <View style={[styles.mistakeCard, { backgroundColor: accent, transform: [{ rotate: "8deg" }] }]} />
    </View>
  ),
  words: (accent) => (
    <View style={[styles.wordPreview, { backgroundColor: `${accent}22` }]}>
      <Text style={[styles.wordPreviewText, { color: accent }]}>Aa</Text>
    </View>
  ),
  stories: (accent) => (
    <View style={styles.storyPreview}>
      <View style={[styles.storyPage, { backgroundColor: `${accent}33` }]} />
      <View style={[styles.storyPage, { backgroundColor: accent }]} />
    </View>
  ),
};

function daysBetween(date: string) {
  const current = new Date();
  const previous = new Date(date);
  if (Number.isNaN(previous.getTime())) return 99;
  return Math.max(0, Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)));
}

function longestCheckinStreak(history: Array<{ date: string; count: number }>) {
  const activeDates = new Set(history.filter((item) => item.count > 0).map((item) => item.date));
  let longest = 0;

  for (const date of activeDates) {
    const start = new Date(`${date}T00:00:00`);
    const previous = new Date(start);
    previous.setDate(previous.getDate() - 1);
    if (activeDates.has(previous.toISOString().split("T")[0])) continue;

    let length = 1;
    const cursor = new Date(start);
    while (true) {
      cursor.setDate(cursor.getDate() + 1);
      if (!activeDates.has(cursor.toISOString().split("T")[0])) break;
      length += 1;
    }
    longest = Math.max(longest, length);
  }

  return longest;
}

export default function TpTabScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { subscriptionTier, accessToken } = useAuth();
  const insets = useSafeAreaInsets();

  // Words lists & stats
  const [words] = useStorageState<MockWord[]>("settings:my-words-list", []);
  const [streak, setStreak] = useStorageState<number>("tp:review-streak", 0);
  const [avatarUri] = useStorageState<string | null>("user:avatar-uri", null);

  // Checkin & Heatmap stats
  const [checkinHistory, setCheckinHistory] = useStorageState<Array<{ date: string; count: number }>>(
    "tp:checkin-history",
    []
  );

  // Auto-sync streaks and heatmap with database if logged in
  useEffect(() => {
    if (accessToken) {
      getCheckin(accessToken)
        .then((data) => {
          if (data) {
            if (typeof data.streak === "number") {
              setStreak(data.streak);
            }
            if (Array.isArray(data.calendar)) {
              // Convert calendar date data to state history
              setCheckinHistory(data.calendar);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to sync checkin status with database:", err);
        });
    }
  }, [accessToken]);

  // Custom states
  const [selectedCell, setSelectedCell] = useState<{ dateStr: string; count: number } | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);

  const isPremium = subscriptionTier === "pro" || subscriptionTier === "max";

  const reviewQueue = useMemo(() => {
    return words
      .filter((word) => daysBetween(word.date) >= 1)
      .sort((a, b) => daysBetween(b.date) - daysBetween(a.date) || b.occurrences - a.occurrences);
  }, [words]);

  const dueCount = reviewQueue.length;
  const masteredCount = Math.max(0, words.length - dueCount);
  const today = new Date();
  const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`;
  const todayStr = today.toISOString().split("T")[0];



  // GitHub contribution grid data (7 rows x 12 weeks = 84 days)
  const heatmapData = useMemo(() => {
    const currentDay = today.getDay(); // 0 = Sunday
    const sundayOfCurrentWeek = new Date(today);
    sundayOfCurrentWeek.setDate(today.getDate() - currentDay);

    const startDate = new Date(sundayOfCurrentWeek);
    startDate.setDate(sundayOfCurrentWeek.getDate() - 11 * 7); // Go back 11 weeks

    const columns = [];
    for (let c = 0; c < 12; c++) {
      const colDays = [];
      for (let r = 0; r < 7; r++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + (c * 7 + r));
        const dateStr = d.toISOString().split("T")[0];

        // Find record in history
        const record = checkinHistory.find((h) => h.date === dateStr);
        const count = record ? record.count : 0;

        colDays.push({
          dateStr,
          count,
          dayOfWeek: r,
          isToday: dateStr === todayStr,
        });
      }
      columns.push(colDays);
    }
    return columns;
  }, [checkinHistory, todayStr]);

  const totalCheckins = useMemo(() => {
    return checkinHistory.filter(h => h.count > 0).length;
  }, [checkinHistory]);

  const maxStreak = useMemo(() => longestCheckinStreak(checkinHistory), [checkinHistory]);

  const openPractice = (id: TpPracticeKind | "daily") => {
    haptics.success();
    const target = id === "daily" ? "words" : id;
    router.push({ pathname: "/tp-practice/[kind]", params: { kind: target } });
  };

  // Cell style by checkin count
  const getCellColor = (count: number) => {
    if (count === 0) return theme.colors.surfaceRaised;
    if (count <= 5) return `${theme.colors.accent}40`; // light green
    if (count <= 15) return `${theme.colors.accent}80`; // medium green
    return theme.colors.accent; // deep active green
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Unified Premium Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              haptics.selection();
              router.push("/settings");
            }}
            style={[styles.avatarButton, { backgroundColor: theme.colors.surfaceRaised }]}
            accessibilityRole="button"
            accessibilityLabel="打开设置"
          >
            <Image source={avatarUri ? { uri: avatarUri } : DEFAULT_USER_AVATAR} style={styles.headerAvatar} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>TP 空间</Text>

          <View style={styles.headerActions}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.colors.surfaceRaised }]}
              onPress={() => { haptics.light(); router.push("/words"); }}
              accessibilityRole="button"
              accessibilityLabel="打开单词本"
            >
              <Search color={theme.colors.text} size={20} />
            </Pressable>
            <ParsingStatusButton />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(42, insets.bottom + 32) }}
        >
          {/* Status Capsule Stats Row */}
          <View style={styles.statsRow}>
            <StatPill icon={Flame} value={String(streak)} color={theme.colors.accent} label="连续" />
          </View>

          {/* Duolingo Bouncy Daily Banner */}
          <Pressable
            onPress={() => openPractice("daily")}
            accessibilityRole="button"
            accessibilityLabel="开始每日巩固练习"
            style={({ pressed }) => [
              styles.dailyBanner,
              {
                backgroundColor: theme.colors.accent,
                borderBottomColor: `${theme.colors.accent}CC`,
                shadowColor: theme.colors.accent,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.badgeRow}>
                <Text style={styles.dailyDate}>{dateLabel}</Text>
                <View style={styles.hotPill}>
                  <Text style={styles.hotPillText}>HOT</Text>
                </View>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.dailyTitle}>每日巩固练习</Text>
              <Text style={styles.dailySubtitle}>
                {dueCount > 0 ? `${dueCount} 个词等待复习` : "今天还没有待复习词，先完成一轮练习"}
              </Text>
            </View>
            <Image
              source={require("../../assets/mascot-review.png")}
              accessibilityLabel="复习小助手"
              style={styles.dailyMascot}
            />
            <View style={styles.dailyReward}>
              <Text style={styles.dailyRewardText}>开始</Text>
              <ArrowRight color="#0A1A00" size={16} strokeWidth={2.5} />
            </View>
          </Pressable>

          {/* GitHub Style Heatmap Grid Dashboard */}
          <View style={[styles.heatmapCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.heatmapHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Trophy color={theme.colors.accent} size={18} />
                <Text style={[styles.heatmapTitle, { color: theme.colors.text }]}>打卡日历热力图</Text>
              </View>
              <Text style={[styles.heatmapStreakText, { color: theme.colors.muted }]}>
                连续打卡: <Text style={{ color: theme.colors.accent, fontWeight: "800" }}>{streak}</Text> 天
              </Text>
            </View>

            {/* Scrolling grid */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
              <View style={styles.gridWrapper}>
                {heatmapData.map((week, c) => (
                  <View key={c} style={styles.gridColumn}>
                    {week.map((day, r) => {
                      const isCellSelected = selectedCell?.dateStr === day.dateStr;
                      return (
                        <Pressable
                          key={r}
                          accessibilityRole="button"
                          accessibilityLabel={`${day.dateStr}，练习 ${day.count} 次`}
                          hitSlop={8}
                          onPress={() => {
                            haptics.light();
                            setSelectedCell(isCellSelected ? null : { dateStr: day.dateStr, count: day.count });
                          }}
                          style={[
                            styles.gridCell,
                            {
                              backgroundColor: getCellColor(day.count),
                              borderColor: day.isToday ? theme.colors.accent : isCellSelected ? theme.colors.text : "transparent",
                              borderWidth: day.isToday || isCellSelected ? 1.5 : 0,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Heatmap Legend */}
            <View style={styles.heatmapFooter}>
              <Text style={[styles.legendText, { color: theme.colors.subtle }]}>少</Text>
              <View style={[styles.legendCell, { backgroundColor: theme.colors.surfaceRaised }]} />
              <View style={[styles.legendCell, { backgroundColor: `${theme.colors.accent}40` }]} />
              <View style={[styles.legendCell, { backgroundColor: `${theme.colors.accent}80` }]} />
              <View style={[styles.legendCell, { backgroundColor: theme.colors.accent }]} />
              <Text style={[styles.legendText, { color: theme.colors.subtle, marginRight: 12 }]}>多</Text>
              <HelpCircle color={theme.colors.subtle} size={14} />
            </View>

            {/* Selected cell tooltip details block */}
            {selectedCell ? (
              <View style={[styles.tooltipBlock, { backgroundColor: theme.colors.surfaceRaised }]}>
                <Text style={[styles.tooltipText, { color: theme.colors.text }]}>
                  📅 {selectedCell.dateStr}
                  {selectedCell.count > 0
                    ? ` : 累计练习 ${selectedCell.count} 个语料，打卡成功！`
                    : " : 这一天没有打卡记录，坚持就是胜利！"}
                </Text>
              </View>
            ) : (
              <View style={styles.dashboardStats}>
                <View style={styles.statMiniCard}>
                  <Text style={[styles.statMiniLabel, { color: theme.colors.muted }]}>总打卡天数</Text>
                  <Text style={[styles.statMiniValue, { color: theme.colors.text }]}>{totalCheckins} 天</Text>
                </View>
                <View style={styles.statMiniCard}>
                  <Text style={[styles.statMiniLabel, { color: theme.colors.muted }]}>当前连续</Text>
                  <Text style={[styles.statMiniValue, { color: theme.colors.accent }]}>{streak} 天</Text>
                </View>
                <View style={styles.statMiniCard}>
                  <Text style={[styles.statMiniLabel, { color: theme.colors.muted }]}>最长连续</Text>
                  <Text style={[styles.statMiniValue, { color: theme.colors.gold }]}>{maxStreak} 天</Text>
                </View>
              </View>
            )}
          </View>



          {/* Specialized Practice Card Section */}
          <View style={styles.practicePanel}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>专项练习</Text>
              <Text style={[styles.sectionMeta, { color: theme.colors.subtle }]}>5 类重点训练</Text>
            </View>

            {TP_PRACTICE_MODULES.map((item, index) => {
              const locked = !isPremium && index > 2;
              return (
                <PracticeRow
                  key={item.id}
                  item={item}
                  locked={locked}
                  onPress={() => {
                    if (locked) {
                      haptics.selection();
                      router.push("/settings/subscription");
                    } else {
                      openPractice(item.id);
                    }
                  }}
                />
              );
            })}
          </View>

          {/* Pro Premium Upgrade Prompt Strip */}
          {!isPremium ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                router.push("/settings/subscription");
              }}
              style={[styles.upgradeStrip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="查看 Pro 方案"
            >
              <Trophy color={theme.colors.gold} size={26} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.upgradeTitle, { color: theme.colors.text }]}>Pro 解锁完整科学训练路径</Text>
                <Text style={[styles.upgradeText, { color: theme.colors.muted }]}>包含情境故事、错题巩固及高效口语复述。</Text>
              </View>
            </Pressable>
          ) : null}
        </ScrollView>

        {/* Global Daily Checkin Modal Success Popup */}
        <CheckinModal
          visible={showCheckinModal}
          streak={streak}
          reward={25}
          onClose={() => setShowCheckinModal(false)}
        />
      </SafeAreaView>
    </Screen>
  );
}



function PracticeRow({ item, locked, onPress }: { item: TpPracticeModule; locked: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const Icon = NODE_ICONS[item.id];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${locked ? "，需要升级方案" : "，开始练习"}`}
      accessibilityState={{ disabled: locked }}
      style={({ pressed }) => [
        styles.practiceRow,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.practiceCopy}>
        <Text style={[styles.practiceTitle, { color: theme.colors.text }]}>{item.title}</Text>
        <Text numberOfLines={1} style={[styles.practiceSubtitle, { color: theme.colors.muted }]}>{item.subtitle}</Text>
        <View style={styles.practiceChips}>
          {item.options.slice(0, 2).map((option) => (
            <View key={option} style={[styles.practiceChip, { backgroundColor: `${item.accent}12` }]}>
              <Text style={[styles.practiceChipText, { color: item.accent }]}>{option}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.practiceArt, { backgroundColor: `${item.accent}12` }]}>
        {locked ? (
          <View style={{ alignItems: "center", gap: 4 }}>
            <Lock color={theme.colors.subtle} size={26} />
            <Text style={{ color: theme.colors.subtle, fontSize: 10, fontWeight: "800" }}>Pro</Text>
          </View>
        ) : PREVIEW_RENDERERS[item.id](item.accent)}
        <View style={[styles.practiceBadge, { backgroundColor: item.accent }]}>
          <Icon color="#FFFFFF" size={14} strokeWidth={3} />
        </View>
      </View>
    </Pressable>
  );
}

function StatPill({
  icon: Icon,
  value,
  color,
  label,
}: {
  icon: LucideIcon;
  value: string;
  color: string;
  label: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Icon color={color} size={16} fill={`${color}22`} strokeWidth={3} />
      <View style={styles.statTextCol}>
        <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: "cover",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  statPill: {
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statTextCol: {
    justifyContent: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    lineHeight: 16,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 10,
  },
  dailyBanner: {
    marginHorizontal: 20,
    minHeight: 124,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 6,
    borderBottomColor: "#46A302",
    marginBottom: 16,
    shadowColor: "#58CC02",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  dailyMascot: {
    width: 76,
    height: 76,
    resizeMode: "contain",
    marginTop: 18,
    marginRight: -4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hotPill: {
    backgroundColor: "#FFC800",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hotPillText: {
    color: "#0A1A00",
    fontSize: 9,
    fontWeight: "900",
  },
  dailyDate: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    fontWeight: "900",
  },
  dailyTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  dailySubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "700",
  },
  dailyReward: {
    minWidth: 54,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.36)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 8,
  },
  dailyRewardText: {
    color: "#0A1A00",
    fontSize: 14,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  heatmapCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 18,
  },
  heatmapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heatmapTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  heatmapStreakText: {
    fontSize: 12,
    fontWeight: "700",
  },
  gridScroll: {
    paddingVertical: 4,
  },
  gridWrapper: {
    flexDirection: "row",
    gap: 5,
  },
  gridColumn: {
    flexDirection: "column",
    gap: 5,
  },
  gridCell: {
    width: 14,
    height: 14,
    borderRadius: 3.5,
  },
  heatmapFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "700",
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2.5,
  },
  dashboardStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  statMiniCard: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    gap: 2,
  },
  statMiniLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  statMiniValue: {
    fontSize: 13,
    fontWeight: "900",
  },
  tooltipBlock: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  tooltipText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  pathArea: {
    height: 486,
    position: "relative",
    marginBottom: 20,
  },
  svgContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  nodeWrap: {
    position: "absolute",
    width: 88,
    height: 88,
    marginLeft: -44,
    alignItems: "center",
  },
  speechBubble: {
    position: "absolute",
    top: -46,
    minWidth: 70,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    zIndex: 3,
  },
  speechText: {
    color: "#58CC02",
    fontSize: 17,
    fontWeight: "900",
  },
  nodeShadow: {
    position: "absolute",
    top: 9,
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  node: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5.5,
    borderColor: "rgba(255,255,255,0.46)",
  },
  mascotStage: {
    position: "absolute",
    width: 100,
    alignItems: "center",
    zIndex: 4,
  },
  tpMascotBubble: {
    position: "absolute",
    top: -38,
    left: "50%",
    marginLeft: -25,
    width: 50,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  tpMascotBubbleText: {
    fontSize: 12,
    fontWeight: "900",
  },
  tpMascot: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#58CC02",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: "#7BEA26",
    transform: [{ rotate: "-3deg" }],
  },
  tpMascotText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  bookBase: {
    marginTop: -8,
    width: 82,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF7D1",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-4deg" }],
    borderWidth: 1,
    borderColor: "#FFDE4D",
  },
  practicePanel: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "800",
  },
  practiceRow: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingLeft: 20,
    paddingRight: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  practiceCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  practiceTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  practiceSubtitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  practiceChips: {
    flexDirection: "row",
    gap: 6,
  },
  practiceChip: {
    minHeight: 22,
    borderRadius: 11,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  practiceChipText: {
    fontSize: 10,
    fontWeight: "900",
  },
  practiceArt: {
    width: 82,
    height: 78,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  practiceBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBars: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  waveBar: {
    width: 7,
    borderRadius: 3.5,
  },
  listenPreview: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  soundRing: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 7,
  },
  mistakePreview: {
    width: 52,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  mistakeCard: {
    position: "absolute",
    width: 38,
    height: 42,
    borderRadius: 10,
  },
  wordPreview: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  wordPreviewText: {
    fontSize: 22,
    fontWeight: "900",
  },
  storyPreview: {
    width: 54,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  storyPage: {
    position: "absolute",
    width: 34,
    height: 42,
    borderRadius: 8,
  },
  upgradeStrip: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  upgradeText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
