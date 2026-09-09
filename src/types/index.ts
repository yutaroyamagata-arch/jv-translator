export type SupportedLang = 'ja' | 'vi' | 'en';
export type SourceLangOption = 'auto' | SupportedLang;

export interface TranslationTarget {
  lang: SupportedLang;
  labelJa: string;
  labelVi: string;
  flag: string;
  text: string;
  isPivotBridge?: boolean;
}

export interface TranslationResult {
  id: string;
  sourceLang: SupportedLang;
  sourceText: string;
  target1: TranslationTarget;
  target2: TranslationTarget;
  intermediateEnglish?: string;
  normalizedVi?: string;
  isTeencode?: boolean;
  durationMs: number;
  timestamp: number;
}

export type TranslationTone = 'business' | 'casual';

export interface AppSettings {
  geminiApiKey: string;
  tone: TranslationTone;
  model: string;
  adminPassword?: string;
  hideSettingsButton?: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  sourceLang: SupportedLang;
  sourceText: string;
  target1: {
    lang: SupportedLang;
    text: string;
  };
  target2: {
    lang: SupportedLang;
    text: string;
  };
}
