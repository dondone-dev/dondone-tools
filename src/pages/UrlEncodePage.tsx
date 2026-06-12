import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useClipboard } from '@/hooks/useClipboard'
import { encodeUrl, decodeUrl } from '@/lib/tools/url-encode'

export function UrlEncodePage() {
  const { t } = useTranslation(['tools', 'common'])
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const { copied, copy } = useClipboard()

  function run(fn: (s: string) => string) {
    setError('')
    setOutput('')
    try {
      setOutput(fn(input))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <ToolLayout toolId="url-encode" category="Encoding">
      <div className="space-y-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('url-encode.inputPlaceholder', { ns: 'tools' })}
          rows={8}
          className="font-mono text-sm resize-y"
          spellCheck={false}
        />

        <div className="flex gap-2">
          <Button size="sm" onClick={() => run(encodeUrl)}>
            {t('url-encode.encode', { ns: 'tools' })}
          </Button>
          <Button size="sm" variant="outline" onClick={() => run(decodeUrl)}>
            {t('url-encode.decode', { ns: 'tools' })}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md font-mono">
            {error}
          </p>
        )}

        {output && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                {t('url-encode.outputPlaceholder', { ns: 'tools' })}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => copy(output)}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
              </Button>
            </div>
            <Textarea
              value={output}
              readOnly
              rows={8}
              className="font-mono text-sm resize-y bg-muted/50"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
