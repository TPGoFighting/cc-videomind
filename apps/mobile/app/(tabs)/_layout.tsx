import { useState, useEffect } from "react";
import { Tabs, Redirect, router } from "expo-router";
import { Play, Book, Infinity, Lock, Plus, X, Link as LinkIcon, Folder, Image as ImageIcon } from "lucide-react-native";
import { Modal, Pressable, Text, View, StyleSheet, TextInput, Alert, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { extractVideoId } from "@teach-player/shared";
import { Button, Field, Card } from "@/components/ui";
import { storage, cacheKey } from "@/lib/storage";
import { addParsingTask, updateParsingTask, removeParsingTask } from "@/lib/tasks";
import { postVideoAnalysis } from "@/lib/api";

function GhostIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <Path
        d="M4.99951 2.04134C6.325 2.04134 7.3999 3.11625 7.3999 4.44173V7.12392C7.3999 7.4861 7.3999 7.66719 7.34494 7.76091C7.2544 7.91528 7.07234 7.99073 6.89915 7.94565C6.79401 7.91829 6.66591 7.79028 6.40972 7.53427C6.29111 7.41574 6.2318 7.35648 6.16689 7.32659C6.06068 7.27769 5.9384 7.27772 5.8322 7.32665C5.7673 7.35656 5.70802 7.41584 5.58945 7.53441L5.49951 7.62435C5.2961 7.82776 5.1944 7.92946 5.07207 7.95203C5.0241 7.96087 4.97492 7.96087 4.92696 7.95203C4.80463 7.92946 4.70292 7.82776 4.49951 7.62435L4.40939 7.53423C4.29109 7.41593 4.23194 7.35678 4.16722 7.32689C4.06081 7.27775 3.93821 7.27775 3.8318 7.32689C3.76708 7.35678 3.70793 7.41593 3.58963 7.53423C3.33409 7.78977 3.20631 7.91754 3.10149 7.94501C2.92795 7.99048 2.74536 7.91485 2.6548 7.75999C2.6001 7.66644 2.6001 7.48574 2.6001 7.12435V4.44173C2.6001 3.1164 3.67424 2.04159 4.99951 2.04134ZM3.99951 3.52376C3.66844 3.52409 3.40005 3.8821 3.3999 4.32357C3.3999 4.76519 3.66835 5.12402 3.99951 5.12435C4.33088 5.12435 4.6001 4.76539 4.6001 4.32357C4.59995 3.8819 4.33079 3.52376 3.99951 3.52376ZM5.99951 3.52376C5.66844 3.52409 5.40005 3.8821 5.3999 4.32357C5.3999 4.76519 5.66835 5.12402 5.99951 5.12435C6.33088 5.12435 6.6001 4.76539 6.6001 4.32357C6.59995 3.8819 6.33079 3.52376 5.99951 3.52376Z"
        fill={color}
      />
    </Svg>
  );
}

function PlayTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = 1.15;
      scale.value = withSpring(1.0, { damping: 20, stiffness: 220 });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Play color={color} size={size} fill={focused ? color : "transparent"} />
    </Animated.View>
  );
}

function BookTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const rotateY = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      rotateY.value = 20;
      rotateY.value = withSpring(0, { damping: 20, stiffness: 180 });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 100 },
      { rotateY: `${rotateY.value}deg` }
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Book color={color} size={size} />
    </Animated.View>
  );
}

function GhostTabIcon({ color, size, focused, isPremium }: { color: string; size: number; focused: boolean; isPremium: boolean }) {
  const { theme } = useTheme();
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      translateY.value = -4;
      translateY.value = withSpring(0, { damping: 20, stiffness: 160 });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size, justifyContent: "center", alignItems: "center" }, animatedStyle]}>
      <GhostIcon color={color} size={size + 4} />
      {!isPremium && (
        <View
          style={{
            position: "absolute",
            top: -1,
            right: -5,
            backgroundColor: theme.colors.background,
            borderRadius: 6,
            padding: 1,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Lock color={theme.colors.muted} size={8} />
        </View>
      )}
    </Animated.View>
  );
}

