import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Sparkles, Trophy } from "lucide-react-native";
import Animated, { FadeIn, FadeInUp, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { StreakBadge } from "./streak-badge";
import { Button } from "./ui";

interface CheckinModalProps {
  visible: boolean;
  streak: number;
  reward?: number;
  onClose: () => void;
}

export function CheckinModal({ visible, streak, reward = 20, onClose }: CheckinModalProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();

  // Trigger high success haptics when pop up
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        haptics.success();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          entering={ZoomIn.duration(400).springify()}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header sparkles */}
          <View style={styles.sparkleRow}>
            <Sparkles color={theme.colors.gold} size={28} style={styles.sparkleLeft} />
            <StreakBadge days={streak} active={true} size="lg" />
            <Sparkles color={theme.colors.gold} size={28} style={styles.sparkleRight} />
          </View>

          {/* Success Title */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              每日打卡成功！
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              太棒了！您已连续打卡 <Text style={{ color: theme.colors.accent, fontWeight: "900" }}>{streak}</Text> 天！
            </Text>
          </Animated.View>

          {/* Reward block */}
          <Animated.View
            entering={FadeInUp.delay(350).duration(400)}
            style={[styles.rewardBlock, { backgroundColor: `${theme.colors.accent}15`, borderColor: `${theme.colors.accent}33` }]}
          >
            <View style={[styles.rewardBadge, { backgroundColor: theme.colors.accent }]}>
              <Trophy color="#0A1A00" size={18} strokeWidth={2.5} />
            </View>
            <View style={styles.rewardTextCol}>
              <Text style={[styles.rewardTitle, { color: theme.colors.text }]}>今日打卡奖励</Text>
              <Text style={[styles.rewardValue, { color: theme.colors.accent }]}>+{reward} 经验值</Text>
            </View>
          </Animated.View>

          {/* Encorage speech */}
          <Text style={[styles.quote, { color: theme.colors.subtle }]}>
            “日拱一卒无有尽，功不唐捐终入海。继续保持这个优秀的学习节奏吧！”
          </Text>

          {/* Footer action button */}
          <Animated.View entering={FadeIn.delay(500).duration(300)} style={{ width: "100%", marginTop: 10 }}>
            <Button
              title="太棒了，继续学习"
              onPress={() => {
                haptics.medium();
                onClose();
              }}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.76)",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 26,
    alignItems: "center",
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  sparkleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
    paddingVertical: 10,
  },
  sparkleLeft: {
    position: "absolute",
    left: 48,
    top: 14,
    transform: [{ rotate: "-15deg" }],
  },
  sparkleRight: {
    position: "absolute",
    right: 48,
    top: 14,
    transform: [{ rotate: "15deg" }],
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 22,
  },
  rewardBlock: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rewardBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardTextCol: {
    flex: 1,
    gap: 2,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  quote: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 10,
  },
});
