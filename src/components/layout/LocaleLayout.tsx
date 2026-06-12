import { useEffect } from 'react'
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import i18n from '@/i18n'
import { LOCALES, DEFAULT_LOCALE, type LocaleCode } from '@/i18n/config'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SeoHead } from '@/components/layout/SeoHead'
import { TOOLS } from '@/lib/tools-config'
import { getPathWithoutLocale } from '@/lib/seo'

interface LocaleLayoutProps {
  locale?: LocaleCode
}

export function LocaleLayout({ locale: propLocale }: LocaleLayoutProps) {
  const { locale: paramLocale } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const locale: LocaleCode = propLocale ?? (
    LOCALES.includes(paramLocale as LocaleCode) ? (paramLocale as LocaleCode) : DEFAULT_LOCALE
  )

  useEffect(() => {
    if (!propLocale && paramLocale && !LOCALES.includes(paramLocale as LocaleCode)) {
      navigate('/', { replace: true })
    }
  }, [paramLocale, propLocale, navigate])

  useEffect(() => {
    i18n.changeLanguage(locale)
  }, [locale])

  const toolPath = getPathWithoutLocale(pathname, locale)
  const tool = TOOLS.find((t) => t.href === toolPath)
  const breadcrumbs = tool ? [{ label: tool.category }, { label: tool.title }] : undefined

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SeoHead currentLocale={locale} currentPath={pathname} />
      <Header breadcrumbs={breadcrumbs} currentLocale={locale} currentPath={pathname} />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
