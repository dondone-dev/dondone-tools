import CryptoJS from 'crypto-js'

export function generateSign(appId: string, keyId: string, keySecret: string, body: string): string {
  if (!String(appId ?? '').trim() || !String(keyId ?? '').trim() || !String(keySecret ?? '').trim()) {
    throw new Error('AppID、Key ID、Key Secret 不能为空')
  }
  const timestamp = Date.now().toString()
  const message = appId + timestamp + body
  const digest = CryptoJS.HmacSHA256(message, keySecret).toString(CryptoJS.enc.Hex)
  return `${digest},${timestamp},${keyId}`
}
