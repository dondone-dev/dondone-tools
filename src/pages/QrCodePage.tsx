import { useState } from 'react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Download } from 'lucide-react'
import { generateQrCode, decodeImageData } from '@/lib/tools/qrcode'
import { cn } from '@/lib/utils'

export function QrCodePage() {
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

  const handleDecodeFile = (file: File) => {
    setError(''); setDecodeResult('')
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width; canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      try {
        setDecodeResult(decodeImageData({ data: imageData.data, width: canvas.width, height: canvas.height }).text)
      } catch (e) { setError((e as Error).message) }
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const downloadQr = () => {
    if (!qrResult) return
    const a = document.createElement('a')
    a.href = qrResult.dataUrl; a.download = 'qrcode.png'; a.click()
  }

  return (
    <ToolLayout title="QR Code" description="将文本生成二维码，或识别图片中的二维码内容。所有处理在浏览器本地完成。" category="Encoding">
      <Tabs defaultValue="generate">
        <TabsList className="h-8">
          <TabsTrigger value="generate" className="text-xs h-7">生成</TabsTrigger>
          <TabsTrigger value="decode" className="text-xs h-7">识别</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Input placeholder="输入文本内容..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} className="font-mono text-sm h-8" />
            <Button onClick={handleGenerate} size="sm" className="shrink-0">生成</Button>
          </div>
          {qrResult && (
            <div className="space-y-2">
              <img src={qrResult.dataUrl} alt="QR Code" className="w-48 h-48 border border-border rounded-md" />
              <Button variant="outline" size="sm" onClick={downloadQr} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />下载 PNG
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
            <p className="text-sm text-muted-foreground">拖放二维码图片或点击选择</p>
          </div>
          {decodeResult && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">识别结果</Label>
              <div className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 break-all select-all">{decodeResult}</div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
    </ToolLayout>
  )
}
