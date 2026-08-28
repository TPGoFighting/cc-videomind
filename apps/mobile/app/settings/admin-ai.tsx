import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminSettings, updateAdminSetting } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Button, Card, Field, MutedText, Screen, StatusMessage } from "@/components/ui";
import { LocalIcon } from "@/components/local-icon";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components/page-header";

const settingFields = [
  { key: "ai_provider", label: "AI Provider", placeholder: "deepseek / openai / gemini" },
  { key: "ai_api_key", label: "API Key", placeholder: "sk-..." },
  { key: "ai_api_base_url", label: "Base URL", placeholder: "https://api.openai.com/v1" },
  { key: "ai_model", label: "Model", placeholder: "deepseek-v4-flash" },
] as const;

type SettingKey = (typeof settingFields)[number]["key"];
type SettingsDraft = Record<SettingKey, string>;

const emptyDraft: SettingsDraft = {
  ai_provider: "",
  ai_api_key: "",
  ai_api_base_url: "",
  ai_model: "",
};

export default function AdminAiSettingsScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const { accessToken, isAdmin } = useAuth();
  const [draft, setDraft] = useState<SettingsDraft>(emptyDraft);

  const query = useQuery({
    queryKey: ["admin-settings", accessToken],
    queryFn: () => getAdminSettings(accessToken),
    enabled: Boolean(isAdmin && accessToken),
  });

  useEffect(() => {
    if (!query.data?.config) return;
    setDraft({
      ai_provider: query.data.config.ai_provider ?? "",
      ai_api_key: query.data.config.ai_api_key ?? "",
      ai_api_base_url: query.data.config.ai_api_base_url ?? "",
      ai_model: query.data.config.ai_model ?? "",
    });
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: SettingKey; value: string }) => updateAdminSetting(key, value, accessToken),
    onSuccess: async () => {
      haptics.success();
      await queryClient.invalidateQueries({ queryKey: ["admin-settings", accessToken] });
    },
    onError: () => haptics.error(),
  });

  if (!isAdmin) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <PageHeader title="AI 全局配置" onBack={() => router.back()} />
          <View style={{ padding: theme.spacing.page }}>
            <StatusMessage tone="danger">仅管理员可以访问 AI 全局配置。</StatusMessage>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PageHeader title="AI 全局配置" onBack={() => router.back()} />
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            padding: theme.spacing.page,
            gap: 14,
            paddingBottom: 40,
          }}
        >
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <LocalIcon name="settings" size={32} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>AI 全局配置</Text>
                <MutedText>未配置个人 API 的用户会使用这里的默认 AI 配置。</MutedText>
              </View>
            </View>
          </Card>

          {query.isPending ? <StatusMessage tone="neutral">正在加载配置...</StatusMessage> : null}
          {query.error instanceof Error ? <StatusMessage tone="danger">{query.error.message}</StatusMessage> : null}

          <Card>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>全局默认值</Text>
            {settingFields.map((field) => (
              <View key={field.key} style={{ gap: 8 }}>
                <Field
                  label={field.label}
                  value={draft[field.key]}
                  onChangeText={(value) => setDraft((prev) => ({ ...prev, [field.key]: value }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={field.key === "ai_api_key"}
                  placeholder={field.placeholder}
                />
                <Button
                  title="保存"
                  variant="secondary"
                  loading={mutation.isPending && mutation.variables?.key === field.key}
                  onPress={() => mutation.mutate({ key: field.key, value: draft[field.key].trim() })}
                />
              </View>
            ))}
            {mutation.isSuccess ? <StatusMessage tone="success">配置已保存，下次 AI 请求会使用新配置。</StatusMessage> : null}
            {mutation.error instanceof Error ? <StatusMessage tone="danger">{mutation.error.message}</StatusMessage> : null}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
