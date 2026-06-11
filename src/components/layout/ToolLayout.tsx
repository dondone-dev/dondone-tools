import { type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

interface ToolLayoutProps {
  title: string
  description: string
  category: string
  children: ReactNode
}

export function ToolLayout({ title, description, category, children }: ToolLayoutProps) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs font-normal">
            {category}
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </main>
  )
}
