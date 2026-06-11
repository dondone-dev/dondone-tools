import { Link, useLocation } from 'react-router-dom'
import { Wrench, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[]
}

export function Header({ breadcrumbs }: HeaderProps) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold hover:text-foreground/80 transition-colors shrink-0">
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
      </div>
    </header>
  )
}
