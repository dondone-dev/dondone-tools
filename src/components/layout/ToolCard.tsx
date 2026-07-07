import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Star, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ToolCardProps {
  title: string
  descriptionKey: string
  href: string
  icon: LucideIcon
  category: string
  isFavorite?: boolean
  className?: string
}

export function ToolCard({ title, descriptionKey, href, icon: Icon, category, isFavorite, className }: ToolCardProps) {
  const { t } = useTranslation(['tools', 'common'])

  return (
    <Link
      to={href}
      className={cn(
        'group block rounded-lg border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all duration-150',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="p-2 rounded-md bg-muted group-hover:bg-muted/80 transition-colors">
          <Icon className="h-4 w-4 text-foreground/70" />
        </div>
        <div className="flex items-center gap-1.5">
          {isFavorite && (
            <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
          )}
          <Badge variant="outline" className="text-xs font-normal shrink-0">
            {t(`categories.${category}`, { ns: 'common' })}
          </Badge>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm mb-1 group-hover:text-foreground transition-colors">
          {title}
        </h3>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {t(descriptionKey, { ns: 'tools' })}
      </p>
    </Link>
  )
}
