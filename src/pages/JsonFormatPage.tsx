import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { JsonInteractiveOutput } from '@/components/tools/JsonInteractiveOutput'
import { TextToolLayout, TextToolTextarea } from '@/components/tools/TextToolLayout'
import { formatJson, minifyJson, unescapeAndFormatJson } from '@/lib/tools/json-format'

export function JsonFormatPage() {
  const { t } = useTranslation(['tools', 'common'])
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

  function handleClear() {
    setInput('')
    setOutput('')
    setParsedValue(null)
    setSelectedPath(null)
    setError('')
  }

  const isOutputCopied = copiedText === output && Boolean(output)
  const isPathCopied = copiedPath === selectedPath && Boolean(selectedPath)

  return (
    <ToolLayout toolId="json-format" category="Text">
      <TextToolLayout
        inputLabel={t('json-format.title', { ns: 'tools', defaultValue: 'JSON Input' })}
        inputValue={input}
        onClearInput={handleClear}
        inputContent={
          <TextToolTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('json-format.inputPlaceholder', { ns: 'tools' })}
          />
        }
        inputActions={
          <>
            <Button size="sm" onClick={() => run(formatJson, true)}>
              {t('json-format.format', { ns: 'tools' })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => run(minifyJson, false)}>
              {t('json-format.minify', { ns: 'tools' })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => run(unescapeAndFormatJson, true)}>
              {t('json-format.unescape', { ns: 'tools' })}
            </Button>
          </>
        }
        outputLabel={t('ui.result', { ns: 'common' })}
        hasOutput={Boolean(output)}
        onCopyOutput={() => copy(output)}
        isOutputCopied={isOutputCopied}
        outputExtraActions={
          selectedPath ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs gap-1 max-w-[180px] truncate"
              onClick={() => copyPath(selectedPath)}
              title={selectedPath}
            >
              {isPathCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span className="font-mono text-[11px] truncate">{selectedPath}</span>
            </Button>
          ) : null
        }
        outputContent={
          <div className="p-3">
            <JsonInteractiveOutput
              value={parsedValue}
              pretty={pretty}
              selectedPath={selectedPath}
              onSelectPath={setSelectedPath}
            />
          </div>
        }
        error={error}
      />
    </ToolLayout>
  )
}
