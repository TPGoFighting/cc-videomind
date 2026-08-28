import { useCallback, useSyncExternalStore, useRef } from "react";
import { storage } from "@/lib/storage";

export function useStorageState<T>(
  key: string,
  fallback: T,
): [T, (next: T | ((current: T) => T)) => void, () => void] {
  const lastValueRef = useRef<T>(fallback);
  const lastSerializedRef = useRef<string>("");
  const fallbackRef = useRef<T>(fallback);

  // Keep fallbackRef updated so we don't need fallback as a dependency in useCallback
  fallbackRef.current = fallback;

  const getSnapshot = useCallback(() => {
    const val = storage.get(key, fallbackRef.current);
    const serialized = JSON.stringify(val);
    if (serialized === lastSerializedRef.current) {
      return lastValueRef.current;
    }
    lastSerializedRef.current = serialized;
    lastValueRef.current = val;
    return val;
  }, [key]);

  const subscribe = useCallback(
    (listener: () => void) => storage.subscribe(key, listener),
    [key]
  );

  const getServerSnapshot = useCallback(() => fallbackRef.current, []);

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const value = typeof next === "function"
        ? (next as (current: T) => T)(storage.get(key, fallbackRef.current))
        : next;
      storage.set(key, value);
    },
    [key]
  );

  const clearValue = useCallback(() => {
    storage.remove(key);
  }, [key]);

  return [value, setValue, clearValue];
}
