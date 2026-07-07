import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/lib/utils'

interface ToolLayoutProps {
  toolId: string
  category: string
  children: ReactNode
  headerExtra?: ReactNode
}

export function ToolLayout({ toolId, category, children, headerExtra }: ToolLayoutProps) {
  const { t } = useTranslation(['tools', 'common'])
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorited = isFavorite(toolId)

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-xs font-normal">
            {t(`categories.${category}`, { ns: 'common' })}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0"
            onClick={() => toggleFavorite(toolId)}
            aria-label={t(favorited ? 'ui.removeFavorite' : 'ui.addFavorite', { ns: 'common' })}
          >
            <Star
              className={cn(
                'h-4 w-4 transition-colors',
                favorited ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground',
              )}
            />
          </Button>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t(`${toolId}.title`, { ns: 'tools' })}</h1>
          {headerExtra}
        </div>
        <p className="text-sm text-muted-foreground">{t(`${toolId}.description`, { ns: 'tools' })}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </main>
  )
}
