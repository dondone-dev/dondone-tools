import { type LocaleCode, DEFAULT_LOCALE } from '@/i18n/config'

export function localeHref(locale: LocaleCode, path: string): string {
  return locale === DEFAULT_LOCALE ? path : `/${locale}${path}`
}
