"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CACHE_PREFIX = "vm_cache:";

interface CacheEntry<T> {
  data: T;
  userId: string;
  cachedAt: number;
}

/**
 * Stale-while-revalidate 数据获取 Hook。
 * 首次访问 → 网络加载；后续访问 → localStorage 缓存即时渲染 + 后台静默刷新。
 *
 * @param cacheKey   localStorage 缓存键名
 * @param fetchFn    返回 { ok, data } 的网络请求函数
 * @param deps       触发重新获取的依赖项
 * @param userId     当前用户 ID，用于区分多用户缓存
 */
export function useCachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<{ ok: boolean; data?: T[] }>,
  options: { deps: unknown[]; userId?: string | null },
) {
  const { deps, userId } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  // 加载数据：先读缓存，再网络请求
  useEffect(() => {
    let cancelled = false;
    const key = CACHE_PREFIX + cacheKey;

    async function load() {
      // 1. 读 localStorage 缓存
      let hasCache = false;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const entry = JSON.parse(raw) as CacheEntry<T[]>;
          if (entry.userId === userId && Array.isArray(entry.data)) {
            if (!cancelled) {
              setData(entry.data);
              setLoading(false);
              hasCache = true;
            }
          }
        }
      } catch {
        // 缓存损坏，忽略
      }

      // 2. 网络请求
      try {
        const res = await fetchFn();
        if (!cancelled) {
          if (res.ok && res.data !== undefined) {
            setData(res.data);
            // 写入 localStorage
            try {
              const entry: CacheEntry<T[]> = {
                data: res.data,
                userId: userId ?? "",
                cachedAt: Date.now(),
              };
              localStorage.setItem(key, JSON.stringify(entry));
            } catch {
              // localStorage 满或不可用
            }
          } else if (!hasCache) {
            // 无缓存且网络失败或数据为空
            setData([]);
          }
        }
      } catch {
        // 网络异常，保持缓存数据不动
      } finally {
        if (!cancelled && !hasCache) {
          setLoading(false);
        }
      }

      fetchedRef.current = true;
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // mutate: 同时更新 state 和 localStorage
  const mutate = useCallback(
    (updater: (prev: T[]) => T[]) => {
      setData((prev) => {
        const next = updater(prev);
        // 回写 localStorage
        try {
          const entry: CacheEntry<T[]> = {
            data: next,
            userId: userId ?? "",
            cachedAt: Date.now(),
          };
          localStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(entry));
        } catch {
          // 忽略
        }
        return next;
      });
    },
    [cacheKey, userId],
  );

  return { data, loading, mutate };
}
