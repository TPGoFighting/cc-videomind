import type { WordDefinition } from "@/lib/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * 批量查询已缓存的词义定义。
 * 返回匹配的词义列表，未找到的词形不报错。
 */
export async function getCachedWordDefinitions(
  lemmas: string[]
): Promise<WordDefinition[]> {
  if (lemmas.length === 0) return [];

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    console.error("[Cache:Learn] 服务客户端不可用，无法查询词义缓存");
    return [];
  }

  const { data, error } = await supabase
    .from("word_definitions")
    .select("lemma, phonetic, part_of_speech, definition_zh, definition_en, example_en, example_zh")
    .in("lemma", lemmas);

  if (error) {
    console.error("[Cache:Learn] 查询词义缓存失败:", error.message, "code:", error.code);
    return [];
  }

  console.log("[Cache:Learn] 从缓存查询 %d 个词形，命中 %d 条", lemmas.length, data?.length ?? 0);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    lemma: row.lemma as string,
    phonetic: row.phonetic as string | undefined,
    partOfSpeech: row.part_of_speech as string | undefined,
    definitionZh: row.definition_zh as string,
    definitionEn: row.definition_en as string | undefined,
    exampleEn: row.example_en as string | undefined,
    exampleZh: row.example_zh as string | undefined,
  }));
}

/**
 * 批量写入词义缓存（upsert by lemma）。
 * 使用 service client 绕过 RLS。
 */
export async function upsertWordDefinitions(
  definitions: WordDefinition[]
): Promise<void> {
  if (definitions.length === 0) return;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const rows = definitions.map((d) => ({
    lemma: d.lemma,
    phonetic: d.phonetic ?? null,
    part_of_speech: d.partOfSpeech ?? null,
    definition_zh: d.definitionZh,
    definition_en: d.definitionEn ?? null,
    example_en: d.exampleEn ?? null,
    example_zh: d.exampleZh ?? null,
  }));

  // 使用 upsert on conflict 策略
  const { error } = await supabase
    .from("word_definitions")
    .upsert(rows, { onConflict: "lemma", ignoreDuplicates: false });

  if (error) {
    console.error("[Cache:Learn] 写入词义缓存失败:", error.message);
  }
}
