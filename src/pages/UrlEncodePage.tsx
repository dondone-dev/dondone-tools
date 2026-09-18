import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { TextToolLayout, TextToolTextarea } from '@/components/tools/TextToolLayout'
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

  function handleClear() {
    setInput('')
    setOutput('')
    setError('')
  }

  return (
    <ToolLayout toolId="url-encode" category="Encoding">
      <TextToolLayout
        inputLabel={t('url-encode.title', { ns: 'tools', defaultValue: 'URL / Text' })}
        inputValue={input}
        onClearInput={handleClear}
        inputContent={
          <TextToolTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('url-encode.inputPlaceholder', { ns: 'tools' })}
          />
        }
        inputActions={
          <>
            <Button size="sm" onClick={() => run(encodeUrl)}>
              {t('url-encode.encode', { ns: 'tools' })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => run(decodeUrl)}>
              {t('url-encode.decode', { ns: 'tools' })}
            </Button>
          </>
        }
        outputLabel={t('ui.result', { ns: 'common' })}
        hasOutput={Boolean(output)}
        onCopyOutput={() => copy(output)}
        isOutputCopied={copiedText === output && Boolean(output)}
        outputContent={
          <div className="p-3">
            <div className="select-all break-all font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {output}
            </div>
          </div>
        }
        error={error}
      />
    </ToolLayout>
  )
}
