import { base64ToBytes, bytesToBase64, bytesToUtf8 } from './encoding-common'

export interface ImageResult {
  base64: string
  dataUrl: string
  mimeType: string
  byteLength: number
}

function sniffImageMime(bytes: Uint8Array): string {
  const header = Array.from(bytes.slice(0, 12))
  let ascii = ''
  try { ascii = bytesToUtf8(bytes.slice(0, 256)).trim().toLowerCase() } catch { /* ignore */ }

  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) return 'image/png'
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg'
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) return 'image/gif'
  if (header[0] === 0x42 && header[1] === 0x4d) return 'image/bmp'
  if (
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  ) return 'image/webp'
  if (ascii.startsWith('<svg') || ascii.includes('<svg')) return 'image/svg+xml'

  throw new Error('Unsupported or unknown image format')
}

export function encodeImageBytes(bytes: Uint8Array, mimeType: string): ImageResult {
  if (!mimeType || !String(mimeType).startsWith('image/')) {
    throw new Error('请选择图片文件后再处理')
  }
  const base64 = bytesToBase64(bytes)
  return { base64, dataUrl: `data:${mimeType};base64,${base64}`, mimeType, byteLength: bytes.byteLength }
}

export function decodeImageInput(input: string): ImageResult & { bytes: Uint8Array } {
  const trimmed = String(input ?? '').trim()
  if (!trimmed) throw new Error('输入为空，请先输入 Base64 或 Data URL')

  const dataUrlMatch = trimmed.match(/^data:(image\/[a-z0-9.+-]+(?:;[a-z0-9=+-]+)*)?;base64,(.+)$/i)
  let mimeType = ''
  let base64Payload = trimmed

  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1] ?? ''
    base64Payload = dataUrlMatch[2]
  }

  let bytes: Uint8Array
  try {
    bytes = base64ToBytes(base64Payload)
  } catch {
    throw new Error('Invalid Base64 image input')
  }

  const resolvedMime = mimeType || sniffImageMime(bytes)
  const base64 = bytesToBase64(bytes)
  return {
    base64,
    dataUrl: `data:${resolvedMime};base64,${base64}`,
    mimeType: resolvedMime,
    byteLength: bytes.byteLength,
    bytes,
  }
}
