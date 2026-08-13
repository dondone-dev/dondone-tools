import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useClipboard } from '@/hooks/useClipboard'
import { ToolError } from '@/components/tools/ToolFeedback'
import { JsonInteractiveOutput } from '@/components/tools/JsonInteractiveOutput'
import { formatJson, minifyJson, unescapeAndFormatJson } from '@/lib/tools/json-format'

export function JsonFormatPage() {
  const { t } = useTranslation('tools')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [parsedValue, setParsedValue] = useState<unknown>(null)
  const [pretty, setPretty] = useState(true)
  const [error, setError] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const { copiedText, copy } = useClipboard()
  const { copiedText: copiedPath, copy: copyPath } = useClipboard()

  function run(fn: (s: string) => string, isPretty: boolean) {
    setError('')
    setOutput('')
    setParsedValue(null)
    setSelectedPath(null)
    try {
      const result = fn(input)
      setOutput(result)
      setParsedValue(JSON.parse(result))
      setPretty(isPretty)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <ToolLayout toolId="json-format" category="Text">
      <div className="space-y-3">
        <Textarea
          variant="editor"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('json-format.inputPlaceholder')}
          className="font-mono text-sm"
          spellCheck={false}
        />

        <div className="flex gap-2">
          <Button size="sm" onClick={() => run(formatJson, true)}>
            {t('json-format.format')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => run(minifyJson, false)}>
            {t('json-format.minify')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => run(unescapeAndFormatJson, true)}>
            {t('json-format.unescape')}
          </Button>
        </div>

        {error && <ToolError message={error} className="font-mono" />}

        {output && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Output</Label>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-8 px-2 text-xs gap-1"
                onClick={() => copy(output)}
              >
                {copiedText === output ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedText === output ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md border border-input bg-muted/30 px-3 py-1.5">
              <span className="font-mono text-xs truncate text-muted-foreground">
                {selectedPath ?? t('json-format.pathPlaceholder')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-8 px-2 text-xs gap-1 shrink-0"
                disabled={!selectedPath}
                onClick={() => selectedPath && copyPath(selectedPath)}
              >
                {copiedPath === selectedPath ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedPath === selectedPath ? t('ui.copied', { ns: 'common' }) : t('json-format.copyPath')}
              </Button>
            </div>

            <JsonInteractiveOutput
              value={parsedValue}
              pretty={pretty}
              selectedPath={selectedPath}
              onSelectPath={setSelectedPath}
            />
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
