import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useClipboard } from '@/hooks/useClipboard'
import { formatJson, minifyJson } from '@/lib/tools/json-format'

export function JsonFormatPage() {
  const { t } = useTranslation('tools')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const { copied, copy } = useClipboard()

  function run(fn: (s: string) => string) {
    setError('')
    setOutput('')
    try {
      setOutput(fn(input))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <ToolLayout toolId="json-format" category="Text">
      <div className="space-y-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('json-format.inputPlaceholder')}
          className="font-mono text-sm min-h-[240px] resize-y"
          spellCheck={false}
        />

        <div className="flex gap-2">
          <Button size="sm" onClick={() => run(formatJson)}>
            {t('json-format.format')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => run(minifyJson)}>
            {t('json-format.minify')}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md font-mono">
            {error}
          </p>
        )}

        {output && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Output</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => copy(output)}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
              </Button>
            </div>
            <Textarea
              value={output}
              readOnly
              className="font-mono text-sm min-h-[240px] resize-y bg-muted/50"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
