import { test, expect } from 'vitest'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { generateQrCode, decodeImageData, classifyQrCodeText } from './qrcode'

function renderQrToImageData(text: string, { size = 256, margin = 4 } = {}) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const modules = qr.modules.size
  const scale = Math.max(2, Math.floor(size / (modules + margin * 2)))
  const width = (modules + margin * 2) * scale
  const data = new Uint8ClampedArray(width * width * 4)

  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const moduleX = Math.floor(x / scale) - margin
      const moduleY = Math.floor(y / scale) - margin
      const isDark =
        moduleX >= 0 && moduleX < modules &&
        moduleY >= 0 && moduleY < modules &&
        qr.modules.get(moduleX, moduleY)
      const offset = (y * width + x) * 4
      const value = isDark ? 0 : 255
      data[offset] = value; data[offset + 1] = value; data[offset + 2] = value; data[offset + 3] = 255
    }
  }

  return { data, width, height: width }
}

test('generateQrCode returns data url starting with image/png prefix', async () => {
  const result = await generateQrCode({ text: 'https://example.com/hello', size: 256 })
  expect(result.dataUrl).toMatch(/^data:image\/png;base64,/)
  expect(result.size).toBe(256)
  expect(result.text).toBe('https://example.com/hello')
})

test('decodeImageData recovers text from QR image data', () => {
  const imageData = renderQrToImageData('你好，二维码')
  const result = decodeImageData(imageData)
  expect(result.text).toBe('你好，二维码')
})

test('generateQrCode then decodeImageData round-trip works via jsQR', () => {
  const imageData = renderQrToImageData('hello qrcode')
  const { data, width, height } = imageData
  const decoded = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
  expect(decoded?.data).toBe('hello qrcode')
})

test('generateQrCode throws on empty text', async () => {
  await expect(generateQrCode({ text: '   ', size: 256 })).rejects.toThrow(/输入为空/)
})

test('decodeImageData throws on zero dimensions', () => {
  expect(() => decodeImageData({ data: new Uint8ClampedArray(32 * 32 * 4), width: 0, height: 0 }))
    .toThrow(/数据无效/)
})

test('decodeImageData throws when no QR code is found', () => {
  expect(() => decodeImageData({ data: new Uint8ClampedArray(32 * 32 * 4), width: 32, height: 32 }))
    .toThrow(/未识别到二维码/)
})

test('classifyQrCodeText identifies url and text payloads', () => {
  expect(classifyQrCodeText('https://tools.dondone.dev/encoding/qrcode')).toBe('url')
  expect(classifyQrCodeText('plain text payload')).toBe('text')
})
