"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ChatAnswer, JsonResponse } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";

export function ChatPanel({
  videoId,
  suggestedQuestions,
}: {
  videoId: string;
  suggestedQuestions: string[];
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
                {item.answer.answer}
              </p>
              <div className="mt-3 space-y-1">
                {item.answer.citations.map((citation) => (
                  <p
                    key={`${citation.startTime}-${citation.quote.slice(0, 30)}`}
                    className="text-[12px] leading-relaxed text-white/50"
                  >
                    <span className="font-mono font-semibold text-[#0099ff]">
                      {formatTimestamp(citation.startTime)}–{formatTimestamp(citation.endTime)}
                    </span>{" "}
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
