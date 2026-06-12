import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClipboard } from '@/hooks/useClipboard'
import { Copy, Check, Upload } from 'lucide-react'
import { decodeImageInput, encodeImageBytes } from '@/lib/tools/base64-image'
import { formatBytes } from '@/lib/tools/encoding-common'
import { cn } from '@/lib/utils'

export function Base64ImagePage() {
  const { t } = useTranslation(['tools', 'common'])
  const [b64Input, setB64Input] = useState('')
  const [result, setResult] = useState<{ dataUrl?: string; base64?: string; mimeType?: string; byteLength?: number } | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { copied, copy } = useClipboard()

  const handleDecodeB64 = () => {
    setError(''); setResult(null)
    try { setResult(decodeImageInput(b64Input)) } catch (e) { setError((e as Error).message) }
  }

  const handleFile = async (file: File) => {
    setError(''); setResult(null)
    const bytes = new Uint8Array(await file.arrayBuffer())
    try { setResult(encodeImageBytes(bytes, file.type)) } catch (e) { setError((e as Error).message) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <ToolLayout toolId="base64-image" category="Encoding">
      <Tabs defaultValue="image-to-b64">
        <TabsList className="h-8">
          <TabsTrigger value="image-to-b64" className="text-xs h-7">{t('base64-image.imageToB64', { ns: 'tools' })}</TabsTrigger>
          <TabsTrigger value="b64-to-image" className="text-xs h-7">{t('base64-image.b64ToImage', { ns: 'tools' })}</TabsTrigger>
        </TabsList>

        <TabsContent value="image-to-b64" className="space-y-3 mt-3">
          <div
            className={cn('border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer', dragOver ? 'border-foreground/50 bg-muted/50' : 'border-border hover:border-foreground/30')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('base64-image.dropImage', { ns: 'tools' })}</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        </TabsContent>

        <TabsContent value="b64-to-image" className="space-y-3 mt-3">
          <Textarea placeholder={t('base64-image.b64Placeholder', { ns: 'tools' })} value={b64Input} onChange={(e) => setB64Input(e.target.value)} className="font-mono text-xs min-h-[100px] resize-none" />
          <Button onClick={handleDecodeB64} size="sm">{t('base64-image.decode', { ns: 'tools' })}</Button>
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

      {result && (
        <div className="space-y-3">
          {result.dataUrl && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('base64-image.preview', { ns: 'tools' })}</Label>
              <img src={result.dataUrl} alt="preview" className="max-w-[240px] max-h-[240px] rounded-md border border-border object-contain" />
              <p className="text-xs text-muted-foreground">{result.mimeType} · {formatBytes(result.byteLength ?? 0)}</p>
            </div>
          )}
          {result.base64 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Base64</Label>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => copy(result.base64!)}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
                </Button>
              </div>
              <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all max-h-40 overflow-y-auto">{result.base64}</div>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  )
}
