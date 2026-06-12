import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { Copy, Check } from 'lucide-react'
import { encodeText, decodeText } from '@/lib/tools/base64'

export function Base64Page() {
  const { t } = useTranslation(['tools', 'common'])
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ base64?: string; base64url?: string; text?: string } | null>(null)
  const [error, setError] = useState('')
  const { copied, copy } = useClipboard()

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
          <Textarea placeholder={t('base64.encodePlaceholder', { ns: 'tools' })} value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-sm min-h-[100px] resize-none" />
          <Button onClick={handleEncode} size="sm">{t('base64.encode', { ns: 'tools' })}</Button>
        </TabsContent>
        <TabsContent value="decode" className="space-y-3 mt-3">
          <Textarea placeholder={t('base64.decodePlaceholder', { ns: 'tools' })} value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-sm min-h-[100px] resize-none" />
          <Button onClick={handleDecode} size="sm">{t('base64.decode', { ns: 'tools' })}</Button>
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

      {result && (
        <div className="space-y-2">
          {result.base64 && <ResultField label="Base64" value={result.base64} copied={copied} onCopy={copy} />}
          {result.base64url && <ResultField label="Base64URL" value={result.base64url} copied={copied} onCopy={copy} />}
          {result.text !== undefined && <ResultField label={t('base64.decodeResult', { ns: 'tools' })} value={result.text} copied={copied} onCopy={copy} />}
        </div>
      )}
    </ToolLayout>
  )
}

function ResultField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: (text: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => onCopy(value)}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? t('ui.copied') : t('ui.copy')}
        </Button>
      </div>
      <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all whitespace-pre-wrap">{value}</div>
    </div>
  )
}
