import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchVideos, type SearchResult } from "@/lib/search";

export function useVideoSearch(query: string, delayMs = 500) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // 防抖处理
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [query, delayMs]);

  const { data, isLoading, isError, error } = useQuery<SearchResult[]>({
    queryKey: ["videoSearch", debouncedQuery],
    queryFn: () => searchVideos(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 分钟缓存
  });

  return {
    results: data ?? [],
    isLoading: isLoading && debouncedQuery.trim().length > 0,
    isError,
    error,
    debouncedQuery,
  };
}
