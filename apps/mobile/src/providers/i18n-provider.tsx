import { useEffect, type ReactNode } from "react";
import "@/i18n";
import i18n from "i18next";
import { storage } from "@/lib/storage";
import { getLocales } from "expo-localization";
import type { SupportedLangCode } from "@/i18n";

const LANGUAGE_KEY = "app:language";

function resolveInitialLang(): SupportedLangCode {
  const saved = storage.get<string | null>(LANGUAGE_KEY, null);
  if (saved === "zh" || saved === "en") return saved;
  if (saved === "简体中文") return "zh";
  if (saved === "English") return "en";

  const systemLang = getLocales()[0]?.languageCode;
  if (systemLang === "zh") return "zh";
  if (systemLang === "en") return "en";
  return "zh";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lang = resolveInitialLang();
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, []);

  return <>{children}</>;
}
