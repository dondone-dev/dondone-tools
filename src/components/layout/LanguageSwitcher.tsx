import { useNavigate } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LOCALES, LOCALE_LABELS, type LocaleCode } from '@/i18n/config'
import { localeHref } from '@/i18n/utils'
import { getPathWithoutLocale } from '@/lib/seo'

interface LanguageSwitcherProps {
  currentLocale: LocaleCode
  currentPath: string
}

export function LanguageSwitcher({ currentLocale, currentPath }: LanguageSwitcherProps) {
  const navigate = useNavigate()

  function handleChange(targetLocale: string) {
    const locale = targetLocale as LocaleCode
    const path = localeHref(locale, getPathWithoutLocale(currentPath, currentLocale))
    localStorage.setItem('preferred-locale', locale)
    navigate(path)
  }

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger className="w-[110px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="max-h-none [&_[data-slot=select-viewport]]:h-auto [&_[data-slot=select-scroll-up-button]]:hidden [&_[data-slot=select-scroll-down-button]]:hidden"
      >
        {LOCALES.map((locale) => (
          <SelectItem key={locale} value={locale} className="text-xs">
            {LOCALE_LABELS[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
