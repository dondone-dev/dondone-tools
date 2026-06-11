import { useState } from 'react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClipboard } from '@/hooks/useClipboard'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { generateJwtToken } from '@/lib/tools/bp-jwt'

export function BpJwtPage() {
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const { copied, copy } = useClipboard()

  const handleGenerate = () => {
    setError('')
    setResult('')
    try {
      setResult(generateJwtToken(keyId, keySecret))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <ToolLayout
      title="Server JWT Token"
      description="生成 Server API 鉴权用的 JWT Token（HS256），payload 包含毫秒时间戳 iat 和 key_name 字段。所有计算在浏览器本地完成。"
      category="BP Authentication"
    >
      <div className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Key ID</Label>
            <Input
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="API Key ID（server_key 类型）"
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

        <p className="text-xs text-muted-foreground">
          payload 包含 <code className="bg-muted px-1 rounded">iat</code>（毫秒时间戳）和{' '}
          <code className="bg-muted px-1 rounded">key_name</code>（Key ID），每次点击生成新的时间戳。
        </p>

        <div>
          <Button onClick={handleGenerate} size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            生成 Token
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
        )}

        {result && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">JWT Token</Label>
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
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
