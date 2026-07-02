export interface StringLengthStats {
  length1: number
  length2: number
  chinese: number
  letters: number
  digits: number
  spaces: number
  halfWidth: number
  fullWidth: number
  newlines: number
  totalLines: number
}

function isChinese(char: string): boolean {
  return /\p{Script=Han}/u.test(char)
}

function isLetter(char: string): boolean {
  return /\p{Letter}/u.test(char) && !isChinese(char)
}

function isAsciiDigit(char: string): boolean {
  return /^[0-9]$/u.test(char)
}

function isSpace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\u3000'
}

function isFullWidthCodePoint(codePoint: number): boolean {
  if (Number.isNaN(codePoint)) return false
  return (
    codePoint >= 0x1100 && (
      codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0x3247 && codePoint !== 0x303f) ||
      (codePoint >= 0x3250 && codePoint <= 0x4dbf) ||
      (codePoint >= 0x4e00 && codePoint <= 0xa4c6) ||
      (codePoint >= 0xa960 && codePoint <= 0xa97c) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6b) ||
      (codePoint >= 0xff01 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x1b000 && codePoint <= 0x1b001) ||
      (codePoint >= 0x1f200 && codePoint <= 0x1f251) ||
      (codePoint >= 0x20000 && codePoint <= 0x3fffd)
    )
  )
}

interface Token {
  type: 'newline' | 'char'
  value: string
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (let index = 0; index < text.length;) {
    const char = text[index]
    if (char === '\r') {
      if (text[index + 1] === '\n') {
        tokens.push({ type: 'newline', value: '\r\n' })
        index += 2
      } else {
        tokens.push({ type: 'newline', value: '\r' })
        index += 1
      }
      continue
    }
    if (char === '\n') {
      tokens.push({ type: 'newline', value: '\n' })
      index += 1
      continue
    }
    const codePoint = text.codePointAt(index)!
    const value = String.fromCodePoint(codePoint)
    tokens.push({ type: 'char', value })
    index += value.length
  }
  return tokens
}

export function analyzeText(text: string): StringLengthStats {
  const tokens = tokenize(String(text ?? ''))
  const stats: StringLengthStats = {
    length1: 0, length2: 0, chinese: 0, letters: 0, digits: 0,
    spaces: 0, halfWidth: 0, fullWidth: 0, newlines: 0, totalLines: 0,
  }

  for (const token of tokens) {
    if (token.type === 'newline') {
      stats.newlines += 1
      stats.halfWidth += 1
      continue
    }
    const char = token.value
    stats.length1 += 1
    stats.length2 += isFullWidthCodePoint(char.codePointAt(0)!) ? 2 : 1
    if (isChinese(char)) stats.chinese += 1
    if (isLetter(char)) stats.letters += 1
    if (isAsciiDigit(char)) stats.digits += 1
    if (isSpace(char)) stats.spaces += 1
    if (isFullWidthCodePoint(char.codePointAt(0)!)) {
      stats.fullWidth += 1
    } else {
      stats.halfWidth += 1
    }
  }

  stats.totalLines = tokens.length === 0 ? 0 : stats.newlines + 1
  return stats
}
