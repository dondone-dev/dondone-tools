import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { decodeJwt, formatTimestamp, type JwtParts } from '@/lib/tools/jwt-decode'
import { useClipboard } from '@/hooks/useClipboard'

const TIME_FIELDS = ['exp', 'iat', 'nbf'] as const

export function JwtDecodePage() {
  const { t } = useTranslation('tools')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<JwtParts | null>(null)
  const [error, setError] = useState('')
  const { copiedText, copy } = useClipboard()

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
            <JwtSection title={t('jwt-decode.header')} data={result.header} copiedText={copiedText} onCopy={copy} />
            <JwtSection title={t('jwt-decode.payload')} data={result.payload} timeFields copiedText={copiedText} onCopy={copy} />
            <SignatureSection title={t('jwt-decode.signature')} value={result.signature} note={t('jwt-decode.noVerification')} copiedText={copiedText} onCopy={copy} />
          </div>
        )}
      </div>
    </ToolLayout>
  )
}

function JwtSection({ title, data, timeFields, copiedText, onCopy }: { title: string; data: Record<string, unknown>; timeFields?: boolean; copiedText: string | null; onCopy: (text: string) => void }) {
  const { t } = useTranslation(['tools', 'common'])
  const json = JSON.stringify(data, null, 2)
  const isCopied = copiedText === json

  return (
    <details open className="border rounded-lg">
      <summary className="px-4 py-2 text-sm font-medium cursor-pointer select-none hover:bg-muted/50 rounded-lg">
        {title}
      </summary>
      <div className="px-4 pb-3 pt-1 space-y-1">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => onCopy(json)}>
            {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {isCopied ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
          </Button>
        </div>
        <pre className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">
          {json}
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

function SignatureSection({ title, value, note, copiedText, onCopy }: { title: string; value: string; note: string; copiedText: string | null; onCopy: (text: string) => void }) {
  const { t } = useTranslation('common')
  const isCopied = copiedText === value
  return (
    <details open className="border rounded-lg">
      <summary className="px-4 py-2 text-sm font-medium cursor-pointer select-none hover:bg-muted/50 rounded-lg">
        {title}
      </summary>
      <div className="px-4 pb-3 pt-1 space-y-2">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => onCopy(value)}>
            {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {isCopied ? t('ui.copied') : t('ui.copy')}
          </Button>
        </div>
        <pre className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">
          {value}
        </pre>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </details>
  )
}
