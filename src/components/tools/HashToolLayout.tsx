import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { Upload, Copy, Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isAbortError } from '@/lib/tools/hashwasm-common'

interface ResultRow {
  label: string
  key: string
}

interface HashToolLayoutProps {
  title: string
  description: string
  category: string
  resultRows: ResultRow[]
  onDigestText: (input: string, outputEncoding: string) => Promise<Record<string, string>> | Record<string, string>
  onDigestFile: (file: File, outputEncoding: string, onProgress: (p: number) => void, signal: AbortSignal) => Promise<Record<string, string>>
  singleResult?: boolean
}

interface DigestResult {
  [key: string]: string
}

export function HashToolLayout({ resultRows, onDigestText, onDigestFile, singleResult }: HashToolLayoutProps) {
  const { t } = useTranslation('tools')
  const [textInput, setTextInput] = useState('')
  const [outputEncoding, setOutputEncoding] = useState<'hex' | 'base64'>('hex')
  const [result, setResult] = useState<DigestResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)
  const { copiedText, copy } = useClipboard()

  const handleTextDigest = useCallback(async () => {
    if (!textInput.trim()) { setError(t('_hash.emptyText')); return }
    setError(''); setLoading(true); setResult(null)
    try {
      const res = await onDigestText(textInput, outputEncoding)
      const normalized = typeof res === 'string' ? { result: res } : res
      setResult(normalized)
    } catch (e) {
      setError((e as Error).message)
    } finally { setLoading(false) }
  }, [textInput, outputEncoding, onDigestText, t])

  const handleFileDigest = useCallback(async (file: File) => {
    const gen = ++generationRef.current
    setError(''); setLoading(true); setResult(null); setProgress(0)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await onDigestFile(file, outputEncoding, (p) => {
        if (generationRef.current === gen) setProgress(p)
      }, controller.signal)
      if (generationRef.current === gen) setResult(res)
    } catch (e) {
      if (!isAbortError(e) && generationRef.current === gen) setError((e as Error).message)
    } finally {
      if (generationRef.current === gen) setLoading(false)
    }
  }, [outputEncoding, onDigestFile])

  const handleAbort = () => { abortRef.current?.abort(); setLoading(false); setProgress(0) }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileDigest(file)
  }

  const firstKey = resultRows[0]?.key
  const singleValue = singleResult && result && firstKey ? result[firstKey] : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground shrink-0">{t('_hash.outputFormat')}</Label>
          <Select value={outputEncoding} onValueChange={(v) => setOutputEncoding(v as 'hex' | 'base64')}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hex">Hex</SelectItem>
              <SelectItem value="base64">Base64</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="text">
        <TabsList className="h-8">
          <TabsTrigger value="text" className="text-xs h-7">{t('_hash.text')}</TabsTrigger>
          <TabsTrigger value="file" className="text-xs h-7">{t('_hash.file')}</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-3 mt-3">
          <Textarea
            placeholder={t('_hash.textPlaceholder')}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="font-mono text-sm min-h-[120px] resize-none"
          />
          <Button onClick={handleTextDigest} disabled={loading} size="sm">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            {t('_hash.compute')}
          </Button>
        </TabsContent>

        <TabsContent value="file" className="space-y-3 mt-3">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
              dragOver ? 'border-foreground/50 bg-muted/50' : 'border-border hover:border-foreground/30'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) handleFileDigest(file)
              }
              input.click()
            }}
          >
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('_hash.dropFile')}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{t('_hash.fileLocal')}</p>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('_hash.computing', { progress })}</span>
                <Button variant="ghost" size="sm" onClick={handleAbort} className="h-6 px-2 text-xs">
                  <X className="h-3 w-3 mr-1" />{t('_hash.cancel')}
                </Button>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-foreground/60 transition-all duration-150 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}

      {result && (
        <div className="space-y-2">
          {singleResult ? (
            <ResultField label={resultRows[0]?.label ?? 'Result'} value={singleValue ?? ''} copiedText={copiedText} onCopy={copy} />
          ) : (
            resultRows.map((row) => (
              <ResultField key={row.key} label={row.label} value={result[row.key] ?? ''} copiedText={copiedText} onCopy={copy} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ResultField({ label, value, copiedText, onCopy }: { label: string; value: string; copiedText: string | null; onCopy: (text: string) => void }) {
  const { t } = useTranslation()
  const isCopied = copiedText === value
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => onCopy(value)}>
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {isCopied ? t('ui.copied') : t('ui.copy')}
        </Button>
      </div>
      <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all">{value}</div>
    </div>
  )
}

export type { DigestResult }
