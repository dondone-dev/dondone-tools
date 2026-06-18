import REGIONS from '../data/id-card-regions.json'

const regions = REGIONS as Record<string, string>

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

const CONSTELLATIONS = [
  { name: '摩羯座', until: [1, 19] },
  { name: '水瓶座', until: [2, 18] },
  { name: '双鱼座', until: [3, 20] },
  { name: '白羊座', until: [4, 19] },
  { name: '金牛座', until: [5, 20] },
  { name: '双子座', until: [6, 21] },
  { name: '巨蟹座', until: [7, 22] },
  { name: '狮子座', until: [8, 22] },
  { name: '处女座', until: [9, 22] },
  { name: '天秤座', until: [10, 23] },
  { name: '天蝎座', until: [11, 22] },
  { name: '射手座', until: [12, 21] },
  { name: '摩羯座', until: [12, 31] },
]

export type IdCardFailReason = 'empty' | 'length' | 'format' | 'birthdate' | 'checksum'

export interface IdCardRegion {
  code: string
  province?: string
  city?: string
  district?: string
  /** Cleanest available label, joined hierarchically e.g. "北京市 · 朝阳区" */
  full?: string
  /** True when the 6-digit code is not present in the bundled dataset */
  unknown: boolean
}

export interface IdCardResult {
  valid: boolean
  reason?: IdCardFailReason
  format: '18' | '15'
  normalized: string
  region: IdCardRegion
  birthDate: string | null
  age: number | null
  gender: 'male' | 'female' | null
  zodiac: string | null
  constellation: string | null
  /** Only meaningful for 18-digit cards (15-digit cards have no check digit) */
  checksum: { expected: string; actual: string; ok: boolean } | null
}

export function computeCheckDigit(first17: string): string {
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += Number(first17[i]) * WEIGHTS[i]
  }
  return CHECK_CODES[sum % 11]
}

function getZodiac(year: number): string {
  // 1900 is 鼠 (index 0)
  return ZODIACS[(((year - 1900) % 12) + 12) % 12]
}

function getConstellation(month: number, day: number): string {
  for (const c of CONSTELLATIONS) {
    if (month < c.until[0] || (month === c.until[0] && day <= c.until[1])) {
      return c.name
    }
  }
  return '摩羯座'
}

function lookupRegion(code: string): IdCardRegion {
  const provinceCode = code.slice(0, 2) + '0000'
  const cityCode = code.slice(0, 4) + '00'

  const province = regions[provinceCode]
  const cityFull = regions[cityCode]
  const districtFull = regions[code]

  const strip = (value: string | undefined, prefix: string | undefined) =>
    value && prefix && value.startsWith(prefix) ? value.slice(prefix.length) : null

  const cityRaw = strip(cityFull, province) ?? cityFull
  // Municipalities (北京/上海/天津/重庆) expose a placeholder "市辖区"/"县" city level — drop it as noise.
  const city = cityRaw === '市辖区' || cityRaw === '县' ? undefined : cityRaw

  const district = strip(districtFull, cityFull) ?? strip(districtFull, province) ?? districtFull

  const segments = [province, city, district].filter((s): s is string => Boolean(s))

  return {
    code,
    province,
    city,
    district,
    full: segments.length ? segments.join(' · ') : undefined,
    unknown: !districtFull,
  }
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

function computeAge(year: number, month: number, day: number): number {
  const now = new Date()
  let age = now.getFullYear() - year
  const m = now.getMonth() + 1
  const dd = now.getDate()
  if (m < month || (m === month && dd < day)) age--
  return age
}

function fail(reason: IdCardFailReason, format: '18' | '15', normalized: string): IdCardResult {
  return {
    valid: false,
    reason,
    format,
    normalized,
    region: { code: '', unknown: true },
    birthDate: null,
    age: null,
    gender: null,
    zodiac: null,
    constellation: null,
    checksum: null,
  }
}

export function parseIdCard(raw: string): IdCardResult {
  const normalized = raw.trim().replace(/\s/g, '').toUpperCase()
  const format: '18' | '15' = normalized.length === 15 ? '15' : '18'

  if (!normalized) return fail('empty', format, normalized)
  if (normalized.length !== 15 && normalized.length !== 18) {
    return fail('length', format, normalized)
  }

  const pattern = format === '18' ? /^\d{17}[\dX]$/ : /^\d{15}$/
  if (!pattern.test(normalized)) return fail('format', format, normalized)

  const regionCode = normalized.slice(0, 6)
  let year: number
  let month: number
  let day: number
  let genderDigit: number

  if (format === '18') {
    year = Number(normalized.slice(6, 10))
    month = Number(normalized.slice(10, 12))
    day = Number(normalized.slice(12, 14))
    genderDigit = Number(normalized[16])
  } else {
    year = 1900 + Number(normalized.slice(6, 8))
    month = Number(normalized.slice(8, 10))
    day = Number(normalized.slice(10, 12))
    genderDigit = Number(normalized[14])
  }

  if (!isRealDate(year, month, day)) return fail('birthdate', format, normalized)

  let checksum: IdCardResult['checksum'] = null
  if (format === '18') {
    const expected = computeCheckDigit(normalized.slice(0, 17))
    const actual = normalized[17]
    checksum = { expected, actual, ok: expected === actual }
    if (!checksum.ok) {
      const result = fail('checksum', format, normalized)
      result.checksum = checksum
      result.region = lookupRegion(regionCode)
      result.birthDate = formatDate(year, month, day)
      return result
    }
  }

  const birthDate = formatDate(year, month, day)

  return {
    valid: true,
    format,
    normalized,
    region: lookupRegion(regionCode),
    birthDate,
    age: computeAge(year, month, day),
    gender: genderDigit % 2 === 1 ? 'male' : 'female',
    zodiac: getZodiac(year),
    constellation: getConstellation(month, day),
    checksum,
  }
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
