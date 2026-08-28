import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminVideos } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { Card, MutedText, Screen, StatusMessage } from "@/components/ui";
import { LocalIcon } from "@/components/local-icon";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components/page-header";

export default function AdminVideosScreen() {
  const { theme } = useTheme();
  const { accessToken, isAdmin } = useAuth();

  const query = useQuery({
    queryKey: ["admin-videos", accessToken],
    queryFn: () => getAdminVideos(accessToken),
    enabled: Boolean(isAdmin && accessToken),
  });

  if (!isAdmin) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <PageHeader title="用户视频记录" onBack={() => router.back()} />
          <View style={{ padding: theme.spacing.page }}>
            <StatusMessage tone="danger">仅管理员可以查看用户视频记录。</StatusMessage>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PageHeader title="用户视频记录" onBack={() => router.back()} />
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
              <LocalIcon name="document" size={32} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>用户视频记录</Text>
                <MutedText>全站用户最近解析过的视频，最多显示 100 条。</MutedText>
              </View>
            </View>
          </Card>

          {query.isPending ? <StatusMessage tone="neutral">正在加载视频记录...</StatusMessage> : null}
          {query.error instanceof Error ? <StatusMessage tone="danger">{query.error.message}</StatusMessage> : null}
          {query.data?.length === 0 ? <StatusMessage tone="neutral">暂无解析记录。</StatusMessage> : null}

          <View style={{ gap: 10 }}>
            {query.data?.map((video) => (
              <Pressable
                key={`${video.videoId}-${video.parsedAt}`}
                accessibilityRole="button"
                accessibilityLabel={`打开视频：${video.title}`}
                onPress={() => router.push(`/video/${video.videoId}`)}
                style={({ pressed }) => ({
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  padding: 12,
                  flexDirection: "row",
                  gap: 12,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                {video.thumbnail ? (
                  <Image
                    source={{ uri: video.thumbnail }}
                    resizeMode="cover"
                    style={{ width: 96, height: 54, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceRaised }}
                  />
                ) : (
                  <View
                    style={{
                      width: 96,
                      height: 54,
                      borderRadius: theme.radius.sm,
                      backgroundColor: theme.colors.surfaceRaised,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LocalIcon name="play" size={24} color={theme.colors.muted} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text numberOfLines={2} style={{ color: theme.colors.text, fontSize: 14, fontWeight: "900" }}>
                    {video.title}
                  </Text>
                  <MutedText>{video.channelName}</MutedText>
                  <Text numberOfLines={1} style={{ color: theme.colors.subtle, fontSize: 12 }}>
                    {new Date(video.parsedAt).toLocaleString()} · {video.parsedBy}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
