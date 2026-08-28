import { useState, useMemo, useEffect, useRef } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react-native";

import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useSpeech } from "@/hooks/use-speech";
import { useStorageState } from "@/hooks/use-storage-state";

import { getTpPracticeModule, type TpPracticeKind } from "@/lib/tp-practice";
import { type MockWord, type MockSentence } from "@/lib/mock-data";
import { getVocabulary, getQuotes } from "@/lib/api";

import { Screen, StatusMessage } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { CheckinModal } from "@/components/checkin-modal";

// ── 导入刚才拆分出的所有模块 ──
import {
  ChoiceOptions,
  WordsCard,
  ListeningOrb,
  SpeakingPanel,
  type SpeakingPanelHandle,
  StoryTokens,
  GameOverScreen,
  CompletionScreen,
  FeedbackBar,
  useQuestionGenerator,
  useCheckin,
} from "@/components/practice";

const TOTAL_QUESTIONS_PER_ROUND = 5;

function calculateSpeakingScore(target: string, heard: string, confidence: unknown) {
  const targetWords = new Set(target.toLowerCase().match(/[a-z]+/g) ?? []);
  const heardWords = new Set(heard.toLowerCase().match(/[a-z]+/g) ?? []);
  const matchingWords = [...targetWords].filter((word) => heardWords.has(word)).length;
  const wordScore = targetWords.size > 0 ? matchingWords / targetWords.size : 0;
  const confidenceValue = typeof confidence === "number" && Number.isFinite(confidence)
    ? Math.min(1, Math.max(0, confidence))
    : wordScore;
  return Math.round(Math.min(100, Math.max(0, wordScore * 70 + confidenceValue * 30)));
}

