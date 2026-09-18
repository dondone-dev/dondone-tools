import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { ToolResultField } from '@/components/tools/ToolFeedback'
import { TextToolLayout, TextToolTextarea } from '@/components/tools/TextToolLayout'
import { encodeText, decodeText } from '@/lib/tools/base64'

type Mode = 'encode' | 'decode'

export function Base64Page() {
  const { t } = useTranslation(['tools', 'common'])
  const [mode, setMode] = useState<Mode>('encode')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ base64?: string; base64url?: string; text?: string } | null>(null)
  const [error, setError] = useState('')
  const { copiedText, copy } = useClipboard()

  const handleEncode = () => {
    setError(''); setResult(null)
    try { setResult(encodeText(input)) } catch (e) { setError((e as Error).message) }
  }

  const handleDecode = () => {
    setError(''); setResult(null)
    try { setResult({ text: decodeText(input) }) } catch (e) { setError((e as Error).message) }
  }

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode)
    setResult(null)
    setError('')
  }

  const handleClear = () => {
    setInput('')
    setResult(null)
    setError('')
  }

  const primaryResultText = result?.base64 ?? result?.text ?? ''
  const hasOutput = Boolean(result && (result.base64 || result.base64url || result.text !== undefined))

  return (
    <ToolLayout toolId="base64" category="Encoding">
      <TextToolLayout
        toolbar={
          <Tabs value={mode} onValueChange={(v) => handleModeChange(v as Mode)}>
            <TabsList className="h-8">
              <TabsTrigger value="encode" className="text-xs h-7">{t('base64.encode', { ns: 'tools' })}</TabsTrigger>
              <TabsTrigger value="decode" className="text-xs h-7">{t('base64.decode', { ns: 'tools' })}</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        inputLabel={mode === 'encode' ? t('ui.input', { ns: 'common' }) : 'Base64'}
        inputValue={input}
        onClearInput={handleClear}
        inputContent={
          <TextToolTextarea
            placeholder={t(mode === 'encode' ? 'base64.encodePlaceholder' : 'base64.decodePlaceholder', { ns: 'tools' })}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        }
        inputActions={
          <Button onClick={mode === 'encode' ? handleEncode : handleDecode} size="sm">
            {t(`base64.${mode}`, { ns: 'tools' })}
          </Button>
        }
        outputLabel={t('ui.result', { ns: 'common' })}
        hasOutput={hasOutput}
        onCopyOutput={primaryResultText ? () => copy(primaryResultText) : undefined}
        isOutputCopied={copiedText === primaryResultText && Boolean(primaryResultText)}
        outputContent={
          <div className="p-3 space-y-3">
            {result?.base64 && <ToolResultField label="Base64" value={result.base64} copiedText={copiedText} onCopy={copy} multiline />}
            {result?.base64url && <ToolResultField label="Base64URL" value={result.base64url} copiedText={copiedText} onCopy={copy} multiline />}
            {result?.text !== undefined && <ToolResultField label={t('base64.decodeResult', { ns: 'tools' })} value={result.text} copiedText={copiedText} onCopy={copy} multiline />}
          </div>
        }
        error={error}
      />
    </ToolLayout>
  )
}
