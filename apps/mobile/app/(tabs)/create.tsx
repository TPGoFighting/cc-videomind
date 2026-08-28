import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link, FolderOpen, Image as ImageIcon } from "lucide-react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { useStorageState } from "@/hooks/use-storage-state";
import { Button, Card, Field, Screen, StatusMessage, Title } from "@/components/ui";
import { addParsingTask } from "@/lib/tasks";
import { storage } from "@/lib/storage";
import { importedVideoTitle, parseVideoInput } from "@/lib/mobile-utils";

/** Deep-link fallback for the create tab. The tab press normally opens the
 * shared bottom sheet in the tab layout; this route remains usable when it is
 * opened directly by a link or Android back-stack restore. */
export default function CreateScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitUrl = () => {
    const parsed = parseVideoInput(url);
    if (!parsed) {
      setError("请输入有效的 YouTube 或 B站链接，或 11 位视频 ID。");
      return;
    }
    haptics.success();
    const title = importedVideoTitle(parsed);
    addParsingTask(parsed.id, title, "parsing", 10);
    const current = storage.get<string[]>("settings:my-media-ids", []);
    if (!current.includes(parsed.id)) storage.set("settings:my-media-ids", [parsed.id, ...current]);
    setUrl("");
    router.push(`/video/${parsed.id}`);
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: theme.spacing.page, paddingBottom: theme.spacing.page + 90, gap: 18 }}
          >
            <Title>创建学习内容</Title>
            <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 21 }}>
              导入一个视频，Teach Player 会为你准备字幕和练习。
            </Text>

            <Card style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Link color={theme.colors.accent} size={22} />
                <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "800" }}>通过 URL 导入</Text>
              </View>
              <Field
                label="视频链接或 ID"
                value={url}
                onChangeText={(value) => { setUrl(value); setError(null); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={submitUrl}
                placeholder="youtube.com/watch?v=..."
              />
              {error ? <StatusMessage tone="danger">{error}</StatusMessage> : null}
              <Button
                title="开始学习"
                disabled={url.trim().length === 0}
                onPress={submitUrl}
              />
            </Card>

            <Card style={{ gap: 12 }}>
              <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "800" }}>本地内容</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 21 }}>
                本地视频、音频和相册导入需要 Pro 或 Max 方案，请使用底部“创建”入口选择文件。
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <FolderOpen color={theme.colors.blue} size={22} />
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>文件</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <ImageIcon color={theme.colors.warm} size={22} />
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>相册</Text>
                </View>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}
