import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { ToolError, ToolResultField } from '@/components/tools/ToolFeedback'
import { encodeUrl, decodeUrl } from '@/lib/tools/url-encode'

export function UrlEncodePage() {
  const { t } = useTranslation(['tools', 'common'])
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const { copiedText, copy } = useClipboard()

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
          variant="default"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('url-encode.inputPlaceholder', { ns: 'tools' })}
          className="font-mono text-sm"
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

        {error && <ToolError message={error} className="font-mono" />}

        {output && (
          <ToolResultField
            label={t('url-encode.outputPlaceholder', { ns: 'tools' })}
            value={output}
            copiedText={copiedText}
            onCopy={copy}
            multiline
            className="text-sm"
          />
        )}
      </div>
    </ToolLayout>
  )
}
