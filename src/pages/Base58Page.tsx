import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { ToolResultField } from '@/components/tools/ToolFeedback'
import { TextToolLayout, TextToolTextarea } from '@/components/tools/TextToolLayout'
import { encodeText, decodeText } from '@/lib/tools/base58'

type Mode = 'encode' | 'decode'

export function Base58Page() {
  const { t } = useTranslation(['tools', 'common'])
  const [mode, setMode] = useState<Mode>('encode')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ encoded?: string; text?: string; hex?: string; hasText?: boolean } | null>(null)
  const [error, setError] = useState('')
  const { copiedText, copy } = useClipboard()

  const handleEncode = () => {
    setError(''); setResult(null)
    try { setResult({ encoded: encodeText(input) }) } catch (e) { setError((e as Error).message) }
  }

  const handleDecode = () => {
    setError(''); setResult(null)
    try { setResult(decodeText(input)) } catch (e) { setError((e as Error).message) }
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

  const primaryResultText = result?.encoded ?? result?.text ?? ''
  const hasOutput = Boolean(result && (result.encoded || result.text !== undefined || result.hex))

  return (
    <ToolLayout toolId="base58" category="Encoding">
      <TextToolLayout
        toolbar={
          <Tabs value={mode} onValueChange={(v) => handleModeChange(v as Mode)}>
            <TabsList className="h-8">
              <TabsTrigger value="encode" className="text-xs h-7">{t('base58.encode', { ns: 'tools' })}</TabsTrigger>
              <TabsTrigger value="decode" className="text-xs h-7">{t('base58.decode', { ns: 'tools' })}</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        inputLabel={mode === 'encode' ? t('ui.input', { ns: 'common' }) : 'Base58'}
        inputValue={input}
        onClearInput={handleClear}
        inputContent={
          <TextToolTextarea
            placeholder={t(mode === 'encode' ? 'base58.encodePlaceholder' : 'base58.decodePlaceholder', { ns: 'tools' })}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        }
        inputActions={
          <Button onClick={mode === 'encode' ? handleEncode : handleDecode} size="sm">
            {t(`base58.${mode}`, { ns: 'tools' })}
          </Button>
        }
        outputLabel={t('ui.result', { ns: 'common' })}
        hasOutput={hasOutput}
        onCopyOutput={primaryResultText ? () => copy(primaryResultText) : undefined}
        isOutputCopied={copiedText === primaryResultText && Boolean(primaryResultText)}
        outputContent={
          <div className="p-3 space-y-3">
            {result?.encoded && <ToolResultField label="Base58" value={result.encoded} copiedText={copiedText} onCopy={copy} multiline />}
            {result?.hasText && result.text && <ToolResultField label={t('base58.textUtf8', { ns: 'tools' })} value={result.text} copiedText={copiedText} onCopy={copy} multiline />}
            {result?.hex && <ToolResultField label="Hex" value={result.hex} copiedText={copiedText} onCopy={copy} multiline />}
            {result?.hasText === false && <p className="text-xs text-muted-foreground">{t('base58.invalidUtf8', { ns: 'tools' })}</p>}
          </div>
        }
        error={error}
      />
    </ToolLayout>
  )
}