function CreateTabIcon({ isCreateOpen }: { isCreateOpen: boolean }) {
  const { theme } = useTheme();
  const rotateZ = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotateZ.value = withSpring(isCreateOpen ? 45 : 0, { damping: 20, stiffness: 220 });
    scale.value = withSequence(
      withSpring(1.05, { damping: 20, stiffness: 200 }),
      withSpring(1.0, { damping: 25, stiffness: 180 })
    );
  }, [isCreateOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotateZ.value}deg` }, { scale: scale.value }],
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.glassRaised,
    borderColor: isCreateOpen ? theme.colors.danger : theme.colors.accent,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    top: -10,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6
  }));

  return (
    <Animated.View style={animatedStyle}>
      {isCreateOpen ? (
        <X color="#0A1A00" size={24} strokeWidth={3} />
      ) : (
        <Plus color="#0A1A00" size={24} strokeWidth={3} />
      )}
    </Animated.View>
  );
}

export default function TabLayout() {
  const { theme } = useTheme();
  const tabScaleX = useSharedValue(1);
  const tabScaleY = useSharedValue(1);

  const triggerFluidScale = () => {
    tabScaleX.value = 0.98;
    tabScaleY.value = 0.98;
    tabScaleX.value = withSpring(1.0, { damping: 24, stiffness: 220 });
    tabScaleY.value = withSpring(1.0, { damping: 24, stiffness: 220 });
  };

  const tabBarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: tabScaleX.value }, { scaleY: tabScaleY.value }]
  }));

  const haptics = useHaptics();
  const { t } = useTranslation();
  const { subscriptionTier } = useAuth();
  const isPremium = subscriptionTier === "pro" || subscriptionTier === "max";
  const [verified] = useStorageState("youtube_verified", false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  useEffect(() => {
    // 自动扫描并升级旧版超长段落缓存
    const upgradeOldCaches = async () => {
      try {
        if (storage.get("cache:upgrade-v2-done", false)) {
          return;
        }

        const videoIdsToUpgrade: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("analysis:")) {
            const val = localStorage.getItem(key);
            if (!val) continue;
            
            try {
              const data = JSON.parse(val);
              if (data && Array.isArray(data.transcript) && data.transcript.length > 0) {
                let longCount = 0;
                data.transcript.forEach((t: any) => {
                  const duration = t.endTime - t.startTime;
                  const len = t.text ? t.text.length : 0;
                  // 旧版特征：段落时长超过 15 秒，或字符数特别多 (120+)
                  if (duration > 15 || len > 120) {
                    longCount++;
                  }
                });

                // 如果超过 10% 的段落很长，或者是包含极长段落（>3个），则认为是旧版解析逻辑
                if (longCount > data.transcript.length * 0.1 || longCount > 3) {
                  const videoId = key.replace("analysis:", "");
                  console.log(`[Cache Upgrade] 发现旧版超长段落缓存，准备强制重新解析: ${videoId}`);
                  videoIdsToUpgrade.push(videoId);
                }
              }
            } catch (e) {
              // ignore parse error
            }
          }
        }

        if (videoIdsToUpgrade.length === 0) {
          storage.set("cache:upgrade-v2-done", true);
          return;
        }

        // 限制单次启动时升级的最大数量，避免网络拥堵和线程卡顿
        const limit = 3;
        const targets = videoIdsToUpgrade.slice(0, limit);

        console.log(`[Cache Upgrade] 准备并发重新解析前 ${targets.length} 个视频（共发现 ${videoIdsToUpgrade.length} 个旧版缓存）`);

        const promises = targets.map(async (videoId) => {
          try {
            // 传入 force: true 强制服务端舍弃缓存重新分析
            const result = await postVideoAnalysis(videoId, null, true);
            storage.set(cacheKey(["analysis", videoId]), result);
            console.log(`[Cache Upgrade] 强制重新解析完成并更新缓存: ${videoId}`);
          } catch (e) {
            console.warn(`[Cache Upgrade] 强制解析失败: ${videoId}`, e);
          }
        });

        await Promise.allSettled(promises);

        // 如果全部处理完毕，则记录哨兵，避免下次开机再次扫描
        if (videoIdsToUpgrade.length <= limit) {
          storage.set("cache:upgrade-v2-done", true);
          console.log("[Cache Upgrade] 所有旧版缓存已扫描并升级完毕。");
        } else {
          console.log(`[Cache Upgrade] 本次升级已完成。余下 ${videoIdsToUpgrade.length - limit} 个旧版缓存将在后续启动时处理。`);
        }
      } catch (err) {
        console.warn("[Cache Upgrade] Error scanning old caches:", err);
      }
    };
    
    // 延迟 3 秒执行，不影响应用首屏启动性能
    const timer = setTimeout(() => {
      upgradeOldCaches();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!verified) {
    return <Redirect href="/verify-youtube" />;
  }

  const handleUrlSubmit = async () => {
    let targetUrl = urlInput.trim();
    if (!targetUrl) return;

    // Check if it's a b23.tv short URL
    const isB23Short = /b23\.tv\/[a-zA-Z0-9_-]+/i.test(targetUrl);

    if (isB23Short) {
      setIsResolvingUrl(true);
      try {
        const urlToFetch = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
        console.log(`[Short URL] Resolving redirect for: ${urlToFetch}`);
        const res = await fetch(urlToFetch, { method: "GET" });
        if (res.url) {
          console.log(`[Short URL] Successfully resolved to: ${res.url}`);
          targetUrl = res.url;
        }
      } catch (err) {
        console.warn("[Short URL] Failed to resolve b23 short URL redirect:", err);
      } finally {
        setIsResolvingUrl(false);
      }
    }

    const res = extractVideoId(targetUrl);
    if (!res) {
      haptics.error();
      alert(t("common.invalidUrl"));
      return;
    }
    haptics.success();
    setIsUrlModalOpen(false);
    setUrlInput("");

    // Add to parsing tasks list
    const cleanTitle = targetUrl.length > 35 ? targetUrl.slice(0, 35) + "..." : targetUrl;
    addParsingTask(res.id, cleanTitle, "parsing", 10);

    // 先命中本地缓存：如果已有缓存，直接跳转，不触发重新解析
    const cached = storage.get(cacheKey(["analysis", res.id]), null);
    if (cached) {
      console.log(`[Cache] 命中本地缓存 videoId=${res.id}，跳过重新解析`);
      updateParsingTask(res.id, { status: "completed", progress: 100 });
    } else {
      console.log(`[Cache] 无本地缓存 videoId=${res.id}，将触发远程解析`);
    }

    router.push(`/video/${res.id}`);
  };

  const uploadAndParseLocalFile = async (uri: string, name: string, type: string, durationSeconds: number) => {
    const cleanName = name.replace(/\.[^/.]+$/, "");
    const tempTaskId = `local-upload-${Date.now()}`;
    addParsingTask(tempTaskId, cleanName, "uploading", 20);

    setIsUploading(true);
    setUploadProgress("正在解析音频并生成AI字幕，请稍候...");
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: name || "video.mp4",
        type: type || "video/mp4",
      } as any);
      formData.append("duration", String(durationSeconds));
      formData.append("title", cleanName);

      const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://video.tpgofighting.top").replace(/\/$/, "");
      console.log(`[Upload] Uploading file to: ${apiBaseUrl}/api/video-analysis/upload`);

      updateParsingTask(tempTaskId, { progress: 45, status: "parsing" });

      const response = await fetch(`${apiBaseUrl}/api/video-analysis/upload`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(errText || `服务器响应错误 (HTTP ${response.status})`);
      }

      const resData = await response.json();
      if (!resData.ok || !resData.data?.videoId) {
        throw new Error(resData.error?.message || "多媒体分析服务未返回有效的ID");
      }

      const videoId = resData.data.videoId;
      console.log(`[Upload] Upload success! Generated ID: ${videoId}`);

      // Swap temp task for real completed task
      removeParsingTask(tempTaskId);
      addParsingTask(videoId, cleanName, "completed", 100);

      // Add to corpus media IDs list so it shows in Dashboard immediately
      const existingIds = storage.get<string[]>("settings:my-media-ids", []);
      if (!existingIds.includes(videoId)) {
        storage.set("settings:my-media-ids", [videoId, ...existingIds]);
      }

      // Add the local URI to storage so the custom player can play the local file directly if needed
      storage.set(`local-video-uri:${videoId}`, uri);

      haptics.success();
      setIsCreateOpen(false);
      router.push(`/video/${videoId}`);
    } catch (err: any) {
      console.error("[Upload] Failed:", err);
      updateParsingTask(tempTaskId, { status: "failed", errorMessage: err.message });
      Alert.alert("导入解析失败", err.message || "网络请求失败，请检查后端服务是否开启。");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const handleFileImport = async () => {
    haptics.selection();
    if (!isPremium) {
      setIsCreateOpen(false);
      Alert.alert(
        "升级会员",
        "本地文件导入是 Pro 和 Max 会员的专属功能。",
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: "升级", onPress: () => router.push("/settings/subscription") },
        ]
      );
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["video/*", "audio/*"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        haptics.success();
        const asset = result.assets[0];
        await uploadAndParseLocalFile(
          asset.uri,
          asset.name || "local_audio.mp4",
          asset.mimeType || "video/mp4",
          180
        );
      }
    } catch (e: any) {
      Alert.alert("导入失败", e?.message || "选取文件失败");
    }
  };

  const handleAlbumImport = async () => {
    haptics.selection();
    if (!isPremium) {
      setIsCreateOpen(false);
      Alert.alert(
        "升级会员",
        "相册导入是 Pro 和 Max 会员的专属功能。",
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: "升级", onPress: () => router.push("/settings/subscription") },
        ]
      );
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("权限不足", "请在设置中允许访问相册权限。");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 1,
      });
      if (!result.canceled && result.assets?.length > 0) {
        haptics.success();
        const asset = result.assets[0];
        const fileName = asset.fileName || asset.uri.split("/").pop() || "album_video.mp4";
        const mimeType = asset.mimeType || "video/mp4";
        const durationSeconds = asset.duration 
          ? (asset.duration > 10000 ? Math.round(asset.duration / 1000) : Math.round(asset.duration)) 
          : 180;
        await uploadAndParseLocalFile(
          asset.uri,
          fileName,
          mimeType,
          durationSeconds
        );
      }
    } catch (e: any) {
      Alert.alert("导入失败", e?.message || "读取相册失败");
    }
  };


  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => (
          <Animated.View style={tabBarAnimatedStyle}>
            <BottomTabBar {...props} />
          </Animated.View>
        )}
        screenOptions={{
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.muted,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: theme.colors.glassRaised,
            borderWidth: 1,
            borderColor: theme.colors.glassBorder,
            borderTopColor: theme.colors.glassBorder,
            borderTopWidth: 1,
            height: 68,
            bottom: 16,
            left: 20,
            right: 20,
            borderRadius: 34,
            paddingBottom: 0,
            paddingTop: 8,
            shadowColor: theme.colors.text,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "700",
            marginTop: 2,
          },
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.video"),
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <PlayTabIcon color={color} size={size} focused={focused} />
            ),
          }}
          listeners={{
            tabPress: () => {
              haptics.selection();
              triggerFluidScale();
            }
          }}
        />
        <Tabs.Screen
          name="corpus"
          options={{
            title: t("tabs.media"),
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <BookTabIcon color={color} size={size} focused={focused} />
            ),
          }}
          listeners={{
            tabPress: () => {
              haptics.selection();
              triggerFluidScale();
            }
          }}
        />
        <Tabs.Screen
          name="tp"
          options={{
            title: "TP",
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <GhostTabIcon color={color} size={size} focused={focused} isPremium={isPremium} />
            ),
          }}
          listeners={{
            tabPress: () => {
              haptics.selection();
              triggerFluidScale();
            }
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: isCreateOpen ? t("common.cancel") : t("tabs.create"),
            tabBarIcon: () => <CreateTabIcon isCreateOpen={isCreateOpen} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              haptics.medium();
              setIsCreateOpen(!isCreateOpen);
            },
          }}
        />
      </Tabs>

      {/* Global Bottom Sheet for "创建" (+) overlay */}
      {isCreateOpen && (
        <Modal
          visible={isCreateOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsCreateOpen(false)}
        >
          <Pressable
            style={styles.overlay}
            onPress={() => {
              haptics.light();
              setIsCreateOpen(false);
            }}
          >
            <View style={[styles.sheetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {/* Row 1: URL Import */}
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setIsCreateOpen(false);
                  setIsUrlModalOpen(true);
                }}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    backgroundColor: pressed ? theme.colors.surfaceRaised : "transparent",
                  },
                ]}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.accent}15` }]}>
                  <LinkIcon color={theme.colors.accent} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{t("create.importByUrl")}</Text>
                  <Text style={[styles.optionDesc, { color: theme.colors.muted }]}>{t("create.importByUrlDesc")}</Text>
                </View>
              </Pressable>

              {/* Row 2: File Import */}
              <Pressable
                onPress={handleFileImport}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    backgroundColor: pressed ? theme.colors.surfaceRaised : "transparent",
                  },
                ]}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.blue}15` }]}>
                  <Folder color={theme.colors.blue} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{t("create.importFromFile")}</Text>
                  <Text style={[styles.optionDesc, { color: theme.colors.muted }]}>{t("create.importFromFileDesc")}</Text>
                </View>
              </Pressable>

              {/* Row 3: Photo Album Import */}
              <Pressable
                onPress={handleAlbumImport}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    backgroundColor: pressed ? theme.colors.surfaceRaised : "transparent",
                  },
                ]}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.warm}15` }]}>
                  <ImageIcon color={theme.colors.warm} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{t("create.importFromAlbum")}</Text>
                  <Text style={[styles.optionDesc, { color: theme.colors.muted }]}>{t("create.importFromAlbumDesc")}</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* URL Input Modal Dialog */}
      {isUrlModalOpen && (
        <Modal
          visible={isUrlModalOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsUrlModalOpen(false)}
        >
          <View style={styles.modalCentered}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.glassRaised, borderColor: theme.colors.glassBorder }]}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900", marginBottom: 12 }}>
                {t("create.importByUrlTitle")}
              </Text>
              
              <Field
                label={t("create.urlLabel")}
                accessibilityLabel={t("create.urlLabel")}
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://www.youtube.com/watch?v=..."
              />

              <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                <Pressable
                  onPress={() => {
                    if (isResolvingUrl) return;
                    haptics.light();
                    setIsUrlModalOpen(false);
                    setUrlInput("");
                  }}
                  disabled={isResolvingUrl}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.surfaceRaised,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isResolvingUrl ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{t("common.cancel")}</Text>
                </Pressable>
                
                <Pressable
                  onPress={handleUrlSubmit}
                  disabled={isResolvingUrl}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isResolvingUrl ? 0.6 : 1,
                  }}
                >
                  {isResolvingUrl ? (
                    <ActivityIndicator size="small" color="#0A1A00" />
                  ) : (
                    <Text style={{ color: "#0A1A00", fontWeight: "900" }}>{t("create.startAnalysis")}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Uploading Full Screen Progress Overlay Modal */}
      {isUploading && (
        <Modal
          visible={isUploading}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={[styles.modalCentered, { backgroundColor: "rgba(0,0,0,0.85)" }]}>
            <View style={{ gap: 18, alignItems: "center", padding: 30 }}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "800", textAlign: "center" }}>
                {uploadProgress}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13, textAlign: "center", marginTop: 4 }}>
                这需要传输文件并使用 SenseVoice/DeepSeek 进行智能转录与解析，请保持网络连接。
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingBottom: 48,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  optionDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  modalCentered: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
});
