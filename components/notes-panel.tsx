"use client";

import { useState } from "react";
import { NotebookPen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-context";
import type { JsonResponse } from "@/lib/types";

export function NotesPanel({ videoId, compact }: { videoId: string; compact?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveNote() {
    if (!body.trim()) return;

    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, body }),
      });
      const payload = (await response.json()) as JsonResponse<{ id: string }>;
      if (!payload.ok) {
        setStatus(payload.error.message);
        return;
      }

      setBody("");
      setStatus("已保存");
    } catch {
      setStatus("保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  const loggedIn = !authLoading && user !== null;

  if (compact) {
    return (
      <div className="space-y-3">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={loggedIn ? "在学习过程中记录你的想法…" : "登录后可保存笔记"}
          disabled={!loggedIn}
          aria-label="视频笔记"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-white/35">
            {status ?? (loggedIn ? "" : "登录后可保存笔记。")}
          </p>
          <Button
            type="button"
            onClick={saveNote}
            disabled={!loggedIn || saving}
            variant="secondary"
            size="sm"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            保存
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <NotebookPen className="h-4 w-4 text-[#0099ff]" aria-hidden />
          笔记
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            loggedIn
              ? "在学习过程中记录你的想法…"
              : "登录后可保存笔记"
          }
          disabled={!loggedIn}
          aria-label="视频笔记"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-white/35">
            {status ?? (loggedIn ? "" : "登录后可保存笔记。")}
          </p>
          <Button
            type="button"
            onClick={saveNote}
            disabled={!loggedIn || saving}
            variant="secondary"
            size="sm"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
