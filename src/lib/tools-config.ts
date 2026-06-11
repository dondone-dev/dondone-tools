import {
  Lock,
  Hash,
  FileCode,
  QrCode,
  Type,
  Smile,
  KeyRound,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export interface ToolConfig {
  id: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  category: ToolCategory
}

export type ToolCategory = 'Cryptography' | 'Hash' | 'Encoding' | 'Text' | 'Fun' | 'BP Authentication'

export const TOOLS: ToolConfig[] = [
  {
    id: 'aes',
    title: 'AES',
    description: '使用 AES 算法对文本进行加密和解密，支持 ECB/CBC/CTR 模式和 PKCS7/Zero/None 填充。',
    href: '/aes',
    icon: Lock,
    category: 'Cryptography',
  },
  {
    id: 'md5',
    title: 'MD5',
    description: '计算文本或文件的 MD5 哈希值，支持 UTF-8/GBK 编码和分块文件处理。',
    href: '/md5',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'sha2',
    title: 'SHA-2',
    description: '计算 SHA-224、SHA-256、SHA-384、SHA-512 哈希值，支持文本和文件输入。',
    href: '/sha2',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'sha3',
    title: 'SHA-3',
    description: '计算 SHA3-224、SHA3-256、SHA3-384、SHA3-512 哈希值。',
    href: '/sha3',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'blake',
    title: 'BLAKE',
    description: '计算 BLAKE2b 和 BLAKE3 哈希值，支持文本和文件输入。',
    href: '/blake',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'xxhash3',
    title: 'xxHash3',
    description: '计算 xxHash3-64 和 xxHash3-128 哈希值，高速非加密哈希算法。',
    href: '/xxhash3',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'base64',
    title: 'Base64',
    description: '对文本进行 Base64 编码和解码，同时输出 Base64URL 格式。',
    href: '/base64',
    icon: FileCode,
    category: 'Encoding',
  },
  {
    id: 'base64-image',
    title: 'Base64 Image',
    description: '图片与 Base64 字符串互转，支持 PNG、JPEG、GIF、WebP 等格式。',
    href: '/base64-image',
    icon: FileCode,
    category: 'Encoding',
  },
  {
    id: 'base58',
    title: 'Base58',
    description: '使用 Bitcoin 字母表进行 Base58 编码和解码。',
    href: '/base58',
    icon: FileCode,
    category: 'Encoding',
  },
  {
    id: 'qrcode',
    title: 'QR Code',
    description: '将文本生成二维码，或识别图片中的二维码内容。',
    href: '/qrcode',
    icon: QrCode,
    category: 'Encoding',
  },
  {
    id: 'string-length',
    title: 'String Length',
    description: '统计字符串长度，包括字符数、字节数、行数、全角/半角字符统计。',
    href: '/string-length',
    icon: Type,
    category: 'Text',
  },
  {
    id: 'ugly-avatar',
    title: 'Ugly Avatar',
    description: '随机生成丑萌风格头像，可自定义颜色，支持下载 SVG。',
    href: '/ugly-avatar',
    icon: Smile,
    category: 'Fun',
  },
  {
    id: 'bp-jwt',
    title: 'Server JWT Token',
    description: '生成 Server API 鉴权用的 HS256 JWT Token，payload 包含毫秒时间戳 iat 和 key_name 字段。',
    href: '/bp-jwt',
    icon: KeyRound,
    category: 'BP Authentication',
  },
  {
    id: 'bp-sign',
    title: 'Client Sign',
    description: '使用 HmacSHA256 生成 Client API 请求签名，格式为 digest,timestamp,keyId。',
    href: '/bp-sign',
    icon: ShieldCheck,
    category: 'BP Authentication',
  },
]

export const CATEGORIES: ToolCategory[] = ['Cryptography', 'Hash', 'Encoding', 'Text', 'Fun', 'BP Authentication']

export function getToolsByCategory(category: ToolCategory): ToolConfig[] {
  return TOOLS.filter((t) => t.category === category)
}
