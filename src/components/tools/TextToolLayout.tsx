import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ToolError } from '@/components/tools/ToolFeedback'
import { cn } from '@/lib/utils'

export interface TextToolLayoutProps {
  /** Optional top toolbar (e.g. tabs or options) */
  toolbar?: ReactNode

  /** Input panel configuration */
  inputLabel?: string
  inputValue?: string
  onClearInput?: () => void
  inputExtraActions?: ReactNode
  inputContent: ReactNode
  inputActions?: ReactNode

  /** Output panel configuration */
  outputLabel?: string
  outputExtraActions?: ReactNode
  outputContent?: ReactNode
  hasOutput?: boolean
  emptyMessage?: string
  onCopyOutput?: () => void
  isOutputCopied?: boolean

  /** Error message displayed above */
  error?: string

  /** Additional styling */
  className?: string
}

function formatStats(chars: number, lines: number, lang: string, fallback: string): string {
  if (lang.startsWith('en')) {
    const charLabel = chars === 1 ? 'char' : 'chars'
    const lineLabel = lines === 1 ? 'line' : 'lines'
    return `${chars.toLocaleString()} ${charLabel} · ${lines.toLocaleString()} ${lineLabel}`
  }
  return fallback
}

export function TextToolLayout({
  toolbar,
  inputLabel,
  inputValue,
  onClearInput,
  inputExtraActions,
  inputContent,
  inputActions,
  outputLabel,
  outputExtraActions,
  outputContent,
  hasOutput = false,
  emptyMessage,
  onCopyOutput,
  isOutputCopied = false,
  error,
  className,
}: TextToolLayoutProps) {
  const { t, i18n } = useTranslation('common')

  const charCount = inputValue ? inputValue.length : 0
  const lineCount = inputValue ? inputValue.split('\n').length : 0
  const hasInput = charCount > 0

  const statsText = formatStats(
    charCount,
    lineCount,
    i18n.language,
    t('ui.stats', { chars: charCount.toLocaleString(), lines: lineCount.toLocaleString() })
  )

  return (
    <div className={cn('space-y-3', className)}>
      {toolbar && <div>{toolbar}</div>}
      {error && <ToolError message={error} className="font-mono text-xs" />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Input Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 h-7">
            <div className="flex items-center gap-2 min-w-0">
              <Label className="text-xs font-semibold text-foreground truncate">
                {inputLabel ?? t('ui.input')}
              </Label>
              {hasInput && (
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                  {statsText}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {inputExtraActions}
              {hasInput && onClearInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={onClearInput}
                  className="text-muted-foreground hover:text-foreground"
                  title={t('ui.clear')}
                >
                  <Trash2 />
                  <span>{t('ui.clear')}</span>
                </Button>
              )}
            </div>
          </div>

          <div>{inputContent}</div>

          {inputActions && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {inputActions}
            </div>
          )}
        </div>

        {/* Output Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 h-7">
            <div className="flex items-center gap-2 min-w-0">
              <Label className="text-xs font-semibold text-foreground truncate">
                {outputLabel ?? t('ui.output')}
              </Label>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {outputExtraActions}
              {hasOutput && onCopyOutput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={onCopyOutput}
                >
                  {isOutputCopied ? <Check /> : <Copy />}
                  <span>{isOutputCopied ? t('ui.copied') : t('ui.copy')}</span>
                </Button>
              )}
            </div>
          </div>

          {hasOutput ? (
            <div>{outputContent}</div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground/60 border border-dashed rounded-lg min-h-32">
              <p>{emptyMessage ?? t('ui.emptyOutput')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
