import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { storage } from "@/lib/storage";
import { zh } from "./locales/zh";
import { en } from "./locales/en";

const LANGUAGE_KEY = "app:language";

// 支持的语言列表
export const SUPPORTED_LANGUAGES = [
  { code: "zh", label: "简体中文" },
  { code: "en", label: "English" },
] as const;

export type SupportedLangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// 从存储中读取用户设置的语言，兼容旧版存储格式，否则跟随系统
function resolveInitialLang(): SupportedLangCode {
  const saved = storage.get<string | null>(LANGUAGE_KEY, null);
  if (saved === "zh" || saved === "en") return saved;
  // 兼容旧版存储的显示文本
  if (saved === "简体中文") return "zh";
  if (saved === "English") return "en";

  const systemLang = Localization.getLocales()[0]?.languageCode;
  if (systemLang === "zh") return "zh";
  if (systemLang === "en") return "en";
  return "zh";
}

export const i18nInstance = i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: resolveInitialLang(),
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});

export function setI18nLanguage(code: SupportedLangCode) {
  storage.set(LANGUAGE_KEY, code);
  i18n.changeLanguage(code);
}

export function getI18nLanguage(): SupportedLangCode {
  return (i18n.language as SupportedLangCode) || "zh";
}
