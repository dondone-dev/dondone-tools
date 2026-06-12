import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { decodeJwt, formatTimestamp, type JwtParts } from '@/lib/tools/jwt-decode'

const TIME_FIELDS = ['exp', 'iat', 'nbf'] as const

export function JwtDecodePage() {
  const { t } = useTranslation('tools')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<JwtParts | null>(null)
  const [error, setError] = useState('')

  function handleDecode() {
    setError('')
    setResult(null)
    try {
      setResult(decodeJwt(input))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <ToolLayout toolId="jwt-decode" category="Cryptography">
      <div className="space-y-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('jwt-decode.inputPlaceholder')}
          rows={6}
          className="font-mono text-sm resize-y"
          spellCheck={false}
        />
        <Button size="sm" onClick={handleDecode}>
          {t('jwt-decode.decode')}
        </Button>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md font-mono">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-2">
            <JwtSection title={t('jwt-decode.header')} data={result.header} />
            <JwtSection title={t('jwt-decode.payload')} data={result.payload} timeFields />
            <SignatureSection title={t('jwt-decode.signature')} value={result.signature} note={t('jwt-decode.noVerification')} />
          </div>
        )}
      </div>
    </ToolLayout>
  )
}

function JwtSection({ title, data, timeFields }: { title: string; data: Record<string, unknown>; timeFields?: boolean }) {
  const { t } = useTranslation('tools')

  return (
    <details open className="border rounded-lg">
      <summary className="px-4 py-2 text-sm font-medium cursor-pointer select-none hover:bg-muted/50 rounded-lg">
        {title}
      </summary>
      <div className="px-4 pb-3 pt-1 space-y-1">
        <pre className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
        {timeFields && (
          <div className="space-y-1 pt-1">
            {TIME_FIELDS.map((field) => {
              const val = data[field]
              const formatted = formatTimestamp(val)
              if (!formatted) return null
              const labelKey = field === 'exp' ? 'jwt-decode.expiresAt' : field === 'iat' ? 'jwt-decode.issuedAt' : 'jwt-decode.notBefore'
              const isExpired = field === 'exp' && typeof val === 'number' && val * 1000 < Date.now()
              return (
                <div key={field} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">{field}</span>
                  <span>{t(labelKey)}:</span>
                  <span className="font-mono">{formatted}</span>
                  {isExpired && <Badge variant="destructive" className="text-xs px-1 py-0">expired</Badge>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </details>
  )
}

function SignatureSection({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <details open className="border rounded-lg">
      <summary className="px-4 py-2 text-sm font-medium cursor-pointer select-none hover:bg-muted/50 rounded-lg">
        {title}
      </summary>
      <div className="px-4 pb-3 pt-1 space-y-2">
        <pre className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">
          {value}
        </pre>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </details>
  )
}
