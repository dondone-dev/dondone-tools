// Convert a yuan amount to the formal Chinese uppercase currency form used on
// official receipts, e.g. 2667.27 → 贰仟陆佰陆拾柒圆贰角柒分.

const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const SMALL_UNITS = ['', '拾', '佰', '仟']
const SECTION_UNITS = ['', '万', '亿', '兆']

/** Convert a 0–9999 section to Chinese, collapsing internal zero runs. */
function sectionToChinese(section: number): string {
  let result = ''
  let zeroPending = false
  let started = false
  for (let pos = 3; pos >= 0; pos--) {
    const digit = Math.floor(section / 10 ** pos) % 10
    if (digit === 0) {
      if (started) zeroPending = true
    } else {
      if (zeroPending) result += DIGITS[0]
      result += DIGITS[digit] + SMALL_UNITS[pos]
      zeroPending = false
      started = true
    }
  }
  return result
}

function integerToChinese(intPart: number): string {
  if (intPart === 0) return DIGITS[0]
  const sections: number[] = []
  let n = intPart
  while (n > 0) {
    sections.push(n % 10000)
    n = Math.floor(n / 10000)
  }
  let result = ''
  for (let s = sections.length - 1; s >= 0; s--) {
    const sec = sections[s]
    if (sec === 0) {
      // insert a single 零 only when a lower non-zero section still follows
      const hasLowerNonZero = sections.slice(0, s).some((v) => v > 0)
      if (result && hasLowerNonZero && !result.endsWith(DIGITS[0])) result += DIGITS[0]
    } else {
      // pad with 零 when the leading digit of a lower section is missing
      if (result && sec < 1000 && !result.endsWith(DIGITS[0])) result += DIGITS[0]
      result += sectionToChinese(sec) + SECTION_UNITS[s]
    }
  }
  return result
}

/**
 * Format `amount` (yuan) as formal Chinese currency. Rounds to 2 decimals.
 * Examples: 100 → 壹佰圆整 · 2667.27 → 贰仟陆佰陆拾柒圆贰角柒分 · 1000.5 → 壹仟圆伍角整.
 */
export function toChineseCurrency(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return ''
  const cents = Math.round(amount * 100)
  const intPart = Math.floor(cents / 100)
  const jiao = Math.floor((cents % 100) / 10)
  const fen = cents % 10

  const yuanStr = `${integerToChinese(intPart)}圆`
  if (jiao === 0 && fen === 0) return `${yuanStr}整`

  let decimal = ''
  if (jiao > 0) decimal += `${DIGITS[jiao]}角`
  else if (fen > 0) decimal += DIGITS[0] // 零 between 圆 and 分 when 角 is zero
  if (fen > 0) decimal += `${DIGITS[fen]}分`
  else decimal += '整' // whole 角, no 分

  return yuanStr + decimal
}
