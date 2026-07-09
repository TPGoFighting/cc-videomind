import { Pressable, ScrollView, Text, View } from "react-native";
import { ChevronRight, Globe, User, GraduationCap } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { Screen, Card } from "@/components/ui";
import { SUPPORTED_LANGUAGES, getI18nLanguage, setI18nLanguage, type SupportedLangCode } from "@/i18n";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components/page-header";

export default function LanguageSettingsScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { t } = useTranslation();

  const [nativeLang, setNativeLang] = useStorageState("settings:native-lang", "中文");
  const [targetLang, setTargetLang] = useStorageState("settings:target-lang", "English");

  const currentLang = getI18nLanguage();
  const currentLabel = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.label ?? "简体中文";

  const cycleSystemLang = () => {
    haptics.selection();
    const idx = SUPPORTED_LANGUAGES.findIndex((l) => l.code === currentLang);
    const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length];
    setI18nLanguage(next.code);
  };

  const changeNativeLang = () => {
    haptics.selection();
    setNativeLang(nativeLang === "中文" ? "English" : "中文");
  };

  const changeTargetLang = () => {
    haptics.selection();
    setTargetLang(targetLang === "English" ? "Deutsch" : targetLang === "Deutsch" ? "Español" : "English");
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PageHeader title="语言" onBack={() => router.back()} />
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.page,
            gap: 16,
          }}
        >
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {/* Row 1: 系统语言 — 调用 i18n 全局切换 */}
            <Pressable
              onPress={cycleSystemLang}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: 20,
                backgroundColor: pressed ? theme.colors.surfaceRaised : theme.colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${theme.colors.blue}15`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <Globe color={theme.colors.blue} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800" }}>
                  {t("languageSettings.sysLang")}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>{currentLabel}</Text>
              </View>
              <ChevronRight color={theme.colors.subtle} size={20} />
            </Pressable>

            {/* Row 2: 母语 — 业务配置，非 UI 语言 */}
            <Pressable
              onPress={changeNativeLang}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: 20,
                backgroundColor: pressed ? theme.colors.surfaceRaised : theme.colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${theme.colors.accent}15`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <User color={theme.colors.accent} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800" }}>
                  {t("languageSettings.nativeLang")}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>{nativeLang}</Text>
              </View>
              <ChevronRight color={theme.colors.subtle} size={20} />
            </Pressable>

            {/* Row 3: 目标语言 — 业务配置，非 UI 语言 */}
            <Pressable
              onPress={changeTargetLang}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: 20,
                backgroundColor: pressed ? theme.colors.surfaceRaised : theme.colors.surface,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${theme.colors.warm}15`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <GraduationCap color={theme.colors.warm} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800" }}>
                  {t("languageSettings.targetLang")}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>{targetLang}</Text>
              </View>
              <ChevronRight color={theme.colors.subtle} size={20} />
            </Pressable>
          </Card>

          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 13,
              lineHeight: 20,
              paddingHorizontal: 4,
              marginTop: 8,
            }}
          >
            {t("languageSettings.nativeLangHint")}{"\n"}
            {t("languageSettings.targetLangHint")}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
