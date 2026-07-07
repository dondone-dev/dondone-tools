import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { computeDiff, computeJsonDiff, JsonDiffParseError, type ChangeType, type DiffResult, type JsonDiffSide, type SplitRow, type Token, type UnifiedLine } from '@/lib/tools/text-diff'

type ViewMode = 'split' | 'unified'

function typeStyle(type: ChangeType) {
  if (type === 'removed') return { bg: 'bg-red-500/10', lnBg: 'bg-red-500/15', indicator: 'bg-red-400' }
  if (type === 'added')   return { bg: 'bg-green-500/10', lnBg: 'bg-green-500/15', indicator: 'bg-green-400' }
  return { bg: '', lnBg: 'bg-muted/30', indicator: 'bg-transparent' }
}

function Tokens({ tokens, type }: { tokens: Token[]; type: ChangeType }) {
  return (
    <>
      {tokens.map((token, i) => (
        <span
          key={i}
          className={cn(
            token.highlight && type === 'removed' && 'bg-red-500/30 rounded-sm',
            token.highlight && type === 'added'   && 'bg-green-500/30 rounded-sm',
          )}
        >
          {token.text}
        </span>
      ))}
    </>
  )
}

const LINE_H = 'min-h-[1.375rem]'
const LINE_NO_W = 'w-10'
const INDICATOR_W = 'w-1'

function SplitCell({ side }: { side: SplitRow['left'] }) {
  if (!side) {
    return (
      <div className={cn('flex', LINE_H)}>
        <div className={cn(INDICATOR_W, 'shrink-0')} />
        <div className={cn(LINE_NO_W, 'shrink-0 bg-muted/20 border-r border-border/40')} />
        <div className="flex-1 bg-muted/10" />
      </div>
    )
  }
  const { bg, lnBg, indicator } = typeStyle(side.type)
  return (
    <div className={cn('flex', LINE_H, bg)}>
      <div className={cn(INDICATOR_W, 'shrink-0', indicator)} />
      <div className={cn(LINE_NO_W, 'shrink-0 select-none text-right pr-2 text-muted-foreground text-xs leading-[1.375rem] border-r border-border/40', lnBg)}>
        {side.lineNo}
      </div>
      <div className="flex-1 px-2 text-xs leading-[1.375rem] whitespace-pre overflow-hidden">
        <Tokens tokens={side.tokens} type={side.type} />
      </div>
    </div>
  )
}

function SplitView({ rows }: { rows: SplitRow[] }) {
  return (
    <div className="border border-border rounded-md overflow-hidden font-mono">
      {rows.map((row, i) => (
        <div key={i} className="flex border-b border-border/40 last:border-b-0">
          <div className="flex-1 min-w-0 border-r border-border">
            <SplitCell side={row.left} />
          </div>
          <div className="flex-1 min-w-0">
            <SplitCell side={row.right} />
          </div>
        </div>
      ))}
    </div>
  )
}

function UnifiedView({ lines }: { lines: UnifiedLine[] }) {
  return (
    <div className="border border-border rounded-md overflow-hidden font-mono">
      {lines.map((line, i) => {
        const { bg, lnBg, indicator } = typeStyle(line.type)
        const prefix = line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '
        const prefixColor = line.type === 'removed' ? 'text-red-500' : line.type === 'added' ? 'text-green-500' : 'text-muted-foreground'

        return (
          <div key={i} className={cn('flex border-b border-border/40 last:border-b-0', LINE_H, bg)}>
            <div className={cn(INDICATOR_W, 'shrink-0', indicator)} />
            <div className={cn(LINE_NO_W, 'shrink-0 select-none text-right pr-2 text-muted-foreground text-xs leading-[1.375rem] border-r border-border/40', lnBg)}>
              {line.oldLineNo ?? ''}
            </div>
            <div className={cn(LINE_NO_W, 'shrink-0 select-none text-right pr-2 text-muted-foreground text-xs leading-[1.375rem] border-r border-border/40', lnBg)}>
              {line.newLineNo ?? ''}
            </div>
            <div className={cn('w-5 shrink-0 select-none text-center text-xs leading-[1.375rem]', prefixColor)}>
              {prefix}
            </div>
            <div className="flex-1 px-2 text-xs leading-[1.375rem] whitespace-pre overflow-hidden">
              <Tokens tokens={line.tokens} type={line.type} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TextDiffPage() {
  const { t } = useTranslation('tools')
  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [result, setResult] = useState<DiffResult | null>(null)
  const [mode, setMode] = useState<ViewMode>('split')
  const [jsonMode, setJsonMode] = useState(false)
  const [parseError, setParseError] = useState<{ side: JsonDiffSide; message: string } | null>(null)

  function handleCompare() {
    setParseError(null)
    if (jsonMode) {
      try {
        setResult(computeJsonDiff(original, modified))
      } catch (e) {
        if (e instanceof JsonDiffParseError) {
          setParseError({ side: e.side, message: e.message })
          setResult(null)
        }
      }
    } else {
      setResult(computeDiff(original, modified))
    }
  }

  const identical = result && result.addedCount === 0 && result.removedCount === 0

  return (
    <ToolLayout toolId="text-diff" category="Text">
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('text-diff.original')}</Label>
            <Textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder={t('text-diff.originalPlaceholder')}
              rows={10}
              className="font-mono text-sm resize-y"
              spellCheck={false}
            />
            {parseError?.side === 'original' && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md font-mono">
                {t('text-diff.jsonParseError', { label: t('text-diff.original'), message: parseError.message })}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('text-diff.modified')}</Label>
            <Textarea
              value={modified}
              onChange={(e) => setModified(e.target.value)}
              placeholder={t('text-diff.modifiedPlaceholder')}
              rows={10}
              className="font-mono text-sm resize-y"
              spellCheck={false}
            />
            {parseError?.side === 'modified' && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md font-mono">
                {t('text-diff.jsonParseError', { label: t('text-diff.modified'), message: parseError.message })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleCompare}>
            {t('text-diff.compare')}
          </Button>
          <div className="flex items-center gap-2">
            <Checkbox
              id="json-mode"
              checked={jsonMode}
              onCheckedChange={(v) => setJsonMode(v === true)}
            />
            <Label htmlFor="json-mode" className="text-sm cursor-pointer">
              {t('text-diff.jsonMode')}
            </Label>
          </div>
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                {identical ? (
                  <span className="text-muted-foreground">{t('text-diff.identical')}</span>
                ) : (
                  <>
                    <span className="text-green-600 dark:text-green-400">+{result.addedCount}</span>
                    <span className="text-red-500 dark:text-red-400">−{result.removedCount}</span>
                  </>
                )}
              </div>
              {!identical && (
                <div className="flex gap-1">
                  <Button size="sm" variant={mode === 'split' ? 'secondary' : 'ghost'} className="h-7 text-xs px-2" onClick={() => setMode('split')}>
                    {t('text-diff.split')}
                  </Button>
                  <Button size="sm" variant={mode === 'unified' ? 'secondary' : 'ghost'} className="h-7 text-xs px-2" onClick={() => setMode('unified')}>
                    {t('text-diff.unified')}
                  </Button>
                </div>
              )}
            </div>

            {!identical && (mode === 'split'
              ? <SplitView rows={result.split} />
              : <UnifiedView lines={result.unified} />
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
