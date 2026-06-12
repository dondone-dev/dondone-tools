import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

interface ToolLayoutProps {
  toolId: string
  category: string
  children: ReactNode
}

export function ToolLayout({ toolId, category, children }: ToolLayoutProps) {
  const { t } = useTranslation(['tools', 'common'])

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs font-normal">
            {t(`categories.${category}`, { ns: 'common' })}
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{t(`${toolId}.title`, { ns: 'tools' })}</h1>
        <p className="text-sm text-muted-foreground">{t(`${toolId}.description`, { ns: 'tools' })}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </main>
  )
}
