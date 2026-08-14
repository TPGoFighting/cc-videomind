"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { TranscriptSegment, WordDefinition } from "@/lib/types";
import { extractLemmas } from "@/lib/utils/tokenize";

/** 简单的字符串哈希，避免 SWR key 过长 */
function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

const fetcher = async (lemmas: string[]): Promise<WordDefinition[]> => {
  const res = await fetch("/api/word-definitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lemmas }),
  });
  if (!res.ok) {
    console.error(`[WordDefs] API 返回 ${res.status}:`, res.statusText);
    return [];
  }
  const json = await res.json();
  return json.data?.definitions ?? [];
};

export function useWordDefinitions(transcript: TranscriptSegment[], enabled = true) {
  const lemmas = useMemo(() => {
    const all = extractLemmas(transcript);
    // 截断到 400，避免超出 API schema 的 max 限制
    return all.length > 400 ? all.slice(0, 400) : all;
  }, [transcript]);

  // 用哈希缩短 SWR key，避免超长 key 引发性能问题
  const key = enabled && lemmas.length > 0 ? `wd:${hashStr(lemmas.join(","))}` : null;

  const { data, error } = useSWR(
    key,
    () => fetcher(lemmas),
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );

  if (error) {
    console.error("[WordDefs] SWR 获取失败:", error);
  }

  const definitionMap = useMemo(() => {
    const map = new Map<string, WordDefinition>();
    for (const def of data ?? []) {
      map.set(def.lemma, def);
    }
    return map;
  }, [data]);

  return definitionMap;
}
