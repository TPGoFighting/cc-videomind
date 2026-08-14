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
  if (!payload.ok) throw new Error(payload.error.message);
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
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const loggedIn = !authLoading && user !== null;

  // 刷新笔记列表（saveNote 后调用）
  const loadNotes = useCallback(async () => {
    const data = await fetchNotes(videoId);
    setNotes(data);
  }, [videoId]);

  // 初始加载
  useEffect(() => {
    if (!loggedIn) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    let cancelled = false;
    fetchNotes(videoId)
      .then((data) => {
        if (!cancelled) {
          setNotes(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("暂时无法加载笔记，请稍后重试。");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [videoId, loggedIn]);

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
      try {
        // 优先使用服务端排序；刷新失败时仍保留已经成功写入的笔记，避免误导用户重复提交。
        await loadNotes();
      } catch {
        setNotes((previous) => [
          payload.data,
          ...previous.filter((note) => note.id !== payload.data.id),
        ]);
        setStatus("笔记已保存，但列表刷新失败。稍后重试即可同步最新顺序。");
      }
    } catch {
      setStatus("保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (confirmingDelete !== noteId) {
      setConfirmingDelete(noteId);
      setStatus("再按一次“确认删除”即可删除这条笔记。");
      return;
    }
    setDeleting((prev) => new Set(prev).add(noteId));
    setStatus(null);
    try {
      const response = await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      const payload = (await response.json()) as JsonResponse<{ deleted: boolean }>;
      if (!payload.ok) {
        setStatus(payload.error.message || "删除失败，请稍后重试。");
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setConfirmingDelete(null);
      setStatus("笔记已删除。");
    } catch {
      setStatus("删除失败，请检查网络后重试。");
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
        <p aria-live="polite" className="text-xs text-[var(--tp-text-muted)]">
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
        <div className="border-t border-[var(--tp-border)] pt-3">
          <p className="mb-3 text-xs text-[var(--tp-text-faint)]">
            历史笔记 · {notes.length} 条
          </p>
        </div>
      )}

      {/* 笔记列表 */}
      {loading && loggedIn && (
        <div className="flex items-center gap-2 py-2 text-[13px] text-[var(--tp-text-muted)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          加载中…
        </div>
      )}

      {!loading && notes.length === 0 && loggedIn && (
        <p className="py-2 text-[13px] text-[var(--tp-text-muted)]">暂无笔记，保存一条试试。</p>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-lg border border-[var(--tp-border)] bg-white/[0.025] px-3 py-3 transition-colors hover:border-[var(--tp-border-strong)]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--tp-text-secondary)]">
                {note.body}
              </p>
              <button
                type="button"
                disabled={deleting.has(note.id)}
                onClick={() => deleteNote(note.id)}
                className={confirmingDelete === note.id
                  ? "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-red-300 transition-colors hover:bg-red-400/15"
                  : "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[var(--tp-text-faint)] transition-colors hover:bg-white/6 hover:text-red-300"
                }
                aria-label={confirmingDelete === note.id ? "确认删除这条笔记" : "删除这条笔记"}
                title={confirmingDelete === note.id ? "确认删除" : "删除笔记"}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--tp-text-faint)]">
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
          <NotebookPen className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
          笔记
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
