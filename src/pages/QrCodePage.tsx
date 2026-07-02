import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Download } from 'lucide-react'
import { generateQrCode, decodeImageData } from '@/lib/tools/qrcode'
import { cn } from '@/lib/utils'

export function QrCodePage() {
  const { t } = useTranslation('tools')
  const [text, setText] = useState('')
  const [size] = useState(256)
  const [qrResult, setQrResult] = useState<{ dataUrl: string; text: string } | null>(null)
  const [decodeResult, setDecodeResult] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleGenerate = async () => {
    setError(''); setQrResult(null)
    try { setQrResult(await generateQrCode({ text, size })) } catch (e) { setError((e as Error).message) }
  }

  const objectUrlRef = useRef<string | undefined>(undefined)
  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current) }, [])

  const handleDecodeFile = (file: File) => {
    setError(''); setDecodeResult('')
    if (!file.type.startsWith('image/')) {
      setError(t('qrcode.imageOnly', 'Please select an image file'))
      return
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width; canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { setError('Canvas not supported'); return }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      try {
        setDecodeResult(decodeImageData({ data: imageData.data, width: canvas.width, height: canvas.height }).text)
      } catch (e) { setError((e as Error).message) }
    }
    img.onerror = () => setError(t('qrcode.loadFailed', 'Failed to load image'))
    img.src = url
  }

  const downloadQr = () => {
    if (!qrResult) return
    const a = document.createElement('a')
    a.href = qrResult.dataUrl; a.download = 'qrcode.png'; a.click()
  }

  return (
    <ToolLayout toolId="qrcode" category="Encoding">
      <Tabs defaultValue="generate">
        <TabsList className="h-8">
          <TabsTrigger value="generate" className="text-xs h-7">{t('qrcode.generate')}</TabsTrigger>
          <TabsTrigger value="decode" className="text-xs h-7">{t('qrcode.decode')}</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Input placeholder={t('qrcode.textPlaceholder')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} className="font-mono text-sm h-8" />
            <Button onClick={handleGenerate} size="sm" className="shrink-0">{t('qrcode.generate')}</Button>
          </div>
          {qrResult && (
            <div className="space-y-2">
              <img src={qrResult.dataUrl} alt="QR Code" className="w-48 h-48 border border-border rounded-md" />
              <Button variant="outline" size="sm" onClick={downloadQr} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />{t('qrcode.downloadPng')}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="decode" className="space-y-3 mt-3">
          <div
            className={cn('border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer', dragOver ? 'border-foreground/50 bg-muted/50' : 'border-border hover:border-foreground/30')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleDecodeFile(f) }}
            onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleDecodeFile(f) }; i.click() }}
          >
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('qrcode.dropQr')}</p>
          </div>
          {decodeResult && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('qrcode.decodeResult')}</Label>
              <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all">{decodeResult}</div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
    </ToolLayout>
  )
}
