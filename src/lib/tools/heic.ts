export type HeicOutputFormat = 'jpeg' | 'png' | 'bmp'

export interface HeicFormatConfig {
  id: HeicOutputFormat
  label: string
  mime: string
  ext: string
  supportsQuality: boolean
}

export const HEIC_FORMATS: HeicFormatConfig[] = [
  { id: 'jpeg', label: 'JPEG', mime: 'image/jpeg', ext: 'jpg', supportsQuality: true },
  { id: 'png',  label: 'PNG',  mime: 'image/png',  ext: 'png', supportsQuality: false },
  { id: 'bmp',  label: 'Bitmap', mime: 'image/bmp', ext: 'bmp', supportsQuality: false },
]

export function getFormatConfig(id: HeicOutputFormat): HeicFormatConfig {
  const config = HEIC_FORMATS.find(f => f.id === id)
  if (!config) throw new Error(`Unknown format: ${id}`)
  return config
}

export function buildOutputFilename(inputName: string, format: HeicOutputFormat): string {
  const config = getFormatConfig(format)
  return inputName.replace(/\.(heic|heif)$/i, '') + '.' + config.ext
}

export const DEFAULT_QUALITY = 92
export const MAX_CONCURRENT = 2

export function encodeBmp(data: Uint8ClampedArray, width: number, height: number): Blob {
  const rowSize = (width * 3 + 3) & ~3
  const pixelDataSize = rowSize * height
  const fileSize = 54 + pixelDataSize
  const buf = new ArrayBuffer(fileSize)
  const view = new DataView(buf)

  view.setUint8(0, 0x42); view.setUint8(1, 0x4d)
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true)

  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, -height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelDataSize, true)

  const pixels = new Uint8Array(buf, 54)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4
      const dst = y * rowSize + x * 3
      pixels[dst] = data[src + 2]
      pixels[dst + 1] = data[src + 1]
      pixels[dst + 2] = data[src]
    }
  }

  return new Blob([buf], { type: 'image/bmp' })
}
