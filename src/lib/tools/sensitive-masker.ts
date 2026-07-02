export type MaskerMode = 'dev' | 'privacy' | 'log' | 'all'

export interface PatternDef {
  id: string
  label: string
  modes: MaskerMode[]
  re: RegExp
  mask: (m: string) => string
}

export interface MaskStat {
  patternId: string
  label: string
  count: number
  originalChars: number
}

export interface MaskResult {
  output: string
  stats: MaskStat[]
  totalCount: number
}

function keep(s: string, pre: number, suf: number): string {
  if (s.length <= pre + suf + 2) return s.slice(0, Math.min(pre, s.length)) + '****'
  return s.slice(0, pre) + '****' + (suf > 0 ? s.slice(-suf) : '')
}

function maskEmail(m: string): string {
  const at = m.lastIndexOf('@')
  if (at < 0) return '****'
  return keep(m.slice(0, at), Math.min(2, at), 0) + m.slice(at)
}

function maskHostnameLabels(host: string): string {
  const parts = host.split('.')
  if (parts.length <= 2) return host
  const keepCount = parts.length <= 4 ? 2 : 4
  const toMask = parts.length - keepCount
  return parts.map((p, i) => (i < toMask ? keep(p, 4, 0) : p)).join('.')
}

function maskDbUrl(m: string): string {
  let result = m.replace(/(\/\/[^:@\s]*:)([^@\s"']+)(@)/, (_, pre, pwd, at) => pre + keep(pwd, 2, 2) + at)
  result = result.replace(/(@)([^:/\s"',)]+)/, (_, at, host) => at + maskHostnameLabels(host))
  result = result.replace(/\/([a-zA-Z_][a-zA-Z0-9_]{2,})(\?.*)?$/, (_, db, qs) => '/' + keep(db, 3, 3) + (qs ?? ''))
  return result
}

function maskContextField(m: string, pre: number, suf: number): string {
  return m.replace(/([=:]\s*["']?)([^\s"',;\n}\]]{4,})/, (_, pfx, val) => pfx + keep(val, pre, suf))
}

const WEBHOOK_HOSTS = ['hooks.slack.com', 'discord.com', 'discordapp.com']

function maskUrlInField(m: string): string {
  const urlMatch = m.match(/(https?:\/\/)([^:/?\s"',;\n}\]]+)(\/[^\s"',;\n}\]]*)?/)
  if (!urlMatch) return m
  const [, scheme, host, path] = urlMatch
  if (WEBHOOK_HOSTS.some(wh => host === wh || host.endsWith('.' + wh))) {
    const fullUrl = scheme + host + (path || '')
    const prefix = m.slice(0, m.indexOf(scheme))
    return prefix + keep(fullUrl, 40, 4)
  }
  return m.replace(/(https?:\/\/)([^:/?\s"',;\n}\]]+)/, (_, s, h) => {
    const labels = h.split('.')
    if (labels.length <= 1) return s + keep(h, 4, 0)
    const tld = labels[labels.length - 1]
    const pfx = labels.slice(0, labels.length - 1).join('.')
    return s + keep(pfx, 4, 0) + '.' + tld
  })
}

const DLA: MaskerMode[] = ['dev', 'log', 'all']
const PA: MaskerMode[] = ['privacy', 'all']
const LPA: MaskerMode[] = ['log', 'privacy', 'all']

export const PATTERNS: PatternDef[] = [
  // ── AWS ──────────────────────────────────────────────────────────────────
  {
    id: 'aws-ak',
    label: 'AWS Access Key ID',
    modes: DLA,
    re: /\bAKIA[0-9A-Z]{16}\b/g,
    mask: m => keep(m, 4, 4),
  },
  {
    id: 'aws-sk',
    label: 'AWS Secret Access Key',
    modes: DLA,
    re: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY|SecretAccessKey)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/g,
    mask: m => m.replace(/([=:]\s*["']?)([A-Za-z0-9/+=]{40})(["']?)\s*$/, (_, pre, key, post) => pre + keep(key, 4, 4) + post),
  },
  // ── OpenAI ───────────────────────────────────────────────────────────────
  {
    id: 'openai-key',
    label: 'OpenAI Key',
    modes: DLA,
    re: /\bsk-(?:proj-|svcacct-)?[a-zA-Z0-9_-]{20,}\b/g,
    mask: m => keep(m, 6, 4),
  },
  // ── GitHub ───────────────────────────────────────────────────────────────
  {
    id: 'github-token',
    label: 'GitHub Token',
    modes: DLA,
    re: /\bgh[pousr]_[0-9a-zA-Z]{36,}\b/g,
    mask: m => keep(m, 6, 4),
  },
  {
    id: 'github-pat',
    label: 'GitHub PAT',
    modes: DLA,
    re: /\bgithub_pat_[0-9a-zA-Z_]{82}\b/g,
    mask: m => keep(m, 10, 4),
  },
  // ── GitLab ───────────────────────────────────────────────────────────────
  {
    id: 'gitlab-token',
    label: 'GitLab Token',
    modes: DLA,
    re: /\bglpat-[0-9a-zA-Z_-]{20}\b/g,
    mask: m => keep(m, 6, 4),
  },
  // ── NPM ──────────────────────────────────────────────────────────────────
  {
    id: 'npm-token',
    label: 'NPM Token',
    modes: DLA,
    re: /\bnpm_[a-zA-Z0-9]{36}\b/g,
    mask: m => keep(m, 6, 4),
  },
  // ── Stripe ───────────────────────────────────────────────────────────────
  {
    id: 'stripe-key',
    label: 'Stripe Key',
    modes: DLA,
    re: /\b(?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}\b/g,
    mask: m => keep(m, 8, 4),
  },
  // ── Slack ─────────────────────────────────────────────────────────────────
  {
    id: 'slack-token',
    label: 'Slack Token',
    modes: DLA,
    re: /\bxox[baprs]-(?:\d+-)+[a-zA-Z0-9]+\b/g,
    mask: m => keep(m, 8, 4),
  },
  {
    id: 'slack-webhook',
    label: 'Slack Webhook',
    modes: DLA,
    re: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]+\/B[0-9A-Z]+\/[a-zA-Z0-9]+/g,
    mask: m => keep(m, 40, 4),
  },
  // ── Discord ──────────────────────────────────────────────────────────────
  {
    id: 'discord-webhook',
    label: 'Discord Webhook',
    modes: DLA,
    re: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+/g,
    mask: m => keep(m, 42, 4),
  },
  // ── Telegram ─────────────────────────────────────────────────────────────
  {
    id: 'telegram-bot',
    label: 'Telegram Bot Token',
    modes: DLA,
    re: /(?<!\w)\d{8,10}:[a-zA-Z0-9_-]{35}(?!\w)/g,
    mask: m => {
      const c = m.indexOf(':')
      return m.slice(0, c + 1) + keep(m.slice(c + 1), 4, 4)
    },
  },
  // ── SendGrid ──────────────────────────────────────────────────────────────
  {
    id: 'sendgrid',
    label: 'SendGrid Key',
    modes: DLA,
    re: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/g,
    mask: m => keep(m, 6, 4),
  },
  // ── HashiCorp Vault ───────────────────────────────────────────────────────
  {
    id: 'vault-token',
    label: 'Vault Token',
    modes: DLA,
    re: /\bhvs\.[a-zA-Z0-9_-]{20,}\b/g,
    mask: m => keep(m, 6, 4),
  },
  // ── HuggingFace ───────────────────────────────────────────────────────────
  {
    id: 'huggingface',
    label: 'HuggingFace Token',
    modes: DLA,
    re: /\bhf_[a-zA-Z0-9]{34}\b/g,
    mask: m => keep(m, 5, 4),
  },
  // ── DigitalOcean ─────────────────────────────────────────────────────────
  {
    id: 'digitalocean',
    label: 'DigitalOcean Token',
    modes: DLA,
    re: /\bdop_v1_[a-zA-Z0-9]{64}\b/g,
    mask: m => keep(m, 8, 4),
  },
  // ── Firebase / Google ─────────────────────────────────────────────────────
  {
    id: 'firebase-key',
    label: 'Firebase/Google Key',
    modes: DLA,
    re: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    mask: m => keep(m, 6, 4),
  },
  // ── Alibaba Cloud ─────────────────────────────────────────────────────────
  {
    id: 'alibaba-ak',
    label: 'Alibaba Cloud AK',
    modes: DLA,
    re: /\bLTAI[0-9A-Za-z]{16,20}\b/g,
    mask: m => keep(m, 6, 4),
  },
  // ── Tencent Cloud ─────────────────────────────────────────────────────────
  {
    id: 'tencent-secretid',
    label: 'Tencent Cloud SecretId',
    modes: DLA,
    re: /\bAKID[0-9A-Za-z]{32}\b/g,
    mask: m => keep(m, 6, 4),
  },
  // ── JWT ───────────────────────────────────────────────────────────────────
  {
    id: 'jwt',
    label: 'JWT Token',
    modes: DLA,
    re: /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*/g,
    mask: m => {
      const parts = m.split('.')
      return parts.map((p, i) => (i < 2 ? keep(p, 4, 0) : '****')).join('.')
    },
  },
  // ── Bearer / Basic Auth ───────────────────────────────────────────────────
  {
    id: 'bearer-token',
    label: 'Bearer Token',
    modes: DLA,
    re: /\bBearer\s+[a-zA-Z0-9_\-.+/=]{8,}/g,
    mask: m => 'Bearer ' + keep(m.replace(/^Bearer\s+/, ''), 4, 4),
  },
  {
    id: 'basic-auth',
    label: 'Basic Auth',
    modes: DLA,
    re: /\bBasic\s+[a-zA-Z0-9+/=]{8,}/g,
    mask: m => 'Basic ' + keep(m.replace(/^Basic\s+/, ''), 4, 4),
  },
  // ── Database Connection URLs ──────────────────────────────────────────────
  {
    id: 'db-postgres',
    label: 'PostgreSQL URL',
    modes: DLA,
    re: /postgres(?:ql)?:\/\/[^:@/\s]+:[^@\s"']+@[^\s"',)]+/g,
    mask: maskDbUrl,
  },
  {
    id: 'db-mysql',
    label: 'MySQL URL',
    modes: DLA,
    re: /mysql(?:\+\w+)?:\/\/[^:@/\s]+:[^@\s"']+@[^\s"',)]+/g,
    mask: maskDbUrl,
  },
  {
    id: 'db-mongodb',
    label: 'MongoDB URL',
    modes: DLA,
    re: /mongodb(?:\+srv)?:\/\/[^:@/\s]+:[^@\s"']+@[^\s"',)]+/g,
    mask: maskDbUrl,
  },
  {
    id: 'db-redis',
    label: 'Redis URL',
    modes: DLA,
    re: /redis(?:s)?:\/\/(?:[^:@/\s]+:)?[^@\s"']+@[^\s"',)]+/g,
    mask: maskDbUrl,
  },
  // ── SSH / PEM Private Key ─────────────────────────────────────────────────
  {
    id: 'ssh-private-key',
    label: 'SSH/PEM Private Key',
    modes: DLA,
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    mask: () => '[PRIVATE KEY REDACTED]',
  },
  // ── Generic Field Patterns ────────────────────────────────────────────────
  {
    id: 'password-field',
    label: 'Password Field',
    modes: DLA,
    re: /\b(?:password|passwd|pwd)["']?\s*(?:=|:)\s*["']?([^\s"',;\n}\]]{4,})/gi,
    mask: m => maskContextField(m, 2, 2),
  },
  {
    id: 'secret-field',
    label: 'Secret Field',
    modes: DLA,
    // matches any field name that contains "secret" as a component: secret_key, key_secret, access_key_secret, etc.
    re: /\b(?:[a-zA-Z0-9_]+_)?secret(?:_[a-zA-Z0-9_]+)?["']?\s*(?:=|:)\s*["']?([^\s"',;\n}\]]{4,})/gi,
    mask: m => maskContextField(m, 2, 2),
  },
  {
    id: 'private-key-field',
    label: 'Private Key Field',
    modes: DLA,
    re: /\b(?:[a-zA-Z0-9_]+_)?private_key(?:_[a-zA-Z0-9_]+)?["']?\s*(?:=|:)\s*["']?([^\s"',;\n}\]]{4,})/gi,
    mask: m => maskContextField(m, 2, 2),
  },
  {
    id: 'token-field',
    label: 'Token Field',
    modes: DLA,
    re: /\b(?:access_token|refresh_token|auth_token|id_token)["']?\s*(?:=|:)\s*["']?([^\s"',;\n}\]]{8,})/gi,
    mask: m => maskContextField(m, 4, 4),
  },
  {
    id: 'api-key-field',
    label: 'API Key Field',
    modes: DLA,
    re: /\b(?:api[_-]?key|apikey|api[_-]?token|access_key(?:_id)?)["']?\s*(?:=|:)\s*["']?([^\s"',;\n}\]]{8,})/gi,
    mask: m => maskContextField(m, 4, 4),
  },
  {
    id: 'bucket-field',
    label: 'Bucket Name Field',
    modes: DLA,
    re: /\b(?:[a-zA-Z0-9_]+_)?bucket(?:_[a-zA-Z0-9_]+)?["']?\s*(?:=|:)\s*["']?([^\s"',;\n}\]]{4,})/gi,
    mask: m => maskContextField(m, 2, 4),
  },
  // ── URL Fields (internal hostnames in config values) ──────────────────────
  {
    id: 'url-field',
    label: 'URL Field',
    modes: DLA,
    // matches field names ending in host/url/uri/endpoint/gateway/address/server/callback, or those exact words
    re: /\b(?:host|url|uri|endpoint|gateway|address|server|callback|[a-zA-Z_][a-zA-Z0-9_]*(?:host|url|uri|endpoint|gateway|address|server|callback))["']?\s*(?:=|:)\s*["']?(https?:\/\/[^\s"',;\n}\]]+)/gi,
    mask: maskUrlInField,
  },
  // ── Lark / Feishu Space ID ────────────────────────────────────────────────
  {
    id: 'space-id',
    label: 'Space ID',
    modes: DLA,
    re: /\bSPACE[a-zA-Z0-9]{8,}\b/g,
    mask: m => keep(m, 5, 4),
  },
  // ── Cookie / Set-Cookie ───────────────────────────────────────────────────
  {
    id: 'cookie-header',
    label: 'Cookie Header',
    modes: DLA,
    re: /^(?:Cookie|Set-Cookie):\s*[^\r\n]+/gim,
    mask: m => {
      const colon = m.indexOf(':')
      const header = m.slice(0, colon + 1)
      const val = m.slice(colon + 1).trim()
      return header + ' ' + keep(val, 4, 4)
    },
  },
  // ── Email ─────────────────────────────────────────────────────────────────
  {
    id: 'email',
    label: 'Email Address',
    modes: DLA,
    re: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    mask: maskEmail,
  },
  // ── Phone (Chinese mobile) ────────────────────────────────────────────────
  {
    id: 'phone-cn',
    label: 'Phone Number',
    modes: DLA,
    re: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
    mask: m => keep(m, 3, 2),
  },
  // ── Privacy Tier ──────────────────────────────────────────────────────────
  {
    id: 'china-id',
    label: 'China ID Card',
    modes: PA,
    re: /\b[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g,
    mask: m => keep(m, 4, 4),
  },
  {
    id: 'bank-card',
    label: 'Bank Card Number',
    modes: PA,
    re: /(?<!\d)\d{16,19}(?!\d)/g,
    mask: m => keep(m, 4, 4),
  },
  {
    id: 'ip-address',
    label: 'IP Address',
    modes: LPA,
    re: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    mask: m => {
      const parts = m.split('.')
      return parts.slice(0, 2).join('.') + '.*.*'
    },
  },
  {
    id: 'mac-address',
    label: 'MAC Address',
    modes: LPA,
    re: /(?:[0-9a-fA-F]{2}[:\-]){5}[0-9a-fA-F]{2}/g,
    mask: m => {
      const sep = m.includes(':') ? ':' : '-'
      const parts = m.split(sep)
      return parts.slice(0, 2).join(sep) + `${sep}**${sep}**${sep}**`
    },
  },
]

