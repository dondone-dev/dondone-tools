import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClipboard } from '@/hooks/useClipboard'
import { RefreshCw } from 'lucide-react'
import { ToolError, ToolResultField } from '@/components/tools/ToolFeedback'
import { generateJwtToken } from '@/lib/tools/bp-jwt'

export function BpJwtPage() {
  const { t } = useTranslation(['tools', 'common'])
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const { copiedText, copy } = useClipboard()

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
    <ToolLayout toolId="bp-jwt" category="BP Authentication">
      <div className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Key ID</Label>
            <Input
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder={t('bp-jwt.keyIdPlaceholder', { ns: 'tools' })}
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Key Secret</Label>
            <Input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder={t('bp-jwt.keySecretPlaceholder', { ns: 'tools' })}
              className="font-mono text-xs h-8"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          <Trans
            t={t}
            i18nKey="bp-jwt.payloadNote"
            ns="tools"
            components={{ code: <code className="bg-muted px-1 rounded" /> }}
          />
        </p>

        <div>
          <Button onClick={handleGenerate} size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            {t('bp-jwt.generateToken', { ns: 'tools' })}
          </Button>
        </div>

        {error && <ToolError message={error} />}

        {result && (
          <ToolResultField label="JWT Token" value={result} copiedText={copiedText} onCopy={copy} />
        )}
      </div>
    </ToolLayout>
  )
}
