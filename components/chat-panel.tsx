"use client";

import { Fragment, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ChatAnswer, JsonResponse } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";

/** 解析时间戳文本（如 "0:30", "1:05", "1:30:20"）为秒数 */
function parseTimestampToSeconds(text: string): number | null {
  const parts = text.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

const TIME_RE = /(\d{1,3}:\d{2}(?::\d{2})?)/g;

/** 将答案文本中的时间戳渲染为可点击按钮 */
function renderWithTimestamps(text: string, onSeek: (s: number) => void) {
  const parts = text.split(TIME_RE);
  return parts.map((part, i) => {
    const seconds = parseTimestampToSeconds(part);
    if (seconds !== null) {
      return (
        <button
          key={i}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSeek(seconds);
          }}
          className="inline text-[#0099ff] hover:underline font-mono font-semibold cursor-pointer"
          title={`跳转到 ${part}`}
        >
          {part}
        </button>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function ChatPanel({
  videoId,
  suggestedQuestions,
  compact,
  onSeekTo,
}: {
  videoId: string;
  suggestedQuestions: string[];
  compact?: boolean;
  onSeekTo?: (seconds: number) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<
    Array<{ question: string; answer: ChatAnswer }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(nextQuestion = question) {
    if (!nextQuestion.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, question: nextQuestion }),
      });
      const payload = (await response.json()) as JsonResponse<ChatAnswer>;
      if (!payload.ok) {
        setError(payload.error.message);
        return;
      }

      setAnswers((current) => [
        { question: nextQuestion, answer: payload.data },
        ...current,
      ]);
      setQuestion("");
    } catch {
      setError("无法从转录中找到答案，请换一种问法试试。");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => ask(item)}
                disabled={loading}
                className="rounded-full border border-white/15 bg-white/6 px-3.5 py-1.5 text-[13px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white hover:border-white/25 disabled:opacity-40"
              >
                {item}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void ask();
          }}
        >
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="基于转录内容提问…"
            aria-label="提问"
            className="h-11"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading}
            aria-label="发送问题"
          >
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </form>

        {error ? (
          <p className="text-[13px] font-medium text-red-400">{error}</p>
        ) : null}

        <div className="space-y-3">
          {answers.map((item) => (
            <article
              key={`${item.question}-${item.answer.answer.slice(0, 40)}`}
              className="rounded-lg border border-white/8 bg-white/4 p-3.5"
            >
              <h3 className="text-[14px] font-semibold leading-snug">
                {item.question}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#a6a6a6]">
                {onSeekTo
                  ? renderWithTimestamps(item.answer.answer, onSeekTo)
                  : item.answer.answer}
              </p>
              <div className="mt-3 space-y-1">
                {item.answer.citations.map((citation) => (
                  <p
                    key={`${citation.startTime}-${citation.quote.slice(0, 30)}`}
                    className="text-[12px] leading-relaxed text-white/50"
                  >
                    {onSeekTo ? (
                      <button
                        type="button"
                        onClick={() => onSeekTo(citation.startTime)}
                        className="font-mono font-semibold text-[#0099ff] hover:underline cursor-pointer"
                      >
                        {formatTimestamp(citation.startTime)}–{formatTimestamp(citation.endTime)}
                      </button>
                    ) : (
                      <span className="font-mono font-semibold text-[#0099ff]">
                        {formatTimestamp(citation.startTime)}–{formatTimestamp(citation.endTime)}
                      </span>
                    )}{" "}
                    {citation.quote}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageSquare className="h-4 w-4 text-[#0099ff]" aria-hidden />
          向视频提问
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 建议问题 */}
        {suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => ask(item)}
                disabled={loading}
                className="rounded-full border border-white/15 bg-white/6 px-3.5 py-1.5 text-[13px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white hover:border-white/25 disabled:opacity-40"
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {/* 输入区 */}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void ask();
          }}
        >
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="基于转录内容提问…"
            aria-label="提问"
            className="h-11"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading}
            aria-label="发送问题"
          >
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </form>

        {error ? (
          <p className="text-[13px] font-medium text-red-400">{error}</p>
        ) : null}

        {/* 回答列表 */}
        <div className="space-y-3">
          {answers.map((item) => (
            <article
              key={`${item.question}-${item.answer.answer.slice(0, 40)}`}
              className="rounded-lg border border-white/8 bg-white/4 p-3.5"
            >
              <h3 className="text-[14px] font-semibold leading-snug">
                {item.question}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#a6a6a6]">
                {onSeekTo
                  ? renderWithTimestamps(item.answer.answer, onSeekTo)
                  : item.answer.answer}
              </p>
              <div className="mt-3 space-y-1">
                {item.answer.citations.map((citation) => (
                  <p
                    key={`${citation.startTime}-${citation.quote.slice(0, 30)}`}
                    className="text-[12px] leading-relaxed text-white/50"
                  >
                    {onSeekTo ? (
                      <button
                        type="button"
                        onClick={() => onSeekTo(citation.startTime)}
                        className="font-mono font-semibold text-[#0099ff] hover:underline cursor-pointer"
                      >
                        {formatTimestamp(citation.startTime)}–{formatTimestamp(citation.endTime)}
                      </button>
                    ) : (
                      <span className="font-mono font-semibold text-[#0099ff]">
                        {formatTimestamp(citation.startTime)}–{formatTimestamp(citation.endTime)}
                      </span>
                    )}{" "}
                    {citation.quote}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
