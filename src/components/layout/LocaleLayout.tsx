import { useEffect } from 'react'
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import i18n from '@/i18n'
import { LOCALES, DEFAULT_LOCALE, type LocaleCode } from '@/i18n/config'
import { Header } from '@/components/layout/Header'
import { TOOLS } from '@/lib/tools-config'

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

  const toolPath = locale === DEFAULT_LOCALE ? pathname : pathname.replace(`/${locale}`, '') || '/'
  const tool = TOOLS.find((t) => t.href === toolPath)
  const breadcrumbs = tool ? [{ label: tool.category }, { label: tool.title }] : undefined

  return (
    <div className="min-h-screen bg-background">
      <Header breadcrumbs={breadcrumbs} currentLocale={locale} currentPath={pathname} />
      <Outlet />
    </div>
  )
}
