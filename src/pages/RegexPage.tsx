import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const FLAGS = ['g', 'i', 'm', 's'] as const
type Flag = (typeof FLAGS)[number]

interface MatchInfo {
  index: number
  value: string
  start: number
  end: number
  groups: string[]
}

function getMatches(pattern: string, flags: string, input: string): RegExpExecArray[] {
  const re = new RegExp(pattern, flags)
  const results: RegExpExecArray[] = []
  if (flags.includes('g')) {
    let m: RegExpExecArray | null
    while ((m = re.exec(input)) !== null) {
      results.push(m)
      if (m[0].length === 0) re.lastIndex++
    }
  } else {
    const m = re.exec(input)
    if (m) results.push(m)
  }
  return results
}

function buildSegments(text: string, matches: RegExpExecArray[]): { text: string; highlight: boolean }[] {
  if (matches.length === 0) return [{ text, highlight: false }]
  const segments: { text: string; highlight: boolean }[] = []
  let pos = 0
  for (const m of matches) {
    const start = m.index
    const end = start + m[0].length
    if (pos < start) segments.push({ text: text.slice(pos, start), highlight: false })
    segments.push({ text: text.slice(start, end), highlight: true })
    pos = end
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), highlight: false })
  return segments
}

export function RegexPage() {
  const { t } = useTranslation('tools')
  const [pattern, setPattern] = useState('')
  const [activeFlags, setActiveFlags] = useState<Set<Flag>>(new Set(['g']))
  const [testInput, setTestInput] = useState('')

  const flagsStr = FLAGS.filter((f) => activeFlags.has(f)).join('')

  function toggleFlag(flag: Flag) {
    setActiveFlags((prev) => {
      const next = new Set(prev)
      next.has(flag) ? next.delete(flag) : next.add(flag)
      return next
    })
  }

  const { matches, error } = useMemo<{ matches: RegExpExecArray[]; error: string }>(() => {
    if (!pattern) return { matches: [], error: '' }
    try {
      return { matches: getMatches(pattern, flagsStr, testInput), error: '' }
    } catch (e) {
      return { matches: [], error: (e as Error).message }
    }
  }, [pattern, flagsStr, testInput])

  const matchInfos: MatchInfo[] = matches.map((m, i) => ({
    index: i,
    value: m[0],
    start: m.index,
    end: m.index + m[0].length,
    groups: m.slice(1).map((g) => g ?? ''),
  }))

  const segments = useMemo(() => buildSegments(testInput, matches), [testInput, matches])

  return (
    <ToolLayout toolId="regex" category="Text">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={t('regex.patternPlaceholder')}
              className={cn('font-mono text-sm', error && 'border-destructive focus-visible:ring-destructive')}
              spellCheck={false}
            />
            <div className="flex gap-1 shrink-0">
              {FLAGS.map((flag) => (
                <Button
                  key={flag}
                  size="sm"
                  variant={activeFlags.has(flag) ? 'default' : 'outline'}
                  className="h-9 w-9 p-0 font-mono text-xs"
                  onClick={() => toggleFlag(flag)}
                  title={`${t('regex.flags')}: ${flag}`}
                >
                  {flag}
                </Button>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-md font-mono">
              {t('regex.invalidPattern')}: {error}
            </p>
          )}
        </div>

        <Textarea
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder={t('regex.testInputPlaceholder')}
          rows={8}
          className="font-mono text-sm resize-y"
          spellCheck={false}
        />

        {testInput && pattern && !error && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={matches.length > 0 ? 'default' : 'secondary'}>
                {matches.length > 0
                  ? `${matches.length} ${t('regex.matches')}`
                  : t('regex.noMatches')}
              </Badge>
            </div>

            {matches.length > 0 && (
              <>
                <div className="font-mono text-sm bg-muted/50 rounded-md px-3 py-2 whitespace-pre-wrap break-all leading-relaxed">
                  {segments.map((seg, i) =>
                    seg.highlight ? (
                      <mark key={i} className="bg-yellow-400/40 rounded-sm text-foreground">
                        {seg.text}
                      </mark>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    )
                  )}
                </div>

                <div className="space-y-1.5">
                  {matchInfos.map((m) => (
                    <div
                      key={m.index}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border rounded-md px-3 py-2 bg-muted/30"
                    >
                      <span className="text-muted-foreground">
                        {t('regex.matchIndex')} <span className="font-semibold text-foreground">{m.index}</span>
                      </span>
                      <span className="font-mono font-semibold text-foreground bg-yellow-400/30 rounded px-1">{m.value || '(empty)'}</span>
                      <span className="text-muted-foreground">
                        {t('regex.position')} <span className="font-mono text-foreground">{m.start}–{m.end}</span>
                      </span>
                      {m.groups.length > 0 && m.groups.some(Boolean) && (
                        <span className="text-muted-foreground">
                          {t('regex.groups')}: {m.groups.map((g, gi) => (
                            <span key={gi} className="font-mono text-foreground ml-1 bg-blue-400/20 rounded px-1">{g}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
