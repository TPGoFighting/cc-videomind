import { useState, useCallback, useEffect, useRef } from "react";
import * as Speech from "expo-speech";

/**
 * 语音播放 hook
 * 封装 expo-speech，提供播放/停止和加载状态
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const currentTextRef = useRef<string | null>(null);

  const speak = useCallback(async (text: string, lang: "en-US" | "zh-CN" = "en-US") => {
    // 如果正在播放同一段文字，就停止
    if (speaking && currentTextRef.current === text) {
      Speech.stop();
      setSpeaking(false);
      currentTextRef.current = null;
      return;
    }

    // 停止当前播放
    Speech.stop();
    currentTextRef.current = text;
    setSpeaking(true);

    Speech.speak(text, {
      language: lang,
      rate: lang === "en-US" ? 0.85 : 1.0,
      pitch: 1.0,
      onDone: () => {
        setSpeaking(false);
        currentTextRef.current = null;
      },
      onError: () => {
        setSpeaking(false);
        currentTextRef.current = null;
      },
      onStopped: () => {
        setSpeaking(false);
        currentTextRef.current = null;
      },
    });
  }, [speaking]);

  const stop = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
    currentTextRef.current = null;
  }, []);

  useEffect(() => () => {
    Speech.stop();
  }, []);

  return { speak, stop, speaking, currentText: currentTextRef.current };
}
