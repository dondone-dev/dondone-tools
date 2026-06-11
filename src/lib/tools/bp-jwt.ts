import CryptoJS from 'crypto-js'

function base64url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function generateJwtToken(keyId: string, keySecret: string): string {
  if (!String(keyId ?? '').trim() || !String(keySecret ?? '').trim()) {
    throw new Error('Key ID 和 Key Secret 不能为空')
  }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({ iat: Date.now(), key_name: keyId.trim() }))
  const signingInput = `${header}.${payload}`
  const sig = CryptoJS.HmacSHA256(signingInput, keySecret).toString(CryptoJS.enc.Base64)
  const sigUrl = sig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${signingInput}.${sigUrl}`
}
