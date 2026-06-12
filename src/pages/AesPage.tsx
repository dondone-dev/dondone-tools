import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { Copy, Check } from 'lucide-react'
import { aesEncrypt, aesDecrypt, getDefaultAesOptions, type AesOptions } from '@/lib/tools/aes'

export function AesPage() {
  const { t } = useTranslation(['tools', 'common'])
  const [options, setOptions] = useState<AesOptions>(getDefaultAesOptions())
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const { copied, copy } = useClipboard()

  const update = (key: keyof AesOptions, value: string | number) =>
    setOptions((prev) => ({ ...prev, [key]: value }))

  const handleEncrypt = () => {
    setError(''); setResult('')
    try { setResult(aesEncrypt(options)) } catch (e) { setError((e as Error).message) }
  }

  const handleDecrypt = () => {
    setError(''); setResult('')
    try { setResult(aesDecrypt(options)) } catch (e) { setError((e as Error).message) }
  }

  const needsIv = options.mode !== 'ecb'

  return (
    <ToolLayout toolId="aes" category="Cryptography">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('aes.mode', { ns: 'tools' })}</Label>
            <Select value={options.mode} onValueChange={(v) => update('mode', v)}>
              <SelectTrigger size="sm" className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ecb">ECB</SelectItem>
                <SelectItem value="cbc">CBC</SelectItem>
                <SelectItem value="ctr">CTR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('aes.padding', { ns: 'tools' })}</Label>
            <Select value={options.padding} onValueChange={(v) => update('padding', v)}>
              <SelectTrigger size="sm" className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pkcs7">PKCS7</SelectItem>
                <SelectItem value="zero">Zero</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('aes.inputEncoding', { ns: 'tools' })}</Label>
            <Select value={options.inputEncoding} onValueChange={(v) => update('inputEncoding', v)}>
              <SelectTrigger size="sm" className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="utf8">UTF-8</SelectItem>
                <SelectItem value="hex">Hex</SelectItem>
                <SelectItem value="base64">Base64</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('aes.outputEncoding', { ns: 'tools' })}</Label>
            <Select value={options.outputEncoding} onValueChange={(v) => update('outputEncoding', v)}>
              <SelectTrigger size="sm" className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="utf8">UTF-8</SelectItem>
                <SelectItem value="hex">Hex</SelectItem>
                <SelectItem value="base64">Base64</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('aes.key', { ns: 'tools' })}</Label>
            <div className="flex gap-2">
              <Input
                value={options.key}
                onChange={(e) => update('key', e.target.value)}
                placeholder={t('aes.keyPlaceholder', { ns: 'tools' })}
                className="font-mono text-xs h-8"
              />
              <Select value={options.keyEncoding} onValueChange={(v) => update('keyEncoding', v)}>
                <SelectTrigger size="sm" className="w-24 text-xs shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf8">UTF-8</SelectItem>
                  <SelectItem value="hex">Hex</SelectItem>
                  <SelectItem value="base64">Base64</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {needsIv && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('aes.iv', { ns: 'tools' })}</Label>
              <div className="flex gap-2">
                <Input
                  value={options.iv}
                  onChange={(e) => update('iv', e.target.value)}
                  placeholder={t('aes.ivPlaceholder', { ns: 'tools' })}
                  className="font-mono text-xs h-8"
                />
                <Select value={options.ivEncoding} onValueChange={(v) => update('ivEncoding', v)}>
                  <SelectTrigger size="sm" className="w-24 text-xs shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utf8">UTF-8</SelectItem>
                    <SelectItem value="hex">Hex</SelectItem>
                    <SelectItem value="base64">Base64</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="encrypt">
          <TabsList className="h-8">
            <TabsTrigger value="encrypt" className="text-xs h-7">{t('aes.encrypt', { ns: 'tools' })}</TabsTrigger>
            <TabsTrigger value="decrypt" className="text-xs h-7">{t('aes.decrypt', { ns: 'tools' })}</TabsTrigger>
          </TabsList>
          <TabsContent value="encrypt" className="space-y-3 mt-3">
            <Textarea
              placeholder={t('aes.plaintextPlaceholder', { ns: 'tools' })}
              value={options.input}
              onChange={(e) => update('input', e.target.value)}
              className="font-mono text-sm min-h-[100px] resize-none"
            />
            <Button onClick={handleEncrypt} size="sm">{t('aes.encrypt', { ns: 'tools' })}</Button>
          </TabsContent>
          <TabsContent value="decrypt" className="space-y-3 mt-3">
            <Textarea
              placeholder={t('aes.ciphertextPlaceholder', { ns: 'tools' })}
              value={options.input}
              onChange={(e) => update('input', e.target.value)}
              className="font-mono text-sm min-h-[100px] resize-none"
            />
            <Button onClick={handleDecrypt} size="sm">{t('aes.decrypt', { ns: 'tools' })}</Button>
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

        {result && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t('ui.result', { ns: 'common' })}</Label>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => copy(result)}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
              </Button>
            </div>
            <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all whitespace-pre-wrap">{result}</div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
