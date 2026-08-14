"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bookmark, BookmarkCheck, Check, Copy, ListVideo, Navigation, Pin, PinOff, RotateCcw, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DisplayMode, TranscriptSegment, WordDefinition } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import { lemmatizeWord } from "@/lib/utils/tokenize";
import { DisplayModeToggle } from "./display-mode-toggle";
import { WordCard } from "./word-card";
import { hasCompleteTranslation, hasDisplayableTranslation } from "@/lib/utils/translation";
import { dismissLearningGuidance, shouldShowLearningGuidance } from "@/lib/product/learning-guidance";

/** 将文本按单词边界拆分，返回片段列表 */
function tokenizeText(text: string): string[] {
  return text.split(/\b/);
}

function isAlpha(token: string): boolean {
  return /^[a-zA-Z]+$/.test(token);
}

function subscribeToLearningGuidance() {
  return () => {};
}

function getLearningGuidanceSnapshot(): boolean {
  try {
    return shouldShowLearningGuidance(window.localStorage);
  } catch {
    return false;
  }
}

function getLearningGuidanceServerSnapshot(): boolean {
  return false;
}

export function TranscriptViewer({
  transcript,
  loading,
  currentTime,
  hideHeader,
  displayMode = "en",
  onDisplayModeChange,
  wordDefinitions,
  onSaveWord,
  onSaveQuote,
  onSeekTo,
  translating = false,
  translationError,
  onRetryTranslation,
  saveNotice,
}: {
  transcript: TranscriptSegment[];
  loading: boolean;
  currentTime?: number;
  hideHeader?: boolean;
  displayMode?: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  wordDefinitions?: Map<string, WordDefinition>;
  onSaveWord?: (lemma: string, startTime?: number) => Promise<boolean>;
  onSaveQuote?: (segment: TranscriptSegment) => Promise<boolean>;
  onSeekTo?: (seconds: number) => void;
  translating?: boolean;
  translationError?: string | null;
  onRetryTranslation?: () => void;
  saveNotice?: string | null;
}) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [activeWord, setActiveWord] = useState<{
    lemma: string;
    sourceTime: number;
    position: { top: number; left: number };
  } | null>(null);
  const [savingQuote, setSavingQuote] = useState<Set<string>>(new Set());
  const [savedQuotes, setSavedQuotes] = useState<Set<string>>(new Set());
  const [copiedQuote, setCopiedQuote] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [guideDismissedInView, setGuideDismissedInView] = useState(false);
  const storedLearningGuidanceVisible = useSyncExternalStore(
    subscribeToLearningGuidance,
    getLearningGuidanceSnapshot,
    getLearningGuidanceServerSnapshot,
  );
  const showLearningGuidance = storedLearningGuidanceVisible && !guideDismissedInView;
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticScrolling = useRef(false);
  const scrollCleanupRef = useRef<(() => void) | null>(null);

  const closeLearningGuidance = useCallback(() => {
    try {
      dismissLearningGuidance(window.localStorage);
    } catch {
      // Storage can be blocked in private contexts; hiding the current guide is still useful.
    }
    setGuideDismissedInView(true);
  }, []);

  /** 执行平滑滚动，通过 scrollend 事件 + 超时兜底精确管理 programmaticScrolling 标志 */
  function performSmoothScroll(container: HTMLDivElement, scrollTarget: number) {
    scrollCleanupRef.current?.();

    programmaticScrolling.current = true;

    const finish = () => {
      programmaticScrolling.current = false;
      scrollCleanupRef.current = null;
    };

    container.addEventListener("scrollend", finish, { once: true });
    const timer = setTimeout(finish, 900);

    scrollCleanupRef.current = () => {
      container.removeEventListener("scrollend", finish);
      clearTimeout(timer);
      finish();
    };

    container.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" });
  }

  // 找到当前播放时间对应的段落索引
  const activeIndex = (() => {
    if (currentTime === undefined) return -1;
    const exact = transcript.findIndex(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );
    if (exact !== -1) return exact;
    let best = -1;
    let bestStart = -1;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].startTime <= currentTime && transcript[i].startTime > bestStart) {
        best = i;
        bestStart = transcript[i].startTime;
      }
    }
    return best;
  })();

  // 自动滚动到当前段落（舒适区：视口顶部 25%-40%）
  useEffect(() => {
    if (!autoScroll || !activeRef.current || !containerRef.current || currentTime === undefined || currentTime < 0) return;

    const container = containerRef.current;
    const active = activeRef.current;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    // 舒适区：视口顶部 20% 到 40%
    const topThreshold = containerRect.top + containerRect.height * 0.20;
    const bottomThreshold = containerRect.top + containerRect.height * 0.40;

    const isOutOfView = activeRect.bottom < containerRect.top || activeRect.top > containerRect.bottom;
    const needsScroll = isOutOfView || activeRect.top < topThreshold || activeRect.bottom > bottomThreshold;

    if (needsScroll) {
      const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
      const scrollTarget = relativeTop - containerRect.height / 3;
      requestAnimationFrame(() => performSmoothScroll(container, scrollTarget));
    }
  }, [currentTime, autoScroll]);

  // 卸载时清理滚动监听
  useEffect(() => {
    return () => {
      scrollCleanupRef.current?.();
    };
  }, []);

  // 用户手动滚动时暂停自动跟随
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // 程序触发的滚动，忽略
      if (programmaticScrolling.current) return;
      if (autoScroll) {
        setAutoScroll(false);
        setShowJumpButton(true);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [autoScroll]);

  // 跳转到当前播放位置
  const jumpToCurrent = useCallback(() => {
    setAutoScroll(true);
    setShowJumpButton(false);
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
      const scrollTarget = relativeTop - containerRect.height / 3;
      requestAnimationFrame(() => performSmoothScroll(container, scrollTarget));
    }
  }, []);

  // 词卡关闭
  const closeWordCard = useCallback(() => setActiveWord(null), []);

  // hover 单词 0.5s 后显示卡片（仅桌面端）；移动端用 click
  const isTouchDevice = typeof window !== "undefined" && ('ontouchstart' in window || window.innerWidth < 640);

  const handleWordEnter = useCallback(
    (lemma: string, sourceTime: number, e: React.MouseEvent) => {
      if (isTouchDevice) return;
      // 清除隐藏计时器
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      hoverTimerRef.current = setTimeout(() => {
        setActiveWord({ lemma, sourceTime, position: { top: rect.bottom + 4, left: rect.left } });
      }, 500);
    },
    [isTouchDevice]
  );

  const handleWordLeave = useCallback(() => {
    if (isTouchDevice) return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // 延迟 300ms 关闭，给用户时间移动到卡片上
    hideTimerRef.current = setTimeout(() => {
      setActiveWord(null);
    }, 300);
  }, [isTouchDevice]);

  // WordCard 鼠标进入时取消隐藏
  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // 移动端点击备用
  const handleWordClick = useCallback(
    (lemma: string, sourceTime: number, e: React.MouseEvent) => {
      // 移动端优先用 click
      if ('ontouchstart' in window || window.innerWidth < 640) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setActiveWord({ lemma, sourceTime, position: { top: rect.bottom + 4, left: rect.left } });
      }
    },
    []
  );

  // 收藏句子
  const handleSaveQuote = useCallback(
    async (segment: TranscriptSegment) => {
      if (!onSaveQuote) return;
      const key = `${segment.startTime}-${segment.endTime}`;
      setActionStatus(null);
      setSavingQuote((prev) => new Set(prev).add(key));
      try {
        const saved = await onSaveQuote(segment);
        if (saved) {
          setSavedQuotes((previous) => new Set(previous).add(key));
          setActionStatus("已收藏这句话；约 24 小时后会进入复习，并保留当前时间点。");
        }
      } finally {
        setSavingQuote((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [onSaveQuote]
  );

  const handleCopyQuote = useCallback(async (segment: TranscriptSegment) => {
    const key = `${segment.startTime}-${segment.endTime}`;
    setActionStatus(null);
    try {
      await navigator.clipboard.writeText(segment.text);
      setCopiedQuote(key);
      setActionStatus("原文已复制到剪贴板。");
    } catch {
      setActionStatus("浏览器未允许复制。可直接选中文字后复制。");
    }
  }, []);

  const activeDefinition =
    activeWord ? wordDefinitions?.get(activeWord.lemma) : undefined;

  // 检查是否已有翻译数据
  const hasTranslation = hasDisplayableTranslation(transcript);
  const needsTranslation = (displayMode === "zh" || displayMode === "bilingual") && !hasCompleteTranslation(transcript);

  // 显示规则：中文模式下如果没有翻译，回退显示英文
  const showZh = (displayMode === "zh" || displayMode === "bilingual") && hasTranslation;
  const showEn = displayMode === "en" || displayMode === "bilingual" || (displayMode === "zh" && !hasTranslation);

  // 渲染带交互单词的文本
  const renderText = useCallback(
    (text: string, sourceTime: number) => {
      const tokens = tokenizeText(text);
      return tokens.map((token, i) => {
        if (isAlpha(token) && wordDefinitions) {
          const lemma = lemmatizeWord(token);
          const def = wordDefinitions.get(lemma);
          if (def) {
            return (
              <span
                key={i}
                className="inline-block min-h-6 cursor-pointer text-[var(--tp-accent)] decoration-dotted underline-offset-2 hover:underline"
                onMouseEnter={(e) => handleWordEnter(lemma, sourceTime, e)}
                onMouseLeave={handleWordLeave}
                onClick={(e) => handleWordClick(lemma, sourceTime, e)}
              >
                {token}
              </span>
            );
          }
        }
        return <span key={i}>{token}</span>;
      });
    },
    [wordDefinitions, handleWordEnter, handleWordLeave, handleWordClick]
  );

  return (
    <Card className={cn("md:flex md:h-full md:flex-col", hideHeader && "border-0 bg-transparent")}>
      {!hideHeader && (
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <ListVideo className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
              转录文本
            </CardTitle>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
              {onDisplayModeChange && (
                <DisplayModeToggle value={displayMode} onChange={onDisplayModeChange} />
              )}
              {needsTranslation && translating && (
                <span className="text-[11px] text-white/30 animate-pulse">翻译中...</span>
              )}
              {translationError ? (
                <button type="button" onClick={onRetryTranslation} className="inline-flex min-h-11 max-w-full items-center gap-1.5 text-left text-[11px] leading-4 text-red-300">
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{translationError} 点击重试</span>
                </button>
              ) : needsTranslation && !translating && (
                <span className="text-[11px] text-white/20">切换至中英/中文模式以触发翻译</span>
              )}
              {!loading && transcript.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoScroll;
                    setAutoScroll(next);
                    setShowJumpButton(!next);
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-colors",
                    autoScroll
                      ? "bg-[rgba(91,168,255,0.14)] text-[var(--tp-accent)] hover:bg-[rgba(91,168,255,0.2)]"
                      : "bg-white/6 text-white/50 hover:bg-white/10 hover:text-white/70"
                  )}
                >
                  {autoScroll ? (
                    <Pin className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <PinOff className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {autoScroll ? "跟随中" : "自动跟随"}
                </button>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      {/* hideHeader 模式下的控制栏 */}
      {hideHeader && (
        <div className="flex flex-wrap items-start justify-between gap-2 px-3 pb-1 pt-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {onDisplayModeChange && (
              <DisplayModeToggle value={displayMode} onChange={onDisplayModeChange} />
            )}
            {needsTranslation && translating && (
              <span className="text-[11px] text-white/30 animate-pulse">翻译中...</span>
            )}
            {translationError ? (
              <button type="button" onClick={onRetryTranslation} className="inline-flex min-h-11 max-w-full items-center gap-1.5 text-left text-[11px] leading-4 text-red-300">
                <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{translationError} 点击重试</span>
              </button>
              ) : needsTranslation && !translating && !hasTranslation && (
                <span className="text-[11px] text-white/20">切换模式以翻译</span>
              )}
          </div>
          {!loading && transcript.length > 0 && (
            <button
              type="button"
              onClick={() => setAutoScroll((v) => !v)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors",
                autoScroll
                  ? "bg-[rgba(91,168,255,0.14)] text-[var(--tp-accent)] hover:bg-[rgba(91,168,255,0.2)]"
                  : "bg-white/6 text-white/50 hover:bg-white/10 hover:text-white/70"
              )}
            >
              {autoScroll ? (
                <Pin className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <PinOff className="h-3.5 w-3.5" aria-hidden />
              )}
              {autoScroll ? "跟随中" : "自动跟随"}
            </button>
          )}
        </div>
      )}
      <CardContent className="relative md:flex md:min-h-0 md:flex-1 md:flex-col">
        {!loading && transcript.length > 0 && showLearningGuidance ? (
          <aside className="mb-3 rounded-lg border border-[rgba(91,168,255,0.28)] bg-[rgba(91,168,255,0.08)] p-3" aria-label="首次收藏提示">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[var(--tp-text)]">收藏一句，随时回到出处</p>
                <p className="mt-1 text-xs leading-5 text-[var(--tp-text-muted)]">
                  句子会保留原文、视频与时间点；单词会加入次日复习。以后可在收藏与复习页继续学习。
                </p>
              </div>
              <button
                type="button"
                onClick={closeLearningGuidance}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-[var(--tp-text-muted)] transition-colors hover:bg-white/8 hover:text-[var(--tp-text)]"
                aria-label="关闭首次收藏提示"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </aside>
        ) : null}
        {!loading && transcript.length > 0 && (saveNotice || actionStatus) ? (
          <p role="status" aria-live="polite" className="mb-3 text-xs font-semibold leading-5 text-[var(--tp-accent)]">{actionStatus ?? saveNotice}</p>
        ) : null}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[4rem_1fr] gap-3">
                <div className="h-3 w-10 rounded-full bg-white/10 animate-breathe" />
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded-full bg-white/6 animate-breathe" />
                  <div className="h-3 w-4/5 rounded-full bg-white/6 animate-breathe" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="max-h-[50vh] space-y-3 overflow-auto pr-1 md:h-auto md:min-h-0 md:max-h-none md:flex-1"
          >
            {transcript.map((segment, i) => {
              const segKey = `${segment.startTime}-${segment.endTime}`;
              const isSaving = savingQuote.has(segKey);
              const isSaved = savedQuotes.has(segKey);
              const isCopied = copiedQuote === segKey;

              return (
                <div
                  key={segKey}
                  ref={i === activeIndex ? activeRef : undefined}
                  className={cn(
                    "group grid grid-cols-[4.5rem_1fr] gap-3 rounded-lg px-2 py-1.5 text-[14px] transition-colors",
                    i === activeIndex
                      ? "bg-[rgba(91,168,255,0.1)] ring-1 ring-[rgba(91,168,255,0.22)]"
                      : "hover:bg-white/4"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSeekTo?.(segment.startTime)}
                    aria-label={`跳转到 ${formatTimestamp(segment.startTime)} 开始播放`}
                    className={cn(
                      "inline-flex min-h-11 items-start rounded-md pt-1 font-mono text-xs font-semibold transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tp-accent)]",
                      i === activeIndex ? "text-[var(--tp-accent)]" : "text-[var(--tp-text-muted)]"
                    )}
                  >
                    {formatTimestamp(segment.startTime)}
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSeekTo?.(segment.startTime)}
                      aria-label={`从 ${formatTimestamp(segment.startTime)} 播放：${segment.text}`}
                      className="block min-h-11 w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tp-accent)]"
                    >
                      {/* 英文原文 */}
                      {showEn && (
                        <span
                          className={cn(
                            "block leading-relaxed",
                            i === activeIndex ? "text-[var(--tp-text)]" : "text-[var(--tp-text-secondary)]"
                          )}
                        >
                          {renderText(segment.text, segment.startTime)}
                        </span>
                      )}

                      {/* 中文翻译 */}
                      {showZh && segment.text_zh && (
                        <span className={cn(
                          "mt-0.5 block leading-relaxed",
                          i === activeIndex ? "text-white/70" : "text-white/35"
                        )}>
                          {segment.text_zh}
                        </span>
                      )}
                    </button>

                    <div className="mt-1 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCopyQuote(segment);
                        }}
                        className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[11px] text-[var(--tp-text-faint)] transition-colors hover:text-[var(--tp-text)]"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                        {isCopied ? "已复制" : "复制原文"}
                      </button>
                      {onSaveQuote ? (
                        <button
                          type="button"
                          disabled={isSaving || isSaved}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleSaveQuote(segment);
                          }}
                          className={cn(
                            "inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[11px] transition-colors",
                            isSaving || isSaved
                              ? "text-[var(--tp-accent)]"
                              : "text-[var(--tp-text-faint)] hover:text-[var(--tp-accent)]"
                          )}
                        >
                          {isSaving || isSaved ? (
                            <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Bookmark className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {isSaved ? "已收藏" : isSaving ? "保存中" : "收藏句子"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 跳转到当前播放位置 */}
        {showJumpButton && activeIndex >= 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <button
              type="button"
              onClick={jumpToCurrent}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[rgba(91,168,255,0.35)] bg-[rgba(91,168,255,0.14)] px-4 text-xs font-semibold text-[var(--tp-accent)] shadow-lg backdrop-blur-sm transition-colors hover:bg-[rgba(91,168,255,0.22)]"
            >
              <Navigation className="h-3.5 w-3.5" />
              跳转到当前
            </button>
          </div>
        )}
      </CardContent>

      {/* 词义弹窗 */}
      {activeWord && activeDefinition && (
        <WordCard
          definition={activeDefinition}
          position={activeWord.position}
          onClose={closeWordCard}
          onSave={onSaveWord
            ? (lemma) => onSaveWord(lemma, activeWord.sourceTime)
            : undefined}
          onMouseEnter={cancelHide}
          onMouseLeave={handleWordLeave}
        />
      )}
    </Card>
  );
}
