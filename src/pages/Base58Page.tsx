import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { ToolError, ToolResultField } from '@/components/tools/ToolFeedback'
import { encodeText, decodeText } from '@/lib/tools/base58'

export function Base58Page() {
  const { t } = useTranslation(['tools', 'common'])
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

  return (
    <ToolLayout toolId="base58" category="Encoding">
      <Tabs defaultValue="encode">
        <TabsList className="h-8">
          <TabsTrigger value="encode" className="text-xs h-7">{t('base58.encode', { ns: 'tools' })}</TabsTrigger>
          <TabsTrigger value="decode" className="text-xs h-7">{t('base58.decode', { ns: 'tools' })}</TabsTrigger>
        </TabsList>
        <TabsContent value="encode" className="space-y-3 mt-3">
          <Textarea variant="compact" placeholder={t('base58.encodePlaceholder', { ns: 'tools' })} value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-sm" />
          <Button onClick={handleEncode} size="sm">{t('base58.encode', { ns: 'tools' })}</Button>
        </TabsContent>
        <TabsContent value="decode" className="space-y-3 mt-3">
          <Textarea variant="compact" placeholder={t('base58.decodePlaceholder', { ns: 'tools' })} value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-sm" />
          <Button onClick={handleDecode} size="sm">{t('base58.decode', { ns: 'tools' })}</Button>
        </TabsContent>
      </Tabs>

      {error && <ToolError message={error} />}

      {result && (
        <div className="space-y-2">
          {result.encoded && <ToolResultField label="Base58" value={result.encoded} copiedText={copiedText} onCopy={copy} />}
          {result.hasText && result.text && <ToolResultField label={t('base58.textUtf8', { ns: 'tools' })} value={result.text} copiedText={copiedText} onCopy={copy} multiline />}
          {result.hex && <ToolResultField label="Hex" value={result.hex} copiedText={copiedText} onCopy={copy} />}
          {result.hasText === false && <p className="text-xs text-muted-foreground">{t('base58.invalidUtf8', { ns: 'tools' })}</p>}
        </div>
      )}
    </ToolLayout>
  )
}
