"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, Check, X } from "lucide-react";
import type { WordDefinition } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function getAdjustedPosition(top: number, left: number) {
  if (typeof window === "undefined") {
    return { top, left };
  }
  const width = window.innerWidth;
  if (width < 640) {
    // 移动端：居中显示，避免溢出
    return {
      top: Math.max(80, Math.min(top, window.innerHeight - 420)),
      left: Math.max(8, (width - 288) / 2),
    };
  }
  return {
    top,
    left: Math.min(left, width - 304),
  };
}

export function WordCard({
  definition,
  position,
  onClose,
  onSave,
  onMouseEnter,
  onMouseLeave,
}: {
  definition: WordDefinition;
  position: { top: number; left: number };
  onClose: () => void;
  onSave?: (lemma: string) => Promise<boolean>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const adjustedPos = getAdjustedPosition(position.top, position.left);

  // 点击外部关闭
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // ESC 关闭
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* 移动端遮罩层 */}
      <div
        className="fixed inset-0 z-40 bg-black/40 sm:hidden"
        onClick={onClose}
      />

      <div
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="fixed z-50 w-[calc(100vw-1rem)] max-w-72 rounded-xl border border-white/15 bg-[#1a1a1a] p-4 shadow-2xl sm:max-h-[80vh] sm:overflow-y-auto"
        style={{ top: adjustedPos.top, left: adjustedPos.left }}
      >
        {/* 关闭按钮（移动端可见） */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60 sm:hidden"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 词条头部 */}
        <div className="flex items-start justify-between gap-2 pr-6 sm:pr-0">
          <div>
            <span className="text-[16px] font-semibold text-white break-words">
              {definition.lemma}
            </span>
            {definition.phonetic && (
              <span className="ml-2 text-[12px] text-white/40">
                {definition.phonetic}
              </span>
            )}
          </div>
          {onSave && (
            <button
              type="button"
              disabled={saving || saved}
              onClick={async () => {
                setSaving(true);
                const ok = await onSave(definition.lemma);
                if (ok) setSaved(true);
                setSaving(false);
              }}
              className={cn(
                "shrink-0 rounded-md p-2 transition-colors min-h-[40px] min-w-[40px]",
                saved
                  ? "text-[#0099ff]"
                  : "text-white/30 hover:bg-[#0099ff]/15 hover:text-[#0099ff]"
              )}
            >
              {saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* 词性 */}
        {definition.partOfSpeech && (
          <span className="mt-1 inline-block text-[11px] italic text-white/30">
            {definition.partOfSpeech}
          </span>
        )}

        {/* 中文释义 */}
        <p className="mt-2 text-[13px] leading-relaxed text-white/80">
          {definition.definitionZh}
        </p>

        {/* 英文释义 */}
        {definition.definitionEn && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-white/40">
            {definition.definitionEn}
          </p>
        )}

        {/* 例句 */}
        {definition.exampleEn && (
          <div className="mt-2 rounded-lg bg-white/5 px-3 py-2">
            <p className="text-[12px] leading-relaxed text-white/70">
              {definition.exampleEn}
            </p>
            {definition.exampleZh && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">
                {definition.exampleZh}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
