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
  const { t } = useTranslation('common')

  const charCount = inputValue ? inputValue.length : 0
  const lineCount = inputValue ? inputValue.split('\n').length : 0
  const hasInput = charCount > 0

  return (
    <div className={cn('space-y-3', className)}>
      {toolbar && <div>{toolbar}</div>}
      {error && <ToolError message={error} className="font-mono text-xs" />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Input Panel */}
        <section className="rounded-xl border border-border/80 bg-card shadow-2xs flex flex-col h-[400px] md:h-[480px] md:max-h-[calc(100vh-14rem)] overflow-hidden">
          <header className="h-10 px-3.5 border-b border-border/60 flex items-center justify-between gap-2 shrink-0 bg-muted/20">
            <div className="flex items-center gap-2 min-w-0">
              <Label className="text-xs font-semibold text-foreground truncate">
                {inputLabel ?? t('ui.input')}
              </Label>
              {hasInput && (
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                  {t('ui.stats', { chars: charCount.toLocaleString(), lines: lineCount.toLocaleString() })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {inputExtraActions}
              {hasInput && onClearInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearInput}
                  className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                  title={t('ui.clear')}
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="text-[11px]">{t('ui.clear')}</span>
                </Button>
              )}
            </div>
          </header>

          <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
            {inputContent}
          </div>

          {inputActions && (
            <footer className="p-2.5 border-t border-border/60 bg-muted/10 flex flex-wrap items-center gap-2 shrink-0">
              {inputActions}
            </footer>
          )}
        </section>

        {/* Output Panel */}
        <section className="rounded-xl border border-border/80 bg-card shadow-2xs flex flex-col h-[400px] md:h-[480px] md:max-h-[calc(100vh-14rem)] overflow-hidden">
          <header className="h-10 px-3.5 border-b border-border/60 flex items-center justify-between gap-2 shrink-0 bg-muted/20">
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
                  size="sm"
                  onClick={onCopyOutput}
                  className="h-6 px-1.5 text-xs gap-1"
                >
                  {isOutputCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span className="text-[11px]">{isOutputCopied ? t('ui.copied') : t('ui.copy')}</span>
                </Button>
              )}
            </div>
          </header>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            {hasOutput ? (
              <div className="flex-1 min-h-0 overflow-y-auto">{outputContent}</div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground/60 select-none">
                <p>{emptyMessage ?? t('ui.emptyOutput')}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export function TextToolTextarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'h-full w-full flex-1 resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 rounded-none bg-transparent p-3 font-mono text-sm leading-relaxed overflow-y-auto outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground',
        className,
      )}
      spellCheck={false}
      {...props}
    />
  )
}