export default function TpPracticeScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const { theme } = useTheme();
  const { accessToken } = useAuth();

  const module = useMemo(() => getTpPracticeModule(kind), [kind]);
  const accent = module.accent;
  const accentDark = module.accent; // can use a darker shade if needed, fallback to color

  // === Core Storage & Remote Data ===
  const [words] = useStorageState<MockWord[]>("settings:my-words-list", []);
  const [sentences] = useStorageState<MockSentence[]>("settings:my-sentences-list", []);
  const [phrases] = useStorageState<any[]>("settings:my-phrases-list", []);
  const [mistakes, setMistakes] = useStorageState<MockWord[]>("tp:my-mistake-words", []);

  const { data: onlineVocabulary } = useQuery({
    queryKey: ["user-vocabulary", accessToken],
    queryFn: () => getVocabulary(accessToken),
    enabled: Boolean(accessToken),
  });

  const { data: onlineQuotes } = useQuery({
    queryKey: ["user-quotes", accessToken],
    queryFn: () => getQuotes(accessToken),
    enabled: Boolean(accessToken),
  });

  const userVocabularyPool = useMemo(() => {
    if (accessToken && onlineVocabulary && onlineVocabulary.length > 0) {
      return onlineVocabulary.map((v) => ({
        id: v.id, lemma: v.lemma, phonetic: v.phonetic ?? "",
        definitionZh: v.definitionZh, definitionEn: v.definitionEn ?? "",
        exampleEn: v.exampleEn ?? "", exampleZh: v.exampleZh ?? "",
        occurrences: 1, date: v.createdAt.split("T")[0], isFavorite: true,
      }));
    }
    return words ?? [];
  }, [words, onlineVocabulary, accessToken]);

  const userSentencesPool = useMemo(() => {
    if (accessToken && onlineQuotes && onlineQuotes.length > 0) {
      return onlineQuotes.map((q) => ({
        id: q.id, text: q.textEn, translation: q.textZh ?? "",
        sourceVideoTitle: q.videoTitle ?? "云端视频", sourceVideoId: q.videoId,
        collectedAt: q.createdAt.split("T")[0], isFavorite: true, tags: q.notes ? [q.notes] : ["云端"],
      }));
    }
    return sentences ?? [];
  }, [sentences, onlineQuotes, accessToken]);

  // === Game States ===
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [lives, setLives] = useState(5);
  const [coins, setCoins] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // === Interaction States ===
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Specific states for Speaking
  const { speak, stop: stopSpeech, speaking } = useSpeech();
  const [isRecording, setIsRecording] = useState(false);
  const [speakingResult, setSpeakingResult] = useState<{ score: number; text: string } | null>(null);
  const [speakingError, setSpeakingError] = useState<string | null>(null);
  const speakingPanelRef = useRef<SpeakingPanelHandle | null>(null);
  const speechResultReceivedRef = useRef(false);

  // === Custom Hooks ===
  const { streak, triggerCheckin, submitCompletion } = useCheckin();
  const [showCheckinModal, setShowCheckinModal] = useState(false);

  const { loading, questionData, generate } = useQuestionGenerator({
    moduleId: module.id,
    vocabularyPool: userVocabularyPool,
    sentencesPool: userSentencesPool,
    phrases: phrases ?? [],
    mistakes: mistakes ?? [],
    accessToken,
    onlineQuotes,
  });

  // Init
  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => () => {
    stopSpeech();
    speakingPanelRef.current?.stopRecording();
  }, [stopSpeech]);

  const handleSpeakingMessage = (data: any) => {
    if (!data || typeof data.type !== "string") return;

    if (data.type === "start") {
      setIsRecording(true);
      return;
    }

    if (data.type === "result") {
      const heard = typeof data.text === "string" ? data.text.trim() : "";
      if (!heard || !questionData) {
        setSpeakingError("没有识别到清晰语音，请靠近麦克风后重试。");
        setIsRecording(false);
        return;
      }

      const score = calculateSpeakingScore(questionData.sample, heard, data.confidence);
      speechResultReceivedRef.current = true;
      setSpeakingResult({ score, text: heard });
      setSpeakingError(null);
      setIsRecording(false);
      setIsSubmitted(true);

      if (score >= 60) {
        setCoins((value) => value + 10);
        setCorrectCount((value) => value + 1);
        if (triggerCheckin()) setShowCheckinModal(true);
      } else {
        setLives((value) => value - 1);
      }
      return;
    }

    if (data.type === "error") {
      const rawMessage = typeof data.message === "string" ? data.message : "";
      const message = /not supported|service-not-allowed|not-allowed/i.test(rawMessage)
        ? "此设备暂不支持网页语音识别，请先使用听力练习。"
        : "语音识别失败，请检查麦克风权限后重试。";
      setSpeakingError(message);
      setIsRecording(false);
      return;
    }

    if (data.type === "end") {
      setIsRecording(false);
      if (!speechResultReceivedRef.current) {
        setSpeakingError("没有识别到语音，请重试。");
      }
    }
  };

  // === Interaction Handlers ===
  const handleChoiceSelect = (idx: number) => {
    setSelectedIdx(idx);
    setIsSubmitted(true);

    if (!questionData) return;

    const isCorrect = questionData.choices[idx].toLowerCase() === questionData.correctAnswer.toLowerCase();
    if (isCorrect) {
      setCoins(c => c + 10);
      setCorrectCount(c => c + 1);
      const shouldShowModal = triggerCheckin();
      if (shouldShowModal) setShowCheckinModal(true);

      // Remove from mistakes if it was a mistake mode
      if (module.id === "mistakes" && questionData.wordRef) {
        setMistakes(mistakes.filter(w => w.lemma !== questionData.wordRef!.lemma));
      }
    } else {
      setLives(l => l - 1);
      // Add to mistakes
      if (questionData.wordRef && module.id !== "mistakes") {
        if (!mistakes.find(w => w.lemma === questionData.wordRef!.lemma)) {
          setMistakes([...mistakes, questionData.wordRef!]);
        }
      }
    }
  };

  const handleNext = () => {
    if (currentQuestion >= TOTAL_QUESTIONS_PER_ROUND) {
      submitCompletion(TOTAL_QUESTIONS_PER_ROUND);
      setShowCompletion(true);
      return;
    }

    setCurrentQuestion(q => q + 1);
    setSelectedIdx(null);
    setIsSubmitted(false);
    setSpeakingResult(null);
    setSpeakingError(null);
    setIsRecording(false);
    speechResultReceivedRef.current = false;
    generate();
  };

  const handleRetry = () => {
    setLives(5);
    setCoins(0);
    setCurrentQuestion(1);
    setCorrectCount(0);
    setSelectedIdx(null);
    setIsSubmitted(false);
    setShowCompletion(false);
    setSpeakingResult(null);
    setSpeakingError(null);
    setIsRecording(false);
    speechResultReceivedRef.current = false;
    generate();
  };

  // === Renders ===
  if (lives <= 0) {
    return <GameOverScreen accent={accent} onRetry={handleRetry} />;
  }

  if (showCompletion) {
    return (
      <CompletionScreen
        correctCount={correctCount}
        totalQuestions={TOTAL_QUESTIONS_PER_ROUND}
        coins={coins}
        streak={streak}
        accent={accent}
        onBack={() => router.back()}
      />
    );
  }

  const isAnswerCorrect = selectedIdx !== null && questionData &&
    questionData.choices[selectedIdx].toLowerCase() === questionData.correctAnswer.toLowerCase();

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <PageHeader
          title={module.title}
          subtitle={`第 ${currentQuestion} / ${TOTAL_QUESTIONS_PER_ROUND} 题`}
          onBack={() => router.back()}
          right={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Heart color={theme.colors.danger} size={18} fill={`${theme.colors.danger}22`} strokeWidth={2.5} />
              <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.text }}>{lives}</Text>
            </View>
          }
        />

        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Progress Bar */}
          <View style={{ height: 12, backgroundColor: theme.colors.surfaceRaised, borderRadius: 6, marginBottom: 20, overflow: "hidden" }}>
            <View style={{ width: `${(currentQuestion / TOTAL_QUESTIONS_PER_ROUND) * 100}%`, height: "100%", backgroundColor: accent, borderRadius: 6 }} />
          </View>

          {loading || !questionData ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 14 }}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={{ color: theme.colors.muted, fontSize: 15, fontWeight: "800" }}>生成专属题目中...</Text>
            </View>
          ) : (
            <View style={{ flex: 1, gap: 20 }}>
              <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900", marginBottom: 8 }}>
                {module.id === "words" || module.id === "mistakes" ? "选出正确的中文释义" :
                 module.id === "listening" ? "听原音并选出正确的短语" :
                 module.id === "stories" ? "选择正确的单词补全句子" :
                 "请大声朗读以下句子"}
              </Text>

              {/* Module Specific Render */}
              {module.id === "words" || module.id === "mistakes" ? (
                <WordsCard
                  word={questionData.sample}
                  phonetic={questionData.wordRef?.phonetic}
                  accent={accent}
                  onPronounce={() => speak(questionData.sample)}
                />
              ) : module.id === "listening" ? (
                <ListeningOrb
                  accent={accent}
                  isPlaying={speaking}
                  onPlay={() => speak(questionData.correctAnswer)}
                />
              ) : module.id === "speaking" ? (
                <SpeakingPanel
                  ref={speakingPanelRef}
                  sentence={questionData.sample}
                  translationZh={questionData.extraZh}
                  accent={accent}
                  isRecording={isRecording}
                  isSubmitted={isSubmitted}
                  speakingResult={speakingResult}
                  speakingError={speakingError}
                  onRecordToggle={() => {
                    if (isRecording) {
                      speakingPanelRef.current?.stopRecording();
                    } else {
                      speechResultReceivedRef.current = false;
                      setSpeakingError(null);
                      setSpeakingResult(null);
                      setIsSubmitted(false);
                      setIsRecording(true);
                      speakingPanelRef.current?.startRecording();
                    }
                  }}
                  onMessage={handleSpeakingMessage}
                />
              ) : module.id === "stories" ? (
                <StoryTokens
                  tokens={questionData.storyTokens!}
                  blankIndex={questionData.blankIndex!}
                  correctAnswer={questionData.correctAnswer}
                  isSubmitted={isSubmitted}
                  isCorrect={isAnswerCorrect}
                  translationZh={questionData.extraZh}
                  accent={accent}
                />
              ) : null}

              {/* Multiple Choice Options */}
              {module.id !== "speaking" && (
                <ChoiceOptions
                  choices={questionData.choices}
                  correctAnswer={questionData.correctAnswer}
                  selectedIdx={selectedIdx}
                  isSubmitted={isSubmitted}
                  accent={accent}
                  onChoicePress={handleChoiceSelect}
                />
              )}
            </View>
          )}
        </View>

        {/* Feedback Footer */}
        {isSubmitted && questionData && module.id !== "speaking" && (
          <FeedbackBar
            isCorrect={isAnswerCorrect!}
            correctAnswer={questionData.correctAnswer}
            reward="+10"
            tipEn={questionData.wordRef?.exampleEn}
            tipZh={questionData.wordRef?.exampleZh}
            accent={accent}
            accentDark={accent}
            onContinue={handleNext}
          />
        )}

        {isSubmitted && module.id === "speaking" && speakingResult && (
          <FeedbackBar
            isCorrect={speakingResult.score >= 60}
            correctAnswer={questionData?.sample ?? ""}
            reward={speakingResult.score >= 60 ? "+10" : "+0"}
            accent={accent}
            accentDark={accent}
            onContinue={handleNext}
          />
        )}
      </SafeAreaView>

      <CheckinModal
        visible={showCheckinModal}
        streak={streak}
        onClose={() => setShowCheckinModal(false)}
      />
    </Screen>
  );
}
