import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpCircle } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const FLAGS = ['g', 'i', 'm', 's'] as const
type Flag = (typeof FLAGS)[number]

const MAX_MATCHES = 10000
const WORKER_TIMEOUT_MS = 5000
const DEBOUNCE_MS = 300

interface MatchInfo {
  index: number
  value: string
  start: number
  end: number
  groups: string[]
}

interface SerializedMatch {
  0: string
  index: number
  groups: string[]
}

const workerCode = `
self.onmessage = function(e) {
  const { pattern, flags, input, maxMatches } = e.data
  try {
    const re = new RegExp(pattern, flags)
    const results = []
    if (flags.includes('g')) {
      let m
      while ((m = re.exec(input)) !== null) {
        results.push({ 0: m[0], index: m.index, groups: m.slice(1).map(g => g ?? '') })
        if (results.length >= maxMatches) break
        if (m[0].length === 0) re.lastIndex++
      }
    } else {
      const m = re.exec(input)
      if (m) results.push({ 0: m[0], index: m.index, groups: m.slice(1).map(g => g ?? '') })
    }
    self.postMessage({ ok: true, results })
  } catch (err) {
    self.postMessage({ ok: false, error: err.message })
  }
}
`

function buildSegments(text: string, matches: SerializedMatch[]): { text: string; highlight: boolean }[] {
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

interface RegexRunResult {
  matches: SerializedMatch[]
  error: string
  errorKey?: 'timeout' | 'workerError'
}

function useRegexWorker() {
  const blobUrlRef = useRef<string | undefined>(undefined)

  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
  }, [])

  const run = useCallback((pattern: string, flags: string, input: string): Promise<RegexRunResult> => {
    return new Promise((resolve) => {
      if (!blobUrlRef.current) {
        blobUrlRef.current = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }))
      }
      const worker = new Worker(blobUrlRef.current)
      const timer = setTimeout(() => {
        worker.terminate()
        resolve({ matches: [], error: '', errorKey: 'timeout' })
      }, WORKER_TIMEOUT_MS)

      worker.onmessage = (e) => {
        clearTimeout(timer)
        worker.terminate()
        if (e.data.ok) {
          resolve({ matches: e.data.results, error: '' })
        } else {
          resolve({ matches: [], error: e.data.error })
        }
      }
      worker.onerror = () => {
        clearTimeout(timer)
        worker.terminate()
        resolve({ matches: [], error: '', errorKey: 'workerError' })
      }
      worker.postMessage({ pattern, flags, input, maxMatches: MAX_MATCHES })
    })
  }, [])

  return run
}

export function RegexPage() {
  const { t } = useTranslation('tools')
  const [pattern, setPattern] = useState('')
  const [activeFlags, setActiveFlags] = useState<Set<Flag>>(new Set(['g']))
  const [testInput, setTestInput] = useState('')
  const [matches, setMatches] = useState<SerializedMatch[]>([])
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const runIdRef = useRef(0)
  const runRegex = useRegexWorker()

  const flagsStr = FLAGS.filter((f) => activeFlags.has(f)).join('')

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!pattern) {
      runIdRef.current += 1
      setMatches([])
      setError('')
      return
    }
    debounceRef.current = setTimeout(async () => {
      const runId = ++runIdRef.current
      const result = await runRegex(pattern, flagsStr, testInput)
      if (runId !== runIdRef.current) return
      setMatches(result.matches)
      setError(result.errorKey ? t(`regex.${result.errorKey}`) : result.error)
    }, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [pattern, flagsStr, testInput, runRegex, t])

  function toggleFlag(flag: Flag) {
    setActiveFlags((prev) => {
      const next = new Set(prev)
      next.has(flag) ? next.delete(flag) : next.add(flag)
      return next
    })
  }

  const matchInfos: MatchInfo[] = matches.map((m, i) => ({
    index: i,
    value: m[0],
    start: m.index,
    end: m.index + m[0].length,
    groups: m.groups,
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
            <div className="flex gap-1 shrink-0 items-center">
              {FLAGS.map((flag) => (
                <Button
                  key={flag}
                  size="sm"
                  variant={activeFlags.has(flag) ? 'default' : 'outline'}
                  className="h-9 w-9 p-0 font-mono text-xs"
                  onClick={() => toggleFlag(flag)}
                >
                  {flag}
                </Button>
              ))}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="space-y-1">
                    {FLAGS.map((flag) => (
                      <div key={flag}>
                        <span className="font-mono font-semibold">{flag}</span>
                        {' — '}
                        {t(`regex.flagDesc${flag.toUpperCase()}`)}
                      </div>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
