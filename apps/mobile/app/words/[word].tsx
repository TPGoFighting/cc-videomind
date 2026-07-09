import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, Heart, Volume2, VolumeX } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { useSpeech } from "@/hooks/use-speech";
import { Screen, Card } from "@/components/ui";
import { INITIAL_WORDS, type MockWord } from "@/lib/mock-data";
import { SafeAreaView } from "react-native-safe-area-context";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { postWordDefinitions } from "@/lib/api";

export default function WordDetailScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { word } = useLocalSearchParams<{ word: string }>();
  const { accessToken } = useAuth();
  const { speak, speaking, currentText } = useSpeech();

  // Words state persisted
  const [words, setWords] = useStorageState<MockWord[]>("settings:my-words-list", INITIAL_WORDS);

  const defQuery = useQuery({
    queryKey: ["word-definitions", word],
    queryFn: () => postWordDefinitions(word!, accessToken),
    enabled: Boolean(word && accessToken),
  });

  const apiDef = defQuery.data?.definitions?.[0];

  const wordData = useMemo(() => {
    const localData = words.find((w) => w.lemma.toLowerCase() === word?.toLowerCase()) || {
      id: "temp",
      lemma: word || "Unknown",
      phonetic: "",
      definitionZh: "暂无释义",
      occurrences: 0,
      date: new Date().toISOString().split("T")[0],
      isFavorite: false,
    };
    
    if (apiDef) {
      return {
        ...localData,
        lemma: apiDef.lemma,
        phonetic: apiDef.phonetic ?? localData.phonetic,
        phoneticUk: apiDef.phonetic ?? localData.phoneticUk,
        phoneticUs: apiDef.phonetic ?? localData.phoneticUs,
        definitionZh: apiDef.definitionZh,
        definitionZhFull: apiDef.definitionZh,
        exampleEn: apiDef.exampleEn ?? undefined,
        exampleZh: apiDef.exampleZh ?? undefined,
      };
    }
    return localData;
  }, [apiDef, words, word]);

  const toggleFavorite = () => {
    haptics.selection();
    setWords(
      words.map((w) => (w.lemma.toLowerCase() === wordData.lemma.toLowerCase() ? { ...w, isFavorite: !w.isFavorite } : w))
    );
  };

  const handleSpeech = () => {
    haptics.medium();
    speak(wordData.lemma, "en-US");
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              haptics.light();
              router.back();
            }}
            style={styles.backButton}
          >
            <ArrowLeft color={theme.colors.text} size={24} />
          </Pressable>
          
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {wordData.lemma}
          </Text>

          <Pressable
            onPress={toggleFavorite}
            style={styles.favoritesToggleBtn}
          >
            <Heart
              color={wordData.isFavorite ? theme.colors.accent : theme.colors.text}
              size={22}
              fill={wordData.isFavorite ? theme.colors.accent : "none"}
            />
          </Pressable>
        </View>

        {/* Word Card Details */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.page,
            paddingBottom: 40,
            gap: 20,
          }}
        >
          <Card style={{ ...styles.detailCard, borderColor: theme.colors.border }}>
            {/* Word and Speaker */}
            <View style={styles.wordRow}>
              <Text style={[styles.wordText, { color: theme.colors.text }]}>
                {wordData.lemma}
              </Text>
              
              <Pressable
                onPress={handleSpeech}
                style={({ pressed }) => [
                  styles.speakerBtn,
                  {
                    backgroundColor: speaking && currentText === wordData.lemma
                      ? `${theme.colors.accent}30`
                      : `${theme.colors.accent}18`,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                {speaking && currentText === wordData.lemma ? (
                  <VolumeX color={theme.colors.accent} size={22} />
                ) : (
                  <Volume2 color={theme.colors.accent} size={22} />
                )}
              </Pressable>
            </View>

            {/* Phonetics Badges */}
            <View style={styles.phoneticsRow}>
              <View style={styles.phoneticBadge}>
                <View style={[styles.langBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.langBadgeText}>英</Text>
                </View>
                <Text style={[styles.phoneticVal, { color: theme.colors.accent }]}>
                  {wordData.phoneticUk ?? wordData.phonetic}
                </Text>
              </View>

              <View style={styles.phoneticBadge}>
                <View style={[styles.langBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.langBadgeText}>美</Text>
                </View>
                <Text style={[styles.phoneticVal, { color: theme.colors.accent }]}>
                  {wordData.phoneticUs ?? wordData.phonetic}
                </Text>
              </View>
            </View>

            {/* Definition text */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <ScrollView style={styles.definitionScroll} showsVerticalScrollIndicator={true}>
              <Text style={[styles.definitionText, { color: theme.colors.text }]}>
                {wordData.definitionZhFull ?? wordData.definitionZh}
              </Text>

              {wordData.exampleEn ? (
                <View style={styles.exampleContainer}>
                  <Text style={[styles.exampleHeader, { color: theme.colors.muted }]}>例句：</Text>
                  <Text style={[styles.exampleEn, { color: theme.colors.text }]}>
                    {wordData.exampleEn}
                  </Text>
                  {wordData.exampleZh ? (
                    <Text style={[styles.exampleZh, { color: theme.colors.muted }]}>
                      {wordData.exampleZh}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          </Card>

          {/* Occurrence Count Footer */}
          <View style={[styles.footerRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 }]}>
            <Text style={[styles.footerLabel, { color: theme.colors.text }]}>出现记录</Text>
            <Text style={[styles.footerValue, { color: theme.colors.text }]}>
              {wordData.occurrences}次
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  favoritesToggleBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    padding: 24,
    minHeight: 380,
    borderWidth: 1,
  },
  wordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  wordText: {
    fontSize: 32,
    fontWeight: "900",
  },
  speakerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneticsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  phoneticBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  langBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  langBadgeText: {
    color: "#0A1A00",
    fontSize: 11,
    fontWeight: "900",
  },
  phoneticVal: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 20,
  },
  definitionScroll: {
    flex: 1,
  },
  definitionText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
  },
  exampleContainer: {
    marginTop: 20,
    gap: 4,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  exampleHeader: {
    fontSize: 13,
    fontWeight: "800",
  },
  exampleEn: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  exampleZh: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  footerLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  footerValue: {
    fontSize: 16,
    fontWeight: "800",
  },
});
