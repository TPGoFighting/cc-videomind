import "expo-sqlite/localStorage/install";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export const storage = {
  get<T>(key: string, fallback: T): T {
    const value = localStorage.getItem(key);
    if (!value) {
      return fallback;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
    listeners.get(key)?.forEach((listener) => listener());
  },

  remove(key: string): void {
    localStorage.removeItem(key);
    listeners.get(key)?.forEach((listener) => listener());
  },

  subscribe(key: string, listener: Listener): () => void {
    const current = listeners.get(key) ?? new Set<Listener>();
    current.add(listener);
    listeners.set(key, current);
    return () => {
      current.delete(listener);
    };
  }
};

export function cacheKey(parts: Array<string | number | null | undefined>): string {
  return parts.filter((part) => part !== null && part !== undefined).join(":");
}
