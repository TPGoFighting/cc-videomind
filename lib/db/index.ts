import type { QueryResultRow } from "pg";
import { queryTencent } from "@/lib/tencent-db";

/**
 * Compatibility entrypoint for older repository modules.
 *
 * Production has one PostgreSQL pool and one schema initializer. New code
 * should import queryTencent directly; existing vector/task repositories can
 * continue importing query while they are renamed.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return queryTencent<T>(text, params);
}
