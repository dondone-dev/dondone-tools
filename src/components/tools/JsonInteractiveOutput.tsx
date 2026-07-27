import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import { buildJsonSegments } from '@/lib/tools/json-path'

interface JsonInteractiveOutputProps {
  value: unknown
  pretty: boolean
  selectedPath: string | null
  onSelectPath: (path: string) => void
}

export function JsonInteractiveOutput({
  value,
  pretty,
  selectedPath,
  onSelectPath,
}: JsonInteractiveOutputProps) {
  const segments = buildJsonSegments(value, pretty)

  return (
    <div
      className="rounded-md border border-input bg-muted/50 px-3 py-2 max-h-64 overflow-y-auto font-mono text-sm whitespace-pre"
      data-slot="json-interactive-output"
    >
      {segments.map((segment, i) => {
        if (segment.kind === 'text') {
          return <Fragment key={i}>{segment.text}</Fragment>
        }
        const isSelected = selectedPath === segment.path
        return (
          <span
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => onSelectPath(segment.path)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectPath(segment.path)
              }
            }}
            className={cn(
              'cursor-pointer rounded-sm px-0.5 -mx-0.5',
              segment.kind === 'key' && 'text-sky-600 dark:text-sky-400',
              isSelected
                ? 'bg-primary/20 ring-1 ring-primary'
                : 'hover:bg-accent'
            )}
          >
            {segment.text}
          </span>
        )
      })}
    </div>
  )
}
