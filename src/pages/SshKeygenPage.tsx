import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { ToolError, ToolStatus, ToolResultField } from '@/components/tools/ToolFeedback'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useClipboard } from '@/hooks/useClipboard'
import {
  generateSshKeyPairInWorker,
  type SshAlgorithm,
  type RsaKeySize,
  type SshKeyPairResult,
} from '@/lib/tools/ssh-keygen'

const RSA_KEY_SIZES: RsaKeySize[] = [2048, 3072, 4096]

async function detectEd25519Support(): Promise<boolean> {
  try {
    await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])
    return true
  } catch {
    return false
  }
}

export function SshKeygenPage() {
  const { t } = useTranslation(['tools', 'common'])
  const [ed25519Supported, setEd25519Supported] = useState(true)
  const [algorithm, setAlgorithm] = useState<SshAlgorithm>('ed25519')
  const [rsaKeySize, setRsaKeySize] = useState<RsaKeySize>(3072)
  const [comment, setComment] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<SshKeyPairResult | null>(null)
  const { copiedText, copy } = useClipboard()

  useEffect(() => {
    let cancelled = false
    detectEd25519Support().then((supported) => {
      if (cancelled) return
      setEd25519Supported(supported)
      if (!supported) setAlgorithm('rsa')
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleGenerate() {
    setResult(null)
    setStatus('generating')
    setError('')
    try {
      const generated = await generateSshKeyPairInWorker({
        algorithm,
        rsaKeySize: algorithm === 'rsa' ? rsaKeySize : undefined,
        comment,
        passphrase,
      })
      setResult(generated)
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  function download(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const filenameBase = result?.publicKeyLine.startsWith('ssh-ed25519 ') ? 'id_ed25519' : 'id_rsa'

  return (
    <ToolLayout toolId="ssh-keygen" category="Cryptography">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ssh-keygen-algorithm">{t('ssh-keygen.algorithm')}</Label>
            <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as SshAlgorithm)}>
              <SelectTrigger id="ssh-keygen-algorithm" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ed25519" disabled={!ed25519Supported}>
                  Ed25519
                </SelectItem>
                <SelectItem value="rsa">RSA</SelectItem>
              </SelectContent>
            </Select>
            {!ed25519Supported && (
              <p className="text-xs text-muted-foreground">{t('ssh-keygen.ed25519Unavailable')}</p>
            )}
          </div>

          {algorithm === 'rsa' && (
            <div className="space-y-1.5">
              <Label htmlFor="ssh-keygen-rsa-key-size">{t('ssh-keygen.rsaKeySize')}</Label>
              <Select value={String(rsaKeySize)} onValueChange={(v) => setRsaKeySize(Number(v) as RsaKeySize)}>
                <SelectTrigger id="ssh-keygen-rsa-key-size" size="sm" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RSA_KEY_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ssh-keygen-comment">{t('ssh-keygen.comment')}</Label>
            <Input
              id="ssh-keygen-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('ssh-keygen.commentPlaceholder')}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ssh-keygen-passphrase">{t('ssh-keygen.passphrase')}</Label>
            <Input
              id="ssh-keygen-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={t('ssh-keygen.passphrasePlaceholder')}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">{t('ssh-keygen.passphraseHint')}</p>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={status === 'generating'} className="min-h-9">
          {status === 'generating' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status === 'generating' ? t('ssh-keygen.generating') : t('ssh-keygen.generate')}
        </Button>

        {status === 'error' && <ToolError message={error} />}
        {status === 'generating' && <ToolStatus message={t('ssh-keygen.generating')} />}

        {result && (
          <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5 shadow-2xs">
            <ToolResultField
              label={t('ssh-keygen.publicKey')}
              value={result.publicKeyLine}
              copiedText={copiedText}
              onCopy={copy}
            />
            <div className="space-y-1">
              <ToolResultField
                label={t('ssh-keygen.privateKey')}
                value={result.privateKeyPem}
                copiedText={copiedText}
                onCopy={copy}
                multiline
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-8"
                  onClick={() => download(result.privateKeyPem, filenameBase)}
                >
                  {t('ssh-keygen.downloadPrivateKey')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-8"
                  onClick={() => download(result.publicKeyLine + '\n', `${filenameBase}.pub`)}
                >
                  {t('ssh-keygen.downloadPublicKey')}
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToolResultField
                label={t('ssh-keygen.fingerprintSha256')}
                value={result.fingerprintSha256}
                copiedText={copiedText}
                onCopy={copy}
              />
              <ToolResultField
                label={t('ssh-keygen.fingerprintMd5')}
                value={result.fingerprintMd5}
                copiedText={copiedText}
                onCopy={copy}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-8"
              onClick={handleGenerate}
              disabled={status === 'generating'}
            >
              {t('ssh-keygen.regenerate')}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{t('ssh-keygen.disclaimer')}</p>
      </div>
    </ToolLayout>
  )
}
