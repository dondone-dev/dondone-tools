export function utf8ToBytes(input: string): Uint8Array {
  return new TextEncoder().encode(String(input ?? ''))
}

export function bytesToUtf8(bytes: Uint8Array, { fatal = false } = {}): string {
  return new TextDecoder('utf-8', { fatal }).decode(bytes)
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const value of bytes) {
    binary += String.fromCharCode(value)
  }
  return btoa(binary)
}

export function base64ToBytes(value: string): Uint8Array {
  const normalized = normalizeBase64Input(value)
  if (!normalized) {
    throw new Error('Invalid Base64 input')
  }
  const binary = atob(normalized)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function toBase64Url(base64: string): string {
  return String(base64 ?? '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function normalizeBase64Input(value: string): string {
  const trimmed = String(value ?? '').trim().replace(/\s+/g, '')
  if (!trimmed) return ''

  const standard = trimmed.replace(/-/g, '+').replace(/_/g, '/')
  if (/[^A-Za-z0-9+/=]/.test(standard)) {
    throw new Error('Invalid Base64 input')
  }

  const padding = standard.length % 4
  const padded = padding === 0 ? standard : `${standard}${'='.repeat(4 - padding)}`

  if (padded.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(padded)) {
    throw new Error('Invalid Base64 input')
  }

  return padded
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
