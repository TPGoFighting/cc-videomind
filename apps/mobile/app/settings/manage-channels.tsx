import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { User } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { Screen } from "@/components/ui";
import { CHANNELS, type Channel } from "@/lib/mock-data";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components/page-header";

export default function ManageChannelsScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"recommended" | "my">("recommended");

  // Default subscribed channels: 1001 Album, 10% Happier, 13 Again, 14 Minuten
  const [subscribedIds, setSubscribedIds] = useStorageState<string[]>(
    "settings:subscribed-channels",
    ["1001-album", "10-percent-happier", "13-again", "14-minuten"]
  );

  const toggleSubscribe = (channelId: string) => {
    haptics.medium();
    if (subscribedIds.includes(channelId)) {
      setSubscribedIds(subscribedIds.filter((id) => id !== channelId));
    } else {
      setSubscribedIds([...subscribedIds, channelId]);
    }
  };

  // Header login button action
  const handleHeaderAction = () => {
    haptics.selection();
    if (!user) {
      router.push("/login");
    } else {
      router.push("/settings/account");
    }
  };

  // Filters
  const recommendedChannels = CHANNELS.filter((c) => ["ali-abdaal", "bbc-learning-english", "bbc-news", "emma-chamberlain", "vox", "ted"].includes(c.id));
  const myChannels = CHANNELS.filter((c) => subscribedIds.includes(c.id));

  // Determine list to show
  const currentList = activeTab === "recommended" ? recommendedChannels : myChannels;

  // Set navigation header dynamically if possible, or build it inside the screen
  // Expo Router handles header. We can also add a nice custom header inside Screen,
  // but let's let Expo Stack handle the back button and add the login button on the top-right.
  // In React Native / Expo, we can configure Stack Screen options from inside the component using <Stack.Screen />!
  // Let's do that to show the "登录" button on the top right.
  const headerRight = () => (
    <Pressable
      onPress={handleHeaderAction}
      accessibilityRole="button"
      accessibilityLabel={user ? "打开账号设置" : "登录账号"}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
      }}
    >
      <User size={14} color="#0A1A00" />
      <Text style={{ color: "#0A1A00", fontSize: 13, fontWeight: "900" }}>
        {user ? "账号" : "登录"}
      </Text>
    </Pressable>
  );

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PageHeader title="管理订阅" onBack={() => router.back()} right={headerRight()} />
        <View style={{ flex: 1 }}>
          {/* Custom Segmented Control Header */}
          <View style={{ paddingHorizontal: theme.spacing.page, paddingTop: 10, paddingBottom: 15 }}>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme.colors.surfaceRaised,
                borderRadius: theme.radius.xl,
                padding: 4,
                height: 54,
              }}
            >
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setActiveTab("recommended");
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "recommended" }}
                accessibilityLabel="查看推荐频道"
                style={{
                  flex: 1,
                  borderRadius: theme.radius.lg,
                  backgroundColor: activeTab === "recommended" ? theme.colors.accent : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: activeTab === "recommended" ? "#0A1A00" : theme.colors.text,
                    fontSize: 15,
                    fontWeight: "800",
                  }}
                >
                  推荐频道
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setActiveTab("my");
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "my" }}
                accessibilityLabel="查看我的频道"
                style={{
                  flex: 1,
                  borderRadius: theme.radius.lg,
                  backgroundColor: activeTab === "my" ? theme.colors.accent : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: activeTab === "my" ? "#0A1A00" : theme.colors.text,
                    fontSize: 15,
                    fontWeight: "800",
                  }}
                >
                  我的频道
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Channels List */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.page,
              paddingBottom: 40,
              gap: 12,
            }}
          >
            {currentList.map((channel) => {
              const isSubscribed = subscribedIds.includes(channel.id);
              return (
                <View
                  key={channel.id}
                  style={{
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Channel Avatar */}
                  <Image
                    source={{ uri: channel.thumbnailUrl }}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 29,
                      backgroundColor: theme.colors.surfaceRaised,
                    }}
                  />

                  {/* Channel Details */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      numberOfLines={1}
                      style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}
                    >
                      {channel.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 16 }}
                    >
                      {channel.description}
                    </Text>
                    {channel.subscriberCount ? (
                      <Text style={{ color: theme.colors.subtle, fontSize: 11 }}>
                        {channel.subscriberCount}
                      </Text>
                    ) : null}
                  </View>

                  {/* Sub Action Button */}
                  <Pressable
                    onPress={() => toggleSubscribe(channel.id)}
                    accessibilityRole="switch"
                    accessibilityLabel={`${isSubscribed ? "取消订阅" : "订阅"}${channel.name}`}
                    accessibilityState={{ checked: isSubscribed }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16,
                      minHeight: 48,
                      borderRadius: 19,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSubscribed ? "transparent" : "#FFFFFF",
                      borderWidth: isSubscribed ? 1 : 0,
                      borderColor: theme.colors.border,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        color: isSubscribed ? theme.colors.muted : "#000000",
                        fontSize: 13,
                        fontWeight: "800",
                      }}
                    >
                      {isSubscribed ? "已订阅" : "订阅"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}

            {currentList.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}>
                <Text style={{ color: theme.colors.muted, fontSize: 15 }}>
                  {activeTab === "my" ? "暂无已订阅的频道" : "没有推荐的频道"}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Screen>
  );
}
