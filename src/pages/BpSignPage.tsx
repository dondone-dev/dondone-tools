import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
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
  const { t } = useTranslation(['tools', 'common'])
  const [appId, setAppId] = useState('')
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [body, setBody] = useState('')
  const [method, setMethod] = useState<'get' | 'post'>('get')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const { copiedText, copy } = useClipboard()

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
    <ToolLayout toolId="bp-sign" category="BP Authentication">
      <div className="grid gap-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">App ID</Label>
            <Input
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder={t('bp-sign.appIdPlaceholder', { ns: 'tools' })}
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
            <TabsTrigger value="get" className="text-xs h-7">GET</TabsTrigger>
            <TabsTrigger value="post" className="text-xs h-7">POST</TabsTrigger>
          </TabsList>
          <TabsContent value="get" className="mt-3">
            <p className="text-xs text-muted-foreground">{t('bp-sign.getNote', { ns: 'tools' })}</p>
          </TabsContent>
          <TabsContent value="post" className="space-y-2 mt-3">
            <Label className="text-xs">{t('bp-sign.requestBody', { ns: 'tools' })}</Label>
            <Textarea
              placeholder={'{\n  "key": "value"\n}'}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-sm min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">{t('bp-sign.bodyRaw', { ns: 'tools' })}</p>
          </TabsContent>
        </Tabs>

        <div>
          <Button onClick={handleGenerate} size="sm" className="gap-1.5">
            <Fingerprint className="h-3.5 w-3.5" />
            {t('bp-sign.generateSign', { ns: 'tools' })}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
        )}

        {result && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t('bp-sign.signResult', { ns: 'tools' })}</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => copy(result)}
              >
                {copiedText === result ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedText === result ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
              </Button>
            </div>
            <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all leading-relaxed">
              {result}
            </div>
            <p className="text-xs text-muted-foreground">
              <Trans
                t={t}
                i18nKey="bp-sign.signFormat"
                ns="tools"
                components={{ code: <code className="bg-muted px-1 rounded" /> }}
              />
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
