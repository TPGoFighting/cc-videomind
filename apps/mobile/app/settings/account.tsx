import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { useStorageState } from "@/hooks/use-storage-state";
import { planLabels } from "@/lib/plans";
import { Button, Card, MutedText, Screen, StatusMessage } from "@/components/ui";
import { changeTencentPassword } from "@/lib/tencent-auth-client";
import { DEFAULT_USER_AVATAR, getDisplayNameFallback } from "@/lib/user-profile";
import { Camera, Mail, User, Lock } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components/page-header";

export default function AccountSettingsScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { user, accessToken, configured, subscriptionTier } = useAuth();

  const [avatarUri, setAvatarUri] = useStorageState<string | null>("user:avatar-uri", null);
  const [displayName, setDisplayName] = useStorageState<string>("user:display-name", getDisplayNameFallback(user?.email));

  // 密码修改状态
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handlePickAvatar = async () => {
    haptics.selection();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("权限不足", "请在设置中允许访问相册权限。");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setAvatarUri(result.assets[0].uri);
        haptics.success();
      }
    } catch (e: any) {
      Alert.alert("操作失败", e?.message || "请使用 npx expo run:android 重新编译后重试。");
    }
  };

  const handleSaveName = () => {
    if (!displayName.trim()) {
      Alert.alert("用户名不能为空", "请输入至少一个字符作为显示名称。");
      return;
    }
    setDisplayName(displayName.trim());
    haptics.success();
    Alert.alert("已保存", "用户名已更新。");
  };

  const handleChangePassword = async () => {
    haptics.medium();
    if (!newPassword || newPassword.length < 8) {
      Alert.alert("密码太短", "新密码至少需要 8 个字符。");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("密码不匹配", "两次输入的新密码不一致，请重新输入。");
      return;
    }
    if (!configured) {
      Alert.alert("无法操作", "账户服务尚未准备好，请稍后重试。");
      return;
    }
    setChangingPassword(true);
    try {
      if (!accessToken) throw new Error("请先登录后再修改密码。");
      await changeTencentPassword(currentPassword, newPassword, accessToken);
      haptics.success();
      Alert.alert("密码已更新", "请使用新密码重新登录。");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (e: any) {
      Alert.alert("修改失败", e?.message || "请确认当前已登录后重试。");
    } finally {
      setChangingPassword(false);
    }
  };

  const avatarSource = avatarUri ? { uri: avatarUri } : DEFAULT_USER_AVATAR;

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PageHeader title="账号信息" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={{ padding: theme.spacing.page, gap: 14, paddingBottom: 40 }}>
          {!configured ? (
            <StatusMessage tone="danger">账户服务尚未准备好，请稍后重试。</StatusMessage>
          ) : null}

          {/* 头像区域 */}
          <Card style={{ alignItems: "center", paddingVertical: 28, gap: 14 }}>
            <Pressable
              onPress={handlePickAvatar}
              accessibilityRole="button"
              accessibilityLabel="更换头像"
            >
              <Image source={avatarSource} style={{ width: 88, height: 88, borderRadius: 44 }} />
              <View style={{
                position: "absolute", bottom: 0, right: 0,
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: theme.colors.accent,
                alignItems: "center", justifyContent: "center",
              }}>
                <Camera color="#0A1A00" size={14} />
              </View>
            </Pressable>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
              {displayName.trim() || getDisplayNameFallback(user?.email)}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 13 }}>点击头像更换照片</Text>
          </Card>

          {/* 用户名编辑 */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <User color={theme.colors.accent} size={18} />
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "800" }}>用户名</Text>
            </View>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="输入显示名称"
              placeholderTextColor={theme.colors.subtle}
              accessibilityLabel="用户名"
              autoCapitalize="words"
              returnKeyType="done"
              style={{
                backgroundColor: theme.colors.surfaceRaised,
                borderRadius: 12, paddingHorizontal: 14, height: 48,
                color: theme.colors.text, fontSize: 14,
              }}
            />
            <Button title="保存用户名" onPress={handleSaveName} variant="secondary" />
          </Card>

          {/* 邮箱（只读） */}
          {user ? (
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Mail color={theme.colors.accent} size={18} />
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "800" }}>邮箱</Text>
              </View>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{user.email ?? "未设置邮箱"}</Text>
            </Card>
          ) : null}

          {/* 当前套餐 */}
          <Card style={{ gap: 6 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "800" }}>当前套餐</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{
                color: subscriptionTier === "free" ? theme.colors.muted : theme.colors.accent,
                fontSize: 18, fontWeight: "900",
              }}>
                {planLabels[subscriptionTier]}
              </Text>
              {subscriptionTier === "free" && (
                <Pressable
                  onPress={() => router.push("/settings/subscription")}
                  accessibilityRole="button"
                  accessibilityLabel="升级套餐"
                >
                  <Text style={{ color: theme.colors.accent, fontSize: 14, fontWeight: "700" }}>升级 →</Text>
                </Pressable>
              )}
            </View>
          </Card>

          {/* 密码修改 */}
          {user ? (
            <Card style={{ gap: 12 }}>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setShowPasswordForm(!showPasswordForm);
                }}
                accessibilityRole="button"
                accessibilityLabel="修改密码"
                accessibilityState={{ expanded: showPasswordForm }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Lock color={theme.colors.warm} size={18} />
                  <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "800" }}>修改密码</Text>
                </View>
                <Text style={{ color: theme.colors.muted, fontSize: 20 }}>{showPasswordForm ? "▾" : "▸"}</Text>
              </Pressable>

              {showPasswordForm && (
                <View style={{ gap: 10 }}>
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="当前密码（如已登录可留空）"
                    placeholderTextColor={theme.colors.subtle}
                    accessibilityLabel="当前密码"
                    autoCapitalize="none"
                    secureTextEntry
                    style={{
                      backgroundColor: theme.colors.surfaceRaised,
                      borderRadius: 12, paddingHorizontal: 14, height: 48,
                      color: theme.colors.text, fontSize: 14,
                    }}
                  />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="新密码（至少8位）"
                    placeholderTextColor={theme.colors.subtle}
                    accessibilityLabel="新密码"
                    autoCapitalize="none"
                    secureTextEntry
                    style={{
                      backgroundColor: theme.colors.surfaceRaised,
                      borderRadius: 12, paddingHorizontal: 14, height: 48,
                      color: theme.colors.text, fontSize: 14,
                    }}
                  />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="确认新密码"
                    placeholderTextColor={theme.colors.subtle}
                    accessibilityLabel="确认新密码"
                    autoCapitalize="none"
                    secureTextEntry
                    style={{
                      backgroundColor: theme.colors.surfaceRaised,
                      borderRadius: 12, paddingHorizontal: 14, height: 48,
                      color: theme.colors.text, fontSize: 14,
                    }}
                  />
                  <Button
                    title={changingPassword ? "修改中..." : "确认修改密码"}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                  />
                </View>
              )}
            </Card>
          ) : (
            <Card style={{ gap: 10, alignItems: "center" }}>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>登录后可修改密码和同步学习记录</Text>
              <Button title="登录" onPress={() => router.push("/login")} />
              <Button title="创建账号" onPress={() => router.push("/register")} variant="secondary" />
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
