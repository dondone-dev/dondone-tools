import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { ToolError, ToolResultField } from '@/components/tools/ToolFeedback'
import { encodeText, decodeText } from '@/lib/tools/base64'

export function Base64Page() {
  const { t } = useTranslation(['tools', 'common'])
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

  return (
    <ToolLayout toolId="base64" category="Encoding">
      <Tabs defaultValue="encode">
        <TabsList className="h-8">
          <TabsTrigger value="encode" className="text-xs h-7">{t('base64.encode', { ns: 'tools' })}</TabsTrigger>
          <TabsTrigger value="decode" className="text-xs h-7">{t('base64.decode', { ns: 'tools' })}</TabsTrigger>
        </TabsList>
        <TabsContent value="encode" className="space-y-3 mt-3">
          <Textarea variant="compact" placeholder={t('base64.encodePlaceholder', { ns: 'tools' })} value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-sm" />
          <Button onClick={handleEncode} size="sm">{t('base64.encode', { ns: 'tools' })}</Button>
        </TabsContent>
        <TabsContent value="decode" className="space-y-3 mt-3">
          <Textarea variant="compact" placeholder={t('base64.decodePlaceholder', { ns: 'tools' })} value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-sm" />
          <Button onClick={handleDecode} size="sm">{t('base64.decode', { ns: 'tools' })}</Button>
        </TabsContent>
      </Tabs>

      {error && <ToolError message={error} />}

      {result && (
        <div className="space-y-2">
          {result.base64 && <ToolResultField label="Base64" value={result.base64} copiedText={copiedText} onCopy={copy} />}
          {result.base64url && <ToolResultField label="Base64URL" value={result.base64url} copiedText={copiedText} onCopy={copy} />}
          {result.text !== undefined && <ToolResultField label={t('base64.decodeResult', { ns: 'tools' })} value={result.text} copiedText={copiedText} onCopy={copy} multiline />}
        </div>
      )}
    </ToolLayout>
  )
}
