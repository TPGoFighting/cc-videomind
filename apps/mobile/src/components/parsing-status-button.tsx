import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { X, Trash2, CheckCircle2, AlertCircle, FileVideo, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { useStorageState } from "@/hooks/use-storage-state";
import { type ParsingTask, clearFinishedTasks, removeParsingTask } from "@/lib/tasks";

// SVG path for 进度条_svg.svg from D:\C_Game\icons
const PROGRESS_ICON_PATH =
  "M6.7998 3.2998C7.73869 3.2998 8.5 4.06112 8.5 5C8.5 5.93888 7.73869 6.7002 6.7998 6.7002H3.2002C2.26131 6.7002 1.5 5.93888 1.5 5C1.5 4.06112 2.26131 3.2998 3.2002 3.2998H6.7998ZM4.46973 4.40039C4.21608 4.40039 4.08902 4.39982 4.00488 4.47168C3.99298 4.48185 3.98186 4.49298 3.97168 4.50488C3.89983 4.58901 3.90039 4.71612 3.90039 4.96973V5.03027C3.90039 5.28387 3.89983 5.41099 3.97168 5.49512C3.98186 5.50702 3.99298 5.51815 4.00488 5.52832C4.08902 5.60018 4.21608 5.59961 4.46973 5.59961H6.7998C7.13117 5.59961 7.40039 5.33137 7.40039 5C7.40039 4.66863 7.13118 4.40039 6.7998 4.40039H4.46973Z";

export function ParsingStatusButton({ size = 20 }: { size?: number }) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { width } = useWindowDimensions();
  const [tasks] = useStorageState<ParsingTask[]>("settings:parsing-tasks", []);
  const [isOpen, setIsOpen] = useState(false);

  // Animation values
  const spinValue = useSharedValue(0);
  const glowValue = useSharedValue(0.7);

  const activeTasks = tasks.filter(t => t.status === "uploading" || t.status === "parsing");
  const hasActive = activeTasks.length > 0;

  useEffect(() => {
    if (hasActive) {
      // Continuous smooth rotation for loading
      spinValue.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
      // Pulsing glow for the badge
      glowValue.value = withRepeat(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
    } else {
      spinValue.value = withTiming(0, { duration: 500 });
      glowValue.value = withTiming(0.8, { duration: 500 });
    }
  }, [hasActive]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value}deg` }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowValue.value }],
    opacity: hasActive ? 0.9 : 0,
  }));

  const handleOpen = () => {
    haptics.selection();
    setIsOpen(true);
  };

  const handleClose = () => {
    haptics.light();
    setIsOpen(false);
  };

  const handleClearAll = () => {
    haptics.medium();
    clearFinishedTasks();
  };

  const handleTaskPress = (task: ParsingTask) => {
    if (task.status === "completed") {
      haptics.success();
      setIsOpen(false);
      router.push(`/video/${task.id}`);
    }
  };

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: hasActive ? `${theme.colors.accent}40` : "transparent",
            borderWidth: hasActive ? 1 : 0,
          },
        ]}
      >
        <Animated.View style={animatedIconStyle}>
          <Svg width={size} height={size} viewBox="0 0 10 10" fill="none">
            <Path d={PROGRESS_ICON_PATH} fill={hasActive ? theme.colors.accent : theme.colors.text} />
          </Svg>
        </Animated.View>

        {/* Small Active Task Notification Badge */}
        {hasActive && (
          <Animated.View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.accent },
              animatedGlowStyle,
            ]}
          />
        )}
      </Pressable>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                width: width > 500 ? 460 : "92%",
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Svg width={20} height={20} viewBox="0 0 10 10" fill="none">
                  <Path d={PROGRESS_ICON_PATH} fill={theme.colors.accent} />
                </Svg>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>后台解析进度</Text>
              </View>
              
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {tasks.length > 0 && (
                  <Pressable
                    onPress={handleClearAll}
                    style={styles.headerAction}
                    accessibilityLabel="清除已完成任务"
                  >
                    <Trash2 color={theme.colors.muted} size={18} />
                  </Pressable>
                )}
                <Pressable onPress={handleClose} style={styles.closeButton}>
                  <X color={theme.colors.text} size={20} />
                </Pressable>
              </View>
            </View>

            {/* Tasks List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {tasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FileVideo color={theme.colors.muted} size={48} strokeWidth={1.5} />
                  <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                    暂无后台视频解析任务
                  </Text>
                  <Text style={[styles.emptySub, { color: theme.colors.subtle }]}>
                    您可以通过底部的“创建”按钮导入并开始解析视频，进度会实时在此显示。
                  </Text>
                </View>
              ) : (
                tasks.map(task => {
                  const isUploading = task.status === "uploading";
                  const isParsing = task.status === "parsing";
                  const isCompleted = task.status === "completed";
                  const isFailed = task.status === "failed";

                  return (
                    <Pressable
                      key={task.id}
                      onPress={() => handleTaskPress(task)}
                      disabled={!isCompleted}
                      style={({ pressed }) => [
                        styles.taskRow,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: pressed ? theme.colors.surfaceRaised : "transparent",
                          opacity: isFailed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <View style={styles.taskHeader}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.taskTitle,
                              { color: theme.colors.text, fontWeight: "700" },
                            ]}
                          >
                            {task.title}
                          </Text>
                          <Text style={[styles.taskTime, { color: theme.colors.muted }]}>
                            {new Date(task.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>

                        {/* Status Icon Indicator */}
                        <View style={styles.statusIndicator}>
                          {(isUploading || isParsing) && (
                            <ActivityIndicator size="small" color={theme.colors.accent} />
                          )}
                          {isCompleted && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <CheckCircle2 color={theme.colors.success} size={18} />
                              <ChevronRight color={theme.colors.muted} size={14} />
                            </View>
                          )}
                          {isFailed && <AlertCircle color={theme.colors.danger} size={18} />}
                        </View>
                      </View>

                      {/* Progress / Details */}
                      {(isUploading || isParsing) && (
                        <View style={styles.progressContainer}>
                          <View
                            style={[
                              styles.progressBarBg,
                              { backgroundColor: theme.colors.border },
                            ]}
                          >
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  backgroundColor: theme.colors.accent,
                                  width: `${task.progress}%`,
                                },
                              ]}
                            />
                          </View>
                          <View style={styles.progressTextRow}>
                            <Text style={[styles.statusText, { color: theme.colors.accent }]}>
                              {isUploading ? "正在上传媒体..." : "正在提取语音与翻译..."}
                            </Text>
                            <Text style={[styles.progressPct, { color: theme.colors.accent }]}>
                              {task.progress}%
                            </Text>
                          </View>
                        </View>
                      )}

                      {isCompleted && (
                        <Text style={[styles.statusText, { color: theme.colors.success, marginTop: 4 }]}>
                          解析完成！点击立即进入学习空间
                        </Text>
                      )}

                      {isFailed && (
                        <View style={{ gap: 4, marginTop: 4 }}>
                          <Text style={[styles.statusText, { color: theme.colors.danger }]}>
                            解析失败
                          </Text>
                          <Text style={[styles.errorText, { color: theme.colors.muted }]}>
                            {task.errorMessage || "获取音频数据或转录服务异常。"}
                          </Text>
                        </View>
                      )}

                      {/* Delete Individual Task Button */}
                      {(isCompleted || isFailed) && (
                        <Pressable
                          onPress={() => {
                            haptics.light();
                            removeParsingTask(task.id);
                          }}
                          style={styles.deleteTaskButton}
                        >
                          <X color={theme.colors.muted} size={14} />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    maxHeight: "75%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  headerAction: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 42,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "800",
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  taskRow: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    position: "relative",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskTitle: {
    fontSize: 14,
    maxWidth: "85%",
  },
  taskTime: {
    fontSize: 11,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    marginTop: 10,
    gap: 6,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 2.5,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2.5,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressPct: {
    fontSize: 12,
    fontWeight: "900",
  },
  errorText: {
    fontSize: 11,
    lineHeight: 16,
  },
  deleteTaskButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
  },
});
