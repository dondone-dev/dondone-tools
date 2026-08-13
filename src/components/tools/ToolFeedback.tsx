import type { ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ToolErrorProps {
  message: string
  className?: string
}

export function ToolError({ message, className }: ToolErrorProps) {
  return (
    <p role="alert" className={cn('rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive', className)}>
      {message}
    </p>
  )
}

interface ToolStatusProps {
  message: string
  icon?: ReactNode
  className?: string
}

export function ToolStatus({ message, icon, className }: ToolStatusProps) {
  return (
    <div role="status" className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      {icon}
      <span>{message}</span>
    </div>
  )
}

interface ToolResultFieldProps {
  label: string
  value: string
  copiedText: string | null
  onCopy: (text: string) => void
  multiline?: boolean
  className?: string
}

export function ToolResultField({
  label,
  value,
  copiedText,
  onCopy,
  multiline = false,
  className,
}: ToolResultFieldProps) {
  const { t } = useTranslation('common')
  const isCopied = copiedText === value

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-8 shrink-0 gap-1 px-2 text-xs"
          onClick={() => onCopy(value)}
        >
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {isCopied ? t('ui.copied') : t('ui.copy')}
        </Button>
      </div>
      <div
        className={cn(
          'select-all break-all rounded-md bg-muted/50 px-3 py-2 font-mono text-xs',
          multiline && 'max-h-96 overflow-y-auto whitespace-pre-wrap',
          className,
        )}
      >
        {value}
      </div>
    </div>
  )
}
