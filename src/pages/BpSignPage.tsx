import { useState } from 'react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { Copy, Check, Fingerprint } from 'lucide-react'
import { generateSign } from '@/lib/tools/bp-sign'

export function BpSignPage() {
  const [appId, setAppId] = useState('')
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [body, setBody] = useState('')
  const [method, setMethod] = useState<'get' | 'post'>('get')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const { copied, copy } = useClipboard()

  const handleGenerate = () => {
    setError('')
    setResult('')
    try {
      const payload = method === 'get' ? '' : body
      setResult(generateSign(appId, keyId, keySecret, payload))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <ToolLayout
      title="Client Sign"
      description="使用 HmacSHA256 生成 Client API 请求签名，格式为 digest,timestamp,keyId。所有计算在浏览器本地完成。"
      category="BP Authentication"
    >
      <div className="grid gap-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">App ID</Label>
            <Input
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="应用 App ID"
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Key ID</Label>
            <Input
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="API Key ID"
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Key Secret</Label>
            <Input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder="API Key Secret"
              className="font-mono text-xs h-8"
            />
          </div>
        </div>

        <Tabs value={method} onValueChange={(v) => setMethod(v as 'get' | 'post')}>
          <TabsList className="h-8">
            <TabsTrigger value="get" className="text-xs h-7">GET（空 Body）</TabsTrigger>
            <TabsTrigger value="post" className="text-xs h-7">POST（JSON Body）</TabsTrigger>
          </TabsList>
          <TabsContent value="get" className="mt-3">
            <p className="text-xs text-muted-foreground">
              GET 请求签名时 Body 为空字符串，签名算法：
              <code className="bg-muted px-1 rounded mx-1">HmacSHA256(appId + timestamp + "", keySecret)</code>
            </p>
          </TabsContent>
          <TabsContent value="post" className="space-y-2 mt-3">
            <Label className="text-xs">请求 Body（JSON）</Label>
            <Textarea
              placeholder={'{\n  "key": "value"\n}'}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-sm min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              签名使用原始 JSON 字符串，不做任何格式化处理。
            </p>
          </TabsContent>
        </Tabs>

        <div>
          <Button onClick={handleGenerate} size="sm" className="gap-1.5">
            <Fingerprint className="h-3.5 w-3.5" />
            生成签名
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
        )}

        {result && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">签名结果</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => copy(result)}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all leading-relaxed">
              {result}
            </div>
            <p className="text-xs text-muted-foreground">
              格式：<code className="bg-muted px-1 rounded">digest,timestamp,keyId</code>
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
