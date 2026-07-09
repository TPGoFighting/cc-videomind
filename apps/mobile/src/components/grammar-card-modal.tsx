import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View, ActivityIndicator, ScrollView } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomInEasyUp, ZoomOutEasyDown } from "react-native-reanimated";
import { X, Sparkles } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/providers/theme-provider";
import { postGrammarAnalysis, type GrammarAnalysisResult } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { type TranscriptSegment } from "@teach-player/shared";

interface GrammarCardModalProps {
  segment: TranscriptSegment | null;
  videoId: string;
  visible: boolean;
  onClose: () => void;
}

export function GrammarCardModal({
  segment,
  videoId,
  visible,
  onClose,
}: GrammarCardModalProps) {
  const { theme } = useTheme();
  const { accessToken } = useAuth();

  const sentence = segment?.text ?? "";

  const { data, isLoading, error } = useQuery<GrammarAnalysisResult>({
    queryKey: ["grammar", videoId, sentence],
    queryFn: () => postGrammarAnalysis(sentence, videoId, accessToken),
    enabled: visible && sentence.length > 0,
    staleTime: Infinity, // 语法解析不变，长期缓存
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent onRequestClose={onClose} animationType="none">
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{ flex: 1, backgroundColor: "rgba(10, 26, 0, 0.45)", justifyContent: "flex-end" }}
      >
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />

        <Animated.View
          entering={ZoomInEasyUp.springify().damping(15).stiffness(200)}
          exiting={ZoomOutEasyDown.duration(150)}
          style={{
            width: "100%",
            maxHeight: "80%",
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            backgroundColor: theme.colors.surface,
            padding: 24,
            paddingBottom: 40,
            gap: 16,
            borderTopWidth: 1.5,
            borderColor: `${theme.colors.accent}40`,
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles color={theme.colors.accent} size={18} />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>AI 语法解析</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <X color={theme.colors.muted} size={22} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 }}>
              <ActivityIndicator color={theme.colors.accent} size="large" />
              <Text style={{ color: theme.colors.muted, fontWeight: "600" }}>正在深度分析句子结构...</Text>
            </View>
          ) : error ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <Text style={{ color: theme.colors.danger, fontWeight: "600" }}>分析失败，请稍后重试</Text>
            </View>
          ) : data ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
              {/* 原文与翻译 */}
              <View style={{ gap: 8, backgroundColor: theme.colors.surfaceRaised, padding: 14, borderRadius: theme.radius.lg }}>
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "700", lineHeight: 24 }}>
                  {data.sentence}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 20 }}>
                  {data.translation}
                </Text>
              </View>

              {/* 词性高亮标注 */}
              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "800" }}>词性解构</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {data.posTags.map((tag, i) => (
                    <View key={i} style={{ alignItems: "center", backgroundColor: `${tag.color}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.md, borderWidth: 1, borderColor: `${tag.color}30` }}>
                      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: "700" }}>{tag.word}</Text>
                      <Text style={{ color: tag.color, fontSize: 10, fontWeight: "900" }}>{tag.pos}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 语法结构与精讲 */}
              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "800" }}>结构与精讲</Text>
                <View style={{ backgroundColor: `${theme.colors.accent}10`, padding: 14, borderRadius: theme.radius.lg, gap: 8, borderWidth: 1, borderColor: `${theme.colors.accent}25` }}>
                  <Text style={{ color: theme.colors.accent, fontSize: 14, fontWeight: "800" }}>{data.structure}</Text>
                  <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 22 }}>
                    {data.explanation}
                  </Text>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
