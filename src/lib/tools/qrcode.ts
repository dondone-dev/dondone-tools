import QRCode from 'qrcode'
import jsQR from 'jsqr'

export interface QrCodeResult {
  text: string
  size: number
  dataUrl: string
}

export interface QrDecodeResult {
  text: string
}

export async function generateQrCode({ text, size = 256 }: { text: string; size?: number }): Promise<QrCodeResult> {
  const normalizedText = String(text ?? '').trim()
  if (!normalizedText) throw new Error('输入为空，请先输入文本')
  const resolvedSize = Math.max(1, Math.floor(size))
  const dataUrl = await QRCode.toDataURL(normalizedText, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: resolvedSize,
  })
  return { text: normalizedText, size: resolvedSize, dataUrl }
}

export function decodeImageData({ data, width, height }: { data: Uint8ClampedArray; width: number; height: number }): QrDecodeResult {
  if (!data || !width || !height) throw new Error('二维码图片数据无效')
  const decoded = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
  if (!decoded?.data) throw new Error('未识别到二维码')
  return { text: decoded.data }
}
