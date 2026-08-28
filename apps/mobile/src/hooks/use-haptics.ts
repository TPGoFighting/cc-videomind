import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { Platform } from "react-native";

type HapticPreset = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

export function useHaptics() {
  const trigger = useCallback((preset: HapticPreset) => {
    if (Platform.OS === "web") return; // Web 不支持触觉

    switch (preset) {
      case "light":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case "selection":
        Haptics.selectionAsync();
        break;
    }
  }, []);

  const light = useCallback(() => trigger("light"), [trigger]);
  const medium = useCallback(() => trigger("medium"), [trigger]);
  const heavy = useCallback(() => trigger("heavy"), [trigger]);
  const success = useCallback(() => trigger("success"), [trigger]);
  const warning = useCallback(() => trigger("warning"), [trigger]);
  const error = useCallback(() => trigger("error"), [trigger]);
  const selection = useCallback(() => trigger("selection"), [trigger]);

  return { trigger, light, medium, heavy, success, warning, error, selection };
}
