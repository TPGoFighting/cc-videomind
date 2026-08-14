import type { WordDefinition } from "@/lib/types";
import { queryTencent } from "@/lib/tencent-db";

type WordDefinitionRow = {
  lemma: string;
  phonetic: string | null;
  part_of_speech: string | null;
  definition_zh: string;
  definition_en: string | null;
  example_en: string | null;
  example_zh: string | null;
};

/**
 * 批量查询已缓存的词义定义。
 * 返回匹配的词义列表，未找到的词形不报错。
 */
export async function getCachedWordDefinitions(
  lemmas: string[]
): Promise<WordDefinition[]> {
  if (lemmas.length === 0) return [];

  const result = await queryTencent<WordDefinitionRow>(
    `SELECT lemma, phonetic, part_of_speech, definition_zh, definition_en, example_en, example_zh
     FROM word_definitions WHERE lemma = ANY($1::text[])`,
    [lemmas],
  );

  return result.rows.map((row) => ({
    lemma: row.lemma,
    phonetic: row.phonetic ?? undefined,
    partOfSpeech: row.part_of_speech ?? undefined,
    definitionZh: row.definition_zh,
    definitionEn: row.definition_en ?? undefined,
    exampleEn: row.example_en ?? undefined,
    exampleZh: row.example_zh ?? undefined,
  }));
}

/**
 * 批量写入词义缓存（upsert by lemma）。
 * 使用腾讯 PostgreSQL 的共享词义缓存。
 */
export async function upsertWordDefinitions(
  definitions: WordDefinition[]
): Promise<void> {
  if (definitions.length === 0) return;

  const rows = definitions.map((d) => ({
    lemma: d.lemma,
    phonetic: d.phonetic ?? null,
    part_of_speech: d.partOfSpeech ?? null,
    definition_zh: d.definitionZh,
    definition_en: d.definitionEn ?? null,
    example_en: d.exampleEn ?? null,
    example_zh: d.exampleZh ?? null,
  }));

  await queryTencent(
    `INSERT INTO word_definitions
       (lemma, phonetic, part_of_speech, definition_zh, definition_en, example_en, example_zh, updated_at)
     SELECT lemma, phonetic, part_of_speech, definition_zh, definition_en, example_en, example_zh, NOW()
     FROM jsonb_to_recordset($1::jsonb) AS item(
       lemma TEXT,
       phonetic TEXT,
       part_of_speech TEXT,
       definition_zh TEXT,
       definition_en TEXT,
       example_en TEXT,
       example_zh TEXT
     )
     ON CONFLICT (lemma) DO UPDATE SET
       phonetic = EXCLUDED.phonetic,
       part_of_speech = EXCLUDED.part_of_speech,
       definition_zh = EXCLUDED.definition_zh,
       definition_en = EXCLUDED.definition_en,
       example_en = EXCLUDED.example_en,
       example_zh = EXCLUDED.example_zh,
       updated_at = NOW()`,
    [JSON.stringify(rows)],
  );
}
