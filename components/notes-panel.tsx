"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, NotebookPen, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-context";
import type { JsonResponse, UserNote } from "@/lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function fetchNotes(videoId: string): Promise<UserNote[]> {
  const res = await fetch(`/api/notes?videoId=${encodeURIComponent(videoId)}`);
  const payload = (await res.json()) as JsonResponse<UserNote[]>;
  if (!payload.ok) return [];
  return payload.data;
}

export function NotesPanel({ videoId, compact }: { videoId: string; compact?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const loggedIn = !authLoading && user !== null;

  // 加载已保存的笔记
  const loadNotes = useCallback(async () => {
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await fetchNotes(videoId);
    setNotes(data);
    setLoading(false);
  }, [videoId, loggedIn]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

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
      const payload = (await response.json()) as JsonResponse<UserNote>;
      if (!payload.ok) {
        setStatus(payload.error.message);
        return;
      }

      setBody("");
      setStatus("已保存");
      // 重新加载列表以获取完整数据
      await loadNotes();
    } catch {
      setStatus("保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    setDeleting((prev) => new Set(prev).add(noteId));
    try {
      await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      // 静默失败
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }
  }

  const content = (
    <div className="space-y-4">
      {/* 输入区 */}
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={loggedIn ? "写下你的笔记…" : "登录后可保存笔记"}
        disabled={!loggedIn}
        aria-label="视频笔记"
        className="min-h-[80px]"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-white/35">
          {status ?? (loggedIn ? "" : "登录后可保存笔记。")}
        </p>
        <Button
          type="button"
          onClick={saveNote}
          disabled={!loggedIn || saving || !body.trim()}
          variant="secondary"
          size="sm"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          保存
        </Button>
      </div>

      {/* 分隔 */}
      {notes.length > 0 && (
        <div className="border-t border-white/8 pt-3">
          <p className="text-[11px] text-white/25 mb-3">
            历史笔记 · {notes.length} 条
          </p>
        </div>
      )}

      {/* 笔记列表 */}
      {loading && loggedIn && (
        <div className="flex items-center gap-2 text-white/30 text-[13px] py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          加载中…
        </div>
      )}

      {!loading && notes.length === 0 && loggedIn && (
        <p className="text-[13px] text-white/20 py-2">暂无笔记，保存一条试试。</p>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="group rounded-lg bg-white/[0.03] px-3 py-2.5 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap flex-1 min-w-0">
                {note.body}
              </p>
              <button
                type="button"
                disabled={deleting.has(note.id)}
                onClick={() => deleteNote(note.id)}
                className="shrink-0 rounded p-1 text-white/10 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                title="删除笔记"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-white/20">
              {formatDate(note.created_at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  if (compact) {
    return <div className="space-y-3">{content}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <NotebookPen className="h-4 w-4 text-[#0099ff]" aria-hidden />
          笔记
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
