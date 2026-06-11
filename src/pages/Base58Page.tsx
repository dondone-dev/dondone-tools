import { useState } from 'react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { Copy, Check } from 'lucide-react'
import { encodeText, decodeText } from '@/lib/tools/base58'

export function Base58Page() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ encoded?: string; text?: string; hex?: string; hasText?: boolean } | null>(null)
  const [error, setError] = useState('')
  const { copied, copy } = useClipboard()

  const handleEncode = () => {
    setError(''); setResult(null)
    try { setResult({ encoded: encodeText(input) }) } catch (e) { setError((e as Error).message) }
  }

  const handleDecode = () => {
    setError(''); setResult(null)
    try { setResult(decodeText(input)) } catch (e) { setError((e as Error).message) }
  }

  return (
    <ToolLayout title="Base58" description="使用 Bitcoin 字母表进行 Base58 编码和解码。所有计算在浏览器本地完成。" category="Encoding">
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
          <Textarea placeholder="输入 Base58 内容..." value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-sm min-h-[100px] resize-none" />
          <Button onClick={handleDecode} size="sm">解码</Button>
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

      {result && (
        <div className="space-y-2">
          {result.encoded && <ResultField label="Base58" value={result.encoded} copied={copied} onCopy={copy} />}
          {result.hasText && result.text && <ResultField label="文本（UTF-8）" value={result.text} copied={copied} onCopy={copy} />}
          {result.hex && <ResultField label="Hex" value={result.hex} copied={copied} onCopy={copy} />}
          {result.hasText === false && <p className="text-xs text-muted-foreground">解码结果不是有效 UTF-8 文本，仅显示 Hex。</p>}
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
      <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all">{value}</div>
    </div>
  )
}
