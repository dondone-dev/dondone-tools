import {
  Lock,
  Hash,
  FileCode,
  QrCode,
  Type,
  ArrowLeftRight,
  Braces,
  Smile,
  KeyRound,
  ShieldCheck,
  Clock,
  Link,
  KeySquare,
  type LucideIcon,
} from 'lucide-react'
import { type ToolRoute } from '@/lib/routes'

export interface ToolConfig {
  id: string
  title: string
  descriptionKey: string
  href: ToolRoute
  icon: LucideIcon
  category: ToolCategory
}

export type ToolCategory = 'Cryptography' | 'Security' | 'Hash' | 'Encoding' | 'Text' | 'Fun' | 'BP Authentication'

export const TOOLS: ToolConfig[] = [
  {
    id: 'aes',
    title: 'AES',
    descriptionKey: 'aes.description',
    href: '/crypto/aes',
    icon: Lock,
    category: 'Cryptography',
  },
  {
    id: 'jwt-decode',
    title: 'JWT Decoder',
    descriptionKey: 'jwt-decode.description',
    href: '/crypto/jwt',
    icon: KeySquare,
    category: 'Cryptography',
  },
  {
    id: 'md5',
    title: 'MD5',
    descriptionKey: 'md5.description',
    href: '/hash/md5',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'sha2',
    title: 'SHA-2',
    descriptionKey: 'sha2.description',
    href: '/hash/sha2',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'sha3',
    title: 'SHA-3',
    descriptionKey: 'sha3.description',
    href: '/hash/sha3',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'blake',
    title: 'BLAKE',
    descriptionKey: 'blake.description',
    href: '/hash/blake',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'xxhash3',
    title: 'xxHash3',
    descriptionKey: 'xxhash3.description',
    href: '/hash/xxhash3',
    icon: Hash,
    category: 'Hash',
  },
  {
    id: 'base64',
    title: 'Base64',
    descriptionKey: 'base64.description',
    href: '/encoding/base64',
    icon: FileCode,
    category: 'Encoding',
  },
  {
    id: 'base64-image',
    title: 'Base64 Image',
    descriptionKey: 'base64-image.description',
    href: '/encoding/base64-image',
    icon: FileCode,
    category: 'Encoding',
  },
  {
    id: 'base58',
    title: 'Base58',
    descriptionKey: 'base58.description',
    href: '/encoding/base58',
    icon: FileCode,
    category: 'Encoding',
  },
  {
    id: 'qrcode',
    title: 'QR Code',
    descriptionKey: 'qrcode.description',
    href: '/encoding/qrcode',
    icon: QrCode,
    category: 'Encoding',
  },
  {
    id: 'url-encode',
    title: 'URL Encode',
    descriptionKey: 'url-encode.description',
    href: '/encoding/url',
    icon: Link,
    category: 'Encoding',
  },
  {
    id: 'text-diff',
    title: 'Text Diff',
    descriptionKey: 'text-diff.description',
    href: '/text/diff',
    icon: ArrowLeftRight,
    category: 'Text',
  },
  {
    id: 'json-format',
    title: 'JSON Format',
    descriptionKey: 'json-format.description',
    href: '/text/json-format',
    icon: Braces,
    category: 'Text',
  },
  {
    id: 'string-length',
    title: 'String Length',
    descriptionKey: 'string-length.description',
    href: '/text/string-length',
    icon: Type,
    category: 'Text',
  },
  {
    id: 'timestamp',
    title: 'Timestamp',
    descriptionKey: 'timestamp.description',
    href: '/text/timestamp',
    icon: Clock,
    category: 'Text',
  },
  {
    id: 'password-strength',
    title: 'Password Strength',
    descriptionKey: 'password-strength.description',
    href: '/security/password-strength',
    icon: ShieldCheck,
    category: 'Security',
  },
  {
    id: 'ugly-avatar',
    title: 'Ugly Avatar',
    descriptionKey: 'ugly-avatar.description',
    href: '/fun/ugly-avatar',
    icon: Smile,
    category: 'Fun',
  },
  {
    id: 'bp-jwt',
    title: 'Server JWT Token',
    descriptionKey: 'bp-jwt.description',
    href: '/bp/jwt',
    icon: KeyRound,
    category: 'BP Authentication',
  },
  {
    id: 'bp-sign',
    title: 'Client Sign',
    descriptionKey: 'bp-sign.description',
    href: '/bp/sign',
    icon: ShieldCheck,
    category: 'BP Authentication',
  },
]

export const CATEGORIES: ToolCategory[] = ['Cryptography', 'Security', 'Hash', 'Encoding', 'Text', 'Fun', 'BP Authentication']

export function getToolsByCategory(category: ToolCategory): ToolConfig[] {
  return TOOLS.filter((t) => t.category === category)
}
