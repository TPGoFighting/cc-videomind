import { forwardRef, useRef, useImperativeHandle } from "react";
import { Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { Mic } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";

export interface SpeakingPanelHandle {
  startRecording: () => void;
  stopRecording: () => void;
}

interface SpeakingPanelProps {
  /** 要朗读的目标句子 */
  sentence: string;
  /** 目标句子中文翻译 */
  translationZh?: string;
  accent: string;
  isRecording: boolean;
  isSubmitted: boolean;
  speakingResult: { score: number; text: string } | null;
  onRecordToggle: () => void;
  onMessage: (data: any) => void;
}

const SPEECH_RECOGNITION_HTML = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <script>
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Speech recognition not supported' }));
      } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'start' }));
        };

        recognition.onresult = (event) => {
          const text = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'result', text, confidence }));
        };

        recognition.onerror = (event) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: event.error }));
        };

        recognition.onend = () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'end' }));
        };

        window.addEventListener('message', (event) => {
          const command = event.data;
          if (command === 'start') {
            recognition.start();
          } else if (command === 'stop') {
            recognition.stop();
          }
        });
      }
    </script>
  </body>
  </html>
`;

/**
 * 口语练习面板
 * 包含：目标句子展示、录音麦克风球、音波动效、测评结果卡片、隐藏 WebView（Web Speech API）
 */
export const SpeakingPanel = forwardRef<SpeakingPanelHandle, SpeakingPanelProps>(
  function SpeakingPanel(
    { sentence, translationZh, accent, isRecording, isSubmitted, speakingResult, onRecordToggle, onMessage },
    ref
  ) {
    const { theme } = useTheme();
    const haptics = useHaptics();
    const webViewRef = useRef<WebView | null>(null);

    useImperativeHandle(ref, () => ({
      startRecording() {
        webViewRef.current?.postMessage("start");
      },
      stopRecording() {
        webViewRef.current?.postMessage("stop");
      },
    }));

    const waveHeights = [16, 32, 48, 64, 40, 56, 24, 44, 32, 16];

    return (
      <View style={{ gap: 20 }}>
        {/* 目标句子卡片 */}
        <View
          style={{
            borderRadius: theme.radius.lg,
            borderWidth: 2,
            borderColor: theme.colors.border,
            borderBottomColor: theme.colors.surfaceRaised,
            borderBottomWidth: 5,
            backgroundColor: theme.colors.surface,
            padding: 20,
            gap: 8,
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800", lineHeight: 26, fontStyle: "italic" }}>
            "{sentence}"
          </Text>
          {translationZh ? (
            <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: "600" }}>
              译: {translationZh}
            </Text>
          ) : null}
        </View>

        {/* 麦克风录音区 */}
        <View style={{ alignItems: "center", gap: 20 }}>
          {/* 音波动效 */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 64 }}>
            {waveHeights.map((h, i) => (
              <View
                key={i}
                style={{
                  width: 4,
                  height: isRecording ? h : 6,
                  borderRadius: 2,
                  backgroundColor: isRecording ? accent : theme.colors.border,
                }}
              />
            ))}
          </View>

          {/* 麦克风球 */}
          <View style={{ alignItems: "center", gap: 10 }}>
            {isRecording ? (
              <View
                style={{
                  position: "absolute",
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  borderWidth: 2,
                  borderColor: `${accent}20`,
                }}
              />
            ) : null}
            <Pressable
              onPress={() => {
                haptics.medium();
                onRecordToggle();
              }}
              disabled={isSubmitted}
              style={({ pressed }) => ({
                width: 72,
                height: 72,
                borderRadius: 36,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isRecording ? "#EF4444" : accent,
                transform: [{ scale: pressed ? 0.93 : 1 }],
                shadowColor: isRecording ? "#EF4444" : accent,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 8,
              })}
            >
              <Mic color="#FFFFFF" size={30} strokeWidth={2.5} />
            </Pressable>
            <Text style={{ color: isRecording ? "#EF4444" : theme.colors.muted, fontSize: 13, fontWeight: "700" }}>
              {isRecording ? "松开结束朗读测评" : "点击麦克风开始录音"}
            </Text>
          </View>
        </View>

        {/* 测评结果 */}
        {speakingResult ? (
          <View
            style={{
              borderRadius: theme.radius.md,
              borderWidth: 1.5,
              borderColor: theme.colors.success,
              backgroundColor: `${theme.colors.success}12`,
              padding: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}>跟读测评结果</Text>
              <Text style={{ color: theme.colors.success, fontSize: 22, fontWeight: "900" }}>{speakingResult.score}分</Text>
            </View>
            <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
              发音流利度极佳，语调匹配度完美。
            </Text>
          </View>
        ) : null}

        {/* 隐藏的 Web Speech API WebView */}
        <WebView
          ref={webViewRef}
          source={{ html: SPEECH_RECOGNITION_HTML }}
          onMessage={(e) => {
            try {
              const data = JSON.parse(e.nativeEvent.data);
              onMessage(data);
            } catch {
              // ignore
            }
          }}
          style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
        />
      </View>
    );
  }
);
