import { useEffect } from 'react'
import { LOCALES, DEFAULT_LOCALE, type LocaleCode } from '@/i18n/config'
import { localeHref } from '@/i18n/utils'

const HOSTNAME = 'https://tools.dondone.dev'

interface LocaleHeadProps {
  currentLocale: LocaleCode
  currentPath: string
}

function getToolPath(locale: LocaleCode, currentPath: string): string {
  const pathWithoutLocale =
    locale === DEFAULT_LOCALE
      ? currentPath
      : currentPath.replace(`/${locale}`, '') || '/'
  return pathWithoutLocale
}

export function LocaleHead({ currentLocale, currentPath }: LocaleHeadProps) {
  useEffect(() => {
    const toolPath = getToolPath(currentLocale, currentPath)
    const existing = document.querySelectorAll('link[rel="alternate"][hreflang]')
    existing.forEach((el) => el.remove())

    const links: HTMLLinkElement[] = []

    LOCALES.forEach((locale) => {
      const href = `${HOSTNAME}${localeHref(locale, toolPath)}`
      const link = document.createElement('link')
      link.rel = 'alternate'
      link.hreflang = locale
      link.href = href
      document.head.appendChild(link)
      links.push(link)
    })

    const xDefault = document.createElement('link')
    xDefault.rel = 'alternate'
    xDefault.setAttribute('hreflang', 'x-default')
    xDefault.href = `${HOSTNAME}${toolPath}`
    document.head.appendChild(xDefault)
    links.push(xDefault)

    return () => { links.forEach((el) => el.remove()) }
  }, [currentLocale, currentPath])

  return null
}
