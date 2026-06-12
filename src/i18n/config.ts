export const LOCALES = ['en', 'zh', 'ja', 'fr', 'ko', 'es', 'de', 'pt', 'ru'] as const
export type LocaleCode = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: LocaleCode = 'en'

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  fr: 'Français',
  ko: '한국어',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
}
