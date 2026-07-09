import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { storage } from "@/lib/storage";
import { lightTheme, darkTheme, type Theme } from "@/theme";

// ---- 类型 ----

type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
};

// ---- Context ----

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = "app:theme-mode";

// ---- Provider ----

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    const saved = storage.get<ThemeMode>(THEME_KEY, "system");
    setModeState(saved ?? "system");
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    storage.set(THEME_KEY, newMode);
  }, []);

  const resolvedScheme = mode === "system" ? (systemScheme ?? "dark") : mode;
  const isDark = resolvedScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---- Hook ----

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme 必须在 ThemeProvider 内部使用。");
  }
  return ctx;
}
