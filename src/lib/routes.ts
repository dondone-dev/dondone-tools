export const TOOL_ROUTES = [
  '/crypto/aes',
  '/hash/md5',
  '/hash/sha2',
  '/hash/sha3',
  '/hash/blake',
  '/hash/xxhash3',
  '/encoding/base64',
  '/encoding/base64-image',
  '/encoding/base58',
  '/encoding/qrcode',
  '/text/string-length',
  '/security/password-strength',
  '/fun/ugly-avatar',
  '/bp/jwt',
  '/bp/sign',
] as const

export type ToolRoute = (typeof TOOL_ROUTES)[number]
