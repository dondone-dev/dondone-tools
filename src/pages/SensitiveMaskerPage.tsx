import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, EyeOff, ShieldCheck, Upload, X } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useClipboard } from '@/hooks/useClipboard'
import { maskText, type MaskerMode } from '@/lib/tools/sensitive-masker'

const MODES: MaskerMode[] = ['dev', 'privacy', 'log', 'all']

export function SensitiveMaskerPage() {
  const { t } = useTranslation(['tools', 'common'])
  const [mode, setMode] = useState<MaskerMode>('dev')
  const [input, setInput] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { copiedText, copy } = useClipboard()

  const result = useMemo(() => {
    if (!input.trim()) return null
    return maskText(input, mode)
  }, [input, mode])

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const text = await file.text()
    setInput(text)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    } else {
      const text = e.dataTransfer.getData('text')
      if (text) setInput(text)
    }
  }

  const outputText = result?.output ?? ''
  const isCopied = copiedText === outputText && outputText.length > 0

  return (
    <ToolLayout toolId="sensitive-masker" category="Security">
      <input
        ref={inputRef}
        type="file"
        accept=".env,.log,.txt,.conf,.yaml,.yml,.json,.sh,.toml,.ini,.properties"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Mode selector */}
      <div className="space-y-1.5">
        <Tabs value={mode} onValueChange={v => setMode(v as MaskerMode)}>
          <TabsList className="h-8">
            {MODES.map(m => (
              <TabsTrigger key={m} value={m} className="text-xs h-7 px-3">
                {t(`sensitive-masker.modes.${m}`, { ns: 'tools' })}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">
          {t(`sensitive-masker.modes.${mode}Desc`, { ns: 'tools' })}
        </p>
      </div>

      {/* Input / Output grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Input panel */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              {t('sensitive-masker.inputLabel', { ns: 'tools' })}
            </Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-3 w-3" />
                {t('sensitive-masker.uploadFile', { ns: 'tools' })}
              </Button>
              {input && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setInput('')}
                  aria-label="Clear"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('sensitive-masker.inputPlaceholder', { ns: 'tools' })}
              className="font-mono text-xs min-h-60 resize-y"
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            />
            {dragOver && (
              <div className="absolute inset-0 bg-background/80 rounded-md border-2 border-dashed border-foreground/40 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-1.5">
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t('sensitive-masker.dropHint', { ns: 'tools' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Output panel */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              {t('sensitive-masker.outputLabel', { ns: 'tools' })}
            </Label>
            {result && result.totalCount > 0 && outputText && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => copy(outputText)}
              >
                {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {isCopied ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
              </Button>
            )}
          </div>
          <Textarea
            value={outputText}
            readOnly
            placeholder={t('sensitive-masker.outputPlaceholder', { ns: 'tools' })}
            className="font-mono text-xs min-h-60 resize-y bg-muted/30"
          />
        </div>
      </div>

      {/* Stats panel */}
      {result && result.totalCount > 0 && (
        <section className="border rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">
              {t('sensitive-masker.totalMasked', { ns: 'tools', count: result.totalCount })}
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                  {t('sensitive-masker.statsType', { ns: 'tools' })}
                </th>
                <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                  {t('sensitive-masker.statsCount', { ns: 'tools' })}
                </th>
                <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                  {t('sensitive-masker.statsChars', { ns: 'tools' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.stats.map(s => (
                <tr key={s.patternId} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-1.5">{s.label}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-primary">{s.count}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{s.originalChars}</td>
                </tr>
              ))}
            </tbody>
            {result.stats.length > 1 && (
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">
                    {t('sensitive-masker.statsTotal', { ns: 'tools' })}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-medium text-primary">
                    {result.stats.reduce((s, r) => s + r.count, 0)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                    {result.stats.reduce((s, r) => s + r.originalChars, 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>
      )}

      {result && result.totalCount === 0 && input.trim() && (
        <p className="text-sm text-muted-foreground py-1">
          {t('sensitive-masker.noSecrets', { ns: 'tools' })}
        </p>
      )}
    </ToolLayout>
  )
}
