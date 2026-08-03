/**
 * useCachedQuery — wraps TanStack Query with MMKV-backed offline cache.
 * Returns cached data immediately while refetching in the background.
 */
import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';
import { CacheManager } from '@/offline/storage';

export function useCachedQuery<T>(key: QueryKey, fn: () => Promise<T>, opts?: { enabled?: boolean; staleTime?: number }) {
  const qKeyStr = Array.isArray(key) ? key.join(':') : String(key);
  const cached = CacheManager.get<T>(qKeyStr);

  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const result = await fn();
      CacheManager.set(qKeyStr, result);
      return result;
    },
    initialData: cached ?? undefined,
    enabled: opts?.enabled ?? true,
    staleTime: opts?.staleTime ?? 30_000,
  });

  return q;
}

export function useInvalidateOnFocus() {
  const qc = useQueryClient();
  useEffect(() => {
    const { AppState } = require('react-native');
    const sub = AppState.addEventListener('change', (s: string) => {
      if (s === 'active') qc.invalidateQueries();
    });
    return () => sub.remove();
  }, []);
}
