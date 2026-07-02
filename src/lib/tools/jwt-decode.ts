export interface JwtParts {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

export function decodeJwt(token: string): JwtParts {
  const parts = token.trim().split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT: expected 3 parts separated by "."')

  const decode = (s: string): Record<string, unknown> => {
    const standard = s.replace(/-/g, '+').replace(/_/g, '/')
    const padding = standard.length % 4
    const padded = padding === 0 ? standard : standard + '='.repeat(4 - padding)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return JSON.parse(json) as Record<string, unknown>
  }

  try {
    return {
      header: decode(parts[0]),
      payload: decode(parts[1]),
      signature: parts[2],
    }
  } catch {
    throw new Error('Invalid JWT: malformed base64 or JSON in header/payload')
  }
}

export function formatTimestamp(value: unknown): string | null {
  if (typeof value !== 'number') return null
  return new Date(value * 1000).toLocaleString()
}