interface RawMatch {
  start: number
  end: number
  original: string
  masked: string
  patternId: string
}

export function maskText(text: string, mode: MaskerMode): MaskResult {
  const active = PATTERNS.filter(p => p.modes.includes(mode))
  const allMatches: RawMatch[] = []

  for (const pat of active) {
    const re = new RegExp(pat.re.source, pat.re.flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      try {
        const original = m[0]
        const masked = pat.mask(original)
        if (masked !== original) {
          allMatches.push({ start: m.index, end: m.index + original.length, original, masked, patternId: pat.id })
        }
      } catch {
        // skip malformed match
      }
      if (m[0].length === 0) re.lastIndex++
    }
  }

  // Sort: earlier start wins; on tie, longer match wins
  allMatches.sort((a, b) => a.start - b.start || b.end - a.end)

  // Remove overlapping (keep first)
  const kept: RawMatch[] = []
  let lastEnd = -1
  for (const m of allMatches) {
    if (m.start >= lastEnd) {
      kept.push(m)
      lastEnd = m.end
    }
  }

  // Build output
  let output = ''
  let pos = 0
  for (const m of kept) {
    output += text.slice(pos, m.start) + m.masked
    pos = m.end
  }
  output += text.slice(pos)

  // Aggregate stats
  const statMap = new Map<string, { count: number; originalChars: number }>()
  for (const m of kept) {
    const e = statMap.get(m.patternId) ?? { count: 0, originalChars: 0 }
    e.count++
    e.originalChars += m.original.length
    statMap.set(m.patternId, e)
  }

  const labelMap = Object.fromEntries(PATTERNS.map(p => [p.id, p.label]))
  const stats: MaskStat[] = [...statMap.entries()].map(([id, s]) => ({
    patternId: id,
    label: labelMap[id] ?? id,
    count: s.count,
    originalChars: s.originalChars,
  }))

  return { output, stats, totalCount: kept.length }
}
