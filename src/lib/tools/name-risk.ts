export type Severity = 'red' | 'yellow' | 'info'
export type MatchType = 'hash' | 'rare_char' | 'trendy_char' | 'folk_taboo' | 'generation' | 'compound_surname'

export interface NameRiskFinding {
  severity: Severity
  category: string
  matchType: MatchType
  matchedChars?: string[]
  confidence: string
}

export interface NameRiskResult {
  name: string
  findings: NameRiskFinding[]
  worstSeverity: Severity | null
}

// ── Data shapes (as stored in JSON) ──────────────────────────────────────────

interface HashEntry {
  hash: string
  severity: Severity
  categories: string[]
  tags: string[]
  confidence: string
}

interface CharEntry {
  char: string
  tags: string[]
  confidence: string
}

interface NameEntry {
  name: string
  tags: string[]
  confidence: string
}

interface SurnameEntry {
  surnamePart: string
  tags: string[]
  confidence: string
}

export interface NameRiskMeta {
  generatedAt: string
  entryCount: number
}

export interface NameRiskData {
  meta: NameRiskMeta
  hashes: { entries: HashEntry[] }
  rareChars: { characters: CharEntry[] }
  trendyChars: { characters: CharEntry[] }
  folkTaboo: { characters: CharEntry[] }
  generationTrends: { names: NameEntry[] }
  compoundSurnames: {
    knownTraditionalCompoundSurnames: string[]
    examples: SurnameEntry[]
  }
}

// ── Normalization (mirrors Go logic) ─────────────────────────────────────────

export function normalizeName(input: string): string {
  let s = input.trim()
  // Remove all Unicode whitespace
  s = s.replace(/\s+/gu, '')
  // Fullwidth ASCII → halfwidth (U+FF01..U+FF5E → U+0021..U+007E)
  s = s.replace(/[！-～]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xff01 + 0x21),
  )
  return s
}

// ── SHA-256 via Web Crypto ────────────────────────────────────────────────────

export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Severity ranking ──────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = { red: 2, yellow: 1, info: 0 }

function maxSeverity(a: Severity | null, b: Severity): Severity {
  if (a === null) return b
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b
}

// ── Main check ────────────────────────────────────────────────────────────────

export async function checkName(
  rawName: string,
  data: NameRiskData,
): Promise<NameRiskResult> {
  const name = normalizeName(rawName)
  const findings: NameRiskFinding[] = []

  if (!name) return { name: rawName, findings: [], worstSeverity: null }

  // 1. SHA-256 hash match
  const hash = await sha256Hex(name)
  const hashHit = data.hashes.entries.find((e) => e.hash === hash)
  if (hashHit) {
    for (const cat of hashHit.categories) {
      findings.push({
        severity: hashHit.severity,
        category: cat,
        matchType: 'hash',
        confidence: hashHit.confidence,
      })
    }
  }

  const chars = Array.from(name)

  // 2. Rare characters — per character
  for (const entry of data.rareChars.characters) {
    if (chars.includes(entry.char)) {
      findings.push({
        severity: 'yellow',
        category: 'rare_character_risk',
        matchType: 'rare_char',
        matchedChars: [entry.char],
        confidence: entry.confidence,
      })
    }
  }

  // 3. Trendy name characters — count matches, severity depends on count
  const trendyHits: string[] = []
  for (const entry of data.trendyChars.characters) {
    if (chars.includes(entry.char) && !trendyHits.includes(entry.char)) {
      trendyHits.push(entry.char)
    }
  }
  if (trendyHits.length > 0) {
    findings.push({
      severity: trendyHits.length >= 2 ? 'yellow' : 'info',
      category: 'trendy_name_character',
      matchType: 'trendy_char',
      matchedChars: trendyHits,
      confidence: 'high',
    })
  }

  // 4. Folk taboo characters — per character (info only)
  const folkHits: string[] = []
  for (const entry of data.folkTaboo.characters) {
    if (chars.includes(entry.char) && !folkHits.includes(entry.char)) {
      folkHits.push(entry.char)
    }
  }
  if (folkHits.length > 0) {
    findings.push({
      severity: 'info',
      category: 'folk_naming_taboo_character',
      matchType: 'folk_taboo',
      matchedChars: folkHits,
      confidence: 'low',
    })
  }

  // 5. Generational name trends — substring match
  const genHits: string[] = []
  for (const entry of data.generationTrends.names) {
    if (name.includes(entry.name) && !genHits.includes(entry.name)) {
      genHits.push(entry.name)
    }
  }
  if (genHits.length > 0) {
    findings.push({
      severity: 'info',
      category: 'generation_association',
      matchType: 'generation',
      matchedChars: genHits,
      confidence: 'medium',
    })
  }

  // 6. Compound surname — check prefix against known lists
  if (name.length >= 3) {
    const prefix2 = name.slice(0, 2)

    const isTraditional = data.compoundSurnames.knownTraditionalCompoundSurnames.includes(prefix2)
    const isSuspected = !isTraditional && data.compoundSurnames.examples.some(
      (e) => e.surnamePart === prefix2,
    )

    if (isTraditional) {
      findings.push({
        severity: 'info',
        category: 'compound_surname_risk',
        matchType: 'compound_surname',
        matchedChars: [prefix2],
        confidence: 'high',
      })
    } else if (isSuspected) {
      findings.push({
        severity: 'yellow',
        category: 'compound_surname_risk',
        matchType: 'compound_surname',
        matchedChars: [prefix2],
        confidence: 'medium',
      })
    }
  }

  const worstSeverity = findings.reduce<Severity | null>(
    (acc, f) => maxSeverity(acc, f.severity),
    null,
  )

  return { name, findings, worstSeverity }
}
