import { useState } from 'react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { Copy, Check } from 'lucide-react'
import { encodeText, decodeText } from '@/lib/tools/base64'

export function Base64Page() {
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
    <ToolLayout title="Base64" description="对文本进行 Base64 编码和解码，同时输出 Base64URL 格式。所有计算在浏览器本地完成。" category="Encoding">
      <Tabs defaultValue="encode">
        <TabsList className="h-8">
          <TabsTrigger value="encode" className="text-xs h-7">编码</TabsTrigger>
          <TabsTrigger value="decode" className="text-xs h-7">解码</TabsTrigger>
        </TabsList>
        <TabsContent value="encode" className="space-y-3 mt-3">
          <Textarea placeholder="输入需要编码的文本..." value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-sm min-h-[100px] resize-none" />
          <Button onClick={handleEncode} size="sm">编码</Button>
        </TabsContent>
        <TabsContent value="decode" className="space-y-3 mt-3">
          <Textarea placeholder="输入 Base64 内容..." value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-sm min-h-[100px] resize-none" />
          <Button onClick={handleDecode} size="sm">解码</Button>
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

      {result && (
        <div className="space-y-2">
          {result.base64 && <ResultField label="Base64" value={result.base64} copied={copied} onCopy={copy} />}
          {result.base64url && <ResultField label="Base64URL" value={result.base64url} copied={copied} onCopy={copy} />}
          {result.text !== undefined && <ResultField label="解码结果" value={result.text} copied={copied} onCopy={copy} />}
        </div>
      )}
    </ToolLayout>
  )
}

function ResultField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: (text: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => onCopy(value)}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all whitespace-pre-wrap">{value}</div>
    </div>
  )
}
