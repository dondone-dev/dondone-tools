import { Link } from 'react-router-dom'
import { Wrench, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { localeHref } from '@/i18n/utils'
import { type LocaleCode, DEFAULT_LOCALE } from '@/i18n/config'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[]
  currentLocale?: LocaleCode
  currentPath?: string
}

export function Header({ breadcrumbs, currentLocale = DEFAULT_LOCALE, currentPath = '/' }: HeaderProps) {
  const isHome = currentPath === '/' || currentPath === `/${currentLocale}`

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
        <Link
          to={localeHref(currentLocale, '/')}
          className="flex items-center gap-2 text-sm font-semibold hover:text-foreground/80 transition-colors shrink-0"
        >
          <Wrench className="h-4 w-4" />
          <span>dondone tools</span>
        </Link>

        {!isHome && breadcrumbs && breadcrumbs.length > 0 && (
          <>
            {breadcrumbs.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                {item.href ? (
                  <Link
                    to={item.href}
                    className={cn(
                      'text-sm hover:text-foreground transition-colors',
                      index === breadcrumbs.length - 1
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'text-sm',
                      index === breadcrumbs.length - 1
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </span>
            ))}
          </>
        )}

        <div className="ml-auto">
          <LanguageSwitcher currentLocale={currentLocale} currentPath={currentPath} />
        </div>
      </div>
    </header>
  )
}
