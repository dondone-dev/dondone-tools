import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ToolCardProps {
  title: string
  descriptionKey: string
  href: string
  icon: LucideIcon
  category: string
  className?: string
}

export function ToolCard({ title, descriptionKey, href, icon: Icon, category, className }: ToolCardProps) {
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
        <Badge variant="outline" className="text-xs font-normal shrink-0">
          {t(`categories.${category}`, { ns: 'common' })}
        </Badge>
      </div>
      <h3 className="font-medium text-sm mb-1 group-hover:text-foreground transition-colors">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {t(descriptionKey, { ns: 'tools' })}
      </p>
    </Link>
  )
}
