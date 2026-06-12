import { useNavigate } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LOCALES, LOCALE_LABELS, type LocaleCode, DEFAULT_LOCALE } from '@/i18n/config'
import { localeHref } from '@/i18n/utils'

interface LanguageSwitcherProps {
  currentLocale: LocaleCode
  currentPath: string
}

export function LanguageSwitcher({ currentLocale, currentPath }: LanguageSwitcherProps) {
  const navigate = useNavigate()

  function getPathWithoutLocale(): string {
    if (currentLocale === DEFAULT_LOCALE) return currentPath
    const stripped = currentPath.replace(`/${currentLocale}`, '')
    return stripped || '/'
  }

  function handleChange(targetLocale: string) {
    const locale = targetLocale as LocaleCode
    const path = localeHref(locale, getPathWithoutLocale())
    localStorage.setItem('preferred-locale', locale)
    navigate(path)
  }

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger className="w-[110px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((locale) => (
          <SelectItem key={locale} value={locale} className="text-xs">
            {LOCALE_LABELS[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
