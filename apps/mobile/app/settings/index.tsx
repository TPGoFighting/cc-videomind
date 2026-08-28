import { Alert, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { useStorageState } from "@/hooks/use-storage-state";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { staggerDelays, useFadeInUp } from "@/lib/animation";
import { planLabels } from "@/lib/plans";
import { Card, Screen, StatusMessage } from "@/components/ui";
import { Glyph } from "@/components/art";
import { LocalIcon } from "@/components/local-icon";
import { SettingsEntry } from "@/components/settings-entry";
import { getDisplayNameFallback } from "@/lib/user-profile";
import { documentDirectory, writeAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { type MockWord } from "@/lib/mock-data";

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const { t } = useTranslation();
  const { user, configured, isAdmin, signOut, subscriptionTier } = useAuth();
  const insets = useSafeAreaInsets();
  const [, , clearVerified] = useStorageState("youtube_verified", false);
  const [displayName] = useStorageState<string>("user:display-name", getDisplayNameFallback(user?.email));
  const [words] = useStorageState<MockWord[]>("settings:my-words-list", []);

  const initialTarget = mode === "system" ? 0 : mode === "light" ? 1 : 2;
  const indicatorPosition = useSharedValue(initialTarget);
  const indicatorScaleX = useSharedValue(1);

  useEffect(() => {
    const target = mode === "system" ? 0 : mode === "light" ? 1 : 2;
    // Viscous Stretch transition!
    indicatorScaleX.value = withSequence(
      withSpring(1.22, { damping: 5, stiffness: 220 }),
      withSpring(1.0, { damping: 10, stiffness: 180 })
    );
    indicatorPosition.value = withSpring(target, { damping: 12, stiffness: 150 });
  }, [mode]);

  const delays = staggerDelays(10, 50);

  const fade0 = useFadeInUp(delays[0]);
  const fade1 = useFadeInUp(delays[1]);
  const fadeLanguage = useFadeInUp(delays[2]);
  const fade2 = useFadeInUp(delays[3]);
  const fade3 = useFadeInUp(delays[4]);
  const fade4 = useFadeInUp(delays[5]);
  const fade5 = useFadeInUp(delays[6]);
  const fade6 = useFadeInUp(delays[7]);
  const fade7 = useFadeInUp(delays[8]);
  const fade8 = useFadeInUp(delays[9]);

  const confirmSignOut = () => {
    haptics.medium();
    if (!user) {
      router.push("/login");
      return;
    }

    Alert.alert(t("settings.signOutConfirmTitle"), t("settings.signOutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.signOut"),
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/");
          } catch (error) {
            Alert.alert("退出失败", error instanceof Error ? error.message : "账户状态未能更新，请重试。");
          }
        },
      },
    ]);
  };

  const exportToAnki = async () => {
    haptics.success();
    if (words.length === 0) {
      Alert.alert("暂无词库", "先从视频字幕中收藏单词，再导出到 Anki。");
      return;
    }
    try {
      // 1. 生成 CSV 数据 (Word, Phonetic, Definition, Example)
      const header = "Word,Phonetic,Definition,Example\n";
      const rows = words.map(w => {
        const cleanDef = (w.definitionZh || "").replace(/"/g, '""').replace(/\n/g, " ");
        const cleanEx = (w.exampleEn || "").replace(/"/g, '""').replace(/\n/g, " ");
        return `"${w.lemma}","${w.phonetic || ""}","${cleanDef}","${cleanEx}"`;
      }).join("\n");
      const csv = header + rows;

      // 2. 写入本地文件
      const fileUri = documentDirectory + "teach-player-anki-export.csv";
      await writeAsStringAsync(fileUri, csv, { encoding: EncodingType.UTF8 });

      // 3. 调起系统分享
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "导出到 Anki",
          UTI: "public.comma-separated-values-text"
        });
      } else {
        Alert.alert("不支持分享", "当前设备不支持分享文件");
      }
    } catch (err) {
      console.error("Anki export failed", err);
      Alert.alert("导出失败", "请稍后重试");
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            padding: theme.spacing.page,
            gap: 14,
            paddingBottom: insets.bottom + 40,
          }}
        >
        {!configured ? (
          <StatusMessage tone="danger">账户服务尚未准备好，请稍后重试。</StatusMessage>
        ) : null}

        {/* 账户概览 */}
        <Animated.View style={fade1}>
          <Pressable
            onPress={() => {
              haptics.selection();
              router.push("/settings/account");
            }}
            style={({ pressed }) => ({
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: pressed ? theme.colors.accent : theme.colors.border,
              backgroundColor: theme.colors.surface,
              padding: 18,
              gap: 14,
              transform: [{ scale: pressed ? 0.985 : 1 }]
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {/* Profile Image with Accent border ring */}
              <View style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                borderWidth: 1.5,
                borderColor: theme.colors.accent,
                backgroundColor: theme.colors.surfaceRaised,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}>
                <Text style={{ color: theme.colors.accent, fontSize: 22, fontWeight: "900" }}>
                  {(displayName || getDisplayNameFallback(user?.email || "U")).slice(0, 1).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "900" }}>
                    {user ? (displayName || getDisplayNameFallback(user.email)) : "游客"}
                  </Text>
                  <View style={{
                    backgroundColor: `${theme.colors.accent}14`,
                    borderRadius: theme.radius.full,
                    paddingHorizontal: 8,
                    paddingVertical: 3
                  }}>
                    <Text style={{ color: theme.colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 0.2 }}>
                      {planLabels[subscriptionTier]}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: theme.colors.muted, fontSize: 13 }} numberOfLines={1}>
                  {user?.email || "游客模式，登录后同步学习数据"}
                </Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {/* GROUP 1: 偏好与外观设定 */}
        <Animated.View style={fade0}>
          <Card style={{ padding: 18, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <LocalIcon name="settings" size={24} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "700" }}>{t("settings.appearance")}</Text>
            </View>
            <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 18 }}>{t("settings.appearanceDesc")}</Text>

            {/* 水银分段滑块 */}
            <View style={{
              flexDirection: "row",
              height: 50,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surfaceRaised,
              padding: 3,
              position: "relative",
              alignItems: "center"
            }}>
              <Animated.View style={[{
                position: "absolute",
                height: 44,
                top: 3,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.accent,
              }, useAnimatedStyle(() => {
                const buttonWidth = (width - theme.spacing.page * 2 - 36 - 6) / 3;
                return {
                  left: 3,
                  width: buttonWidth,
                  transform: [
                    { translateX: indicatorPosition.value * buttonWidth },
                    { scaleX: indicatorScaleX.value }
                  ]
                };
              })]} />

              {(
                [
                  { key: "system", label: t("settings.modeSystem"), icon: "system" },
                  { key: "light", label: t("settings.modeLight"), icon: "sun" },
                  { key: "dark", label: t("settings.modeDark"), icon: "moon" },
                ] as const
              ).map((item) => {
                const active = mode === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setMode(item.key)}
                    accessibilityRole="radio"
                    accessibilityLabel={`外观模式：${item.label}`}
                    accessibilityState={{ selected: active }}
                    style={{
                      flex: 1,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 4,
                      zIndex: 5
                    }}
                  >
                    <Glyph name={item.icon} size={18} color={active ? "#FFFFFF" : theme.colors.text} />
                    <Text style={{ color: active ? "#FFFFFF" : theme.colors.text, fontSize: 13, fontWeight: "700" }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </Animated.View>

        <Animated.View style={fadeLanguage}>
          <SettingsEntry
            icon="book"
            title={t("settings.language")}
            description={t("settings.languageDesc")}
            onPress={() => {
              haptics.selection();
              router.push("/settings/language");
            }}
          />
        </Animated.View>

        {/* GROUP 1.5: 学习数据舱 */}
        <Animated.View style={fade2}>
          <SettingsEntry
            icon="document"
            title="导出词库至 Anki"
            description="生成包含生词、释义、例句的 CSV，完美导入 Anki 记忆库。"
            onPress={exportToAnki}
          />
        </Animated.View>

        {/* GROUP 2: 方案与订阅舱 */}
        <Animated.View style={fade3}>
          <View style={{ gap: 0 }}>
            <SettingsEntry
              icon="trophy"
              title={t("settings.plan")}
              description={`${planLabels[subscriptionTier]} · ${t("settings.planDesc")}`}
              onPress={() => {
                haptics.selection();
                router.push("/settings/plan");
              }}
              style={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderBottomWidth: 0
              }}
            />
            <SettingsEntry
              icon="fire"
              title={t("settings.subscription")}
              description={t("settings.subscriptionDesc")}
              onPress={() => {
                haptics.selection();
                router.push("/settings/subscription");
              }}
              style={{
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0
              }}
            />
          </View>
        </Animated.View>

        {/* GROUP 3: 管理控制舱 */}
        {isAdmin ? (
          <Animated.View style={fade4}>
            <View style={{ gap: 0 }}>
              <SettingsEntry
                icon="settings"
                title={t("settings.aiConfig")}
                description={t("settings.aiConfigDesc")}
                onPress={() => {
                  haptics.selection();
                  router.push("/settings/admin-ai");
                }}
                style={{
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  borderBottomWidth: 0
                }}
              />
              <SettingsEntry
                icon="document"
                title={t("settings.userVideos")}
                description={t("settings.userVideosDesc")}
                onPress={() => {
                  haptics.selection();
                  router.push("/settings/admin-videos");
                }}
                style={{
                  borderRadius: 0,
                  borderBottomWidth: 0
                }}
              />
              <SettingsEntry
                icon="chat"
                title={t("settings.payments")}
                description={t("settings.paymentsDesc")}
                onPress={() => {
                  haptics.selection();
                  router.push("/settings/admin-payments");
                }}
                style={{
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0
                }}
              />
            </View>
          </Animated.View>
        ) : null}

        {/* GROUP 4: 绑定与登出舱 */}
        <Animated.View style={fade7}>
          <View style={{ gap: 0 }}>
            <SettingsEntry
              icon="play"
              title={t("settings.youtubeVerify")}
              description={t("settings.youtubeVerifyDesc")}
              onPress={() => {
                haptics.medium();
                clearVerified();
                router.replace("/verify-youtube");
              }}
              style={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderBottomWidth: 0
              }}
            />
            <SettingsEntry
              icon="lock"
              title={user ? t("settings.signOut") : t("settings.signIn")}
              description={user ? t("settings.signOutDesc") : t("settings.signInDesc")}
              danger={Boolean(user)}
              onPress={confirmSignOut}
              style={{
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0
              }}
            />
          </View>
        </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
