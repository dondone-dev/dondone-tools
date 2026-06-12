import tenKMostCommonRaw from '../data/passwords/10k-most-common.txt?raw'
import { SPLASHDATA_PASSWORDS } from '../data/passwords/splashdata'

export type PasswordStrengthLevel = 'empty' | 'weak' | 'medium' | 'strong' | 'very-strong'

export interface PasswordDatasetMatch {
  dataset: string
  source: 'SecLists' | 'SplashData'
  year?: number
  rank?: number
}

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel
  score: number
  segmentCount: number
  summary: string
  datasetMatches: PasswordDatasetMatch[]
  passedChecks: string[]
  warnings: string[]
  characterClasses: {
    lowercase: boolean
    uppercase: boolean
    digit: boolean
    symbol: boolean
  }
}

const TEN_K_PASSWORDS = new Set(
  tenKMostCommonRaw
    .split(/\r?\n/)
    .map((value) => normalizePassword(value))
    .filter(Boolean)
)

function normalizePassword(password: string): string {
  return String(password ?? '').trim().toLowerCase()
}

export function getSplashDataMatches(password: string): PasswordDatasetMatch[] {
  const normalized = normalizePassword(password)
  if (!normalized) return []
  return SPLASHDATA_PASSWORDS
    .filter((entry) => normalizePassword(entry.password) === normalized)
    .sort((a, b) => a.year - b.year || a.rank - b.rank)
    .map((entry) => ({
      dataset: `SplashData Worst Passwords ${entry.year} Top 25`,
      source: 'SplashData',
      year: entry.year,
      rank: entry.rank,
    }))
}

export function findCommonPasswordMatches(password: string): PasswordDatasetMatch[] {
  const normalized = normalizePassword(password)
  if (!normalized) return []
  const matches: PasswordDatasetMatch[] = []
  if (TEN_K_PASSWORDS.has(normalized)) {
    matches.push({ dataset: 'SecLists 10k-most-common.txt', source: 'SecLists' })
  }
  matches.push(...getSplashDataMatches(password))
  return matches
}

function getCharacterClasses(password: string) {
  return {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
}

function hasSequence(password: string): boolean {
  const normalized = normalizePassword(password)
  const sequences = [
    '0123456789',
    '9876543210',
    'abcdefghijklmnopqrstuvwxyz',
    'zyxwvutsrqponmlkjihgfedcba',
    'qwertyuiop',
    'poiuytrewq',
    'asdfghjkl',
    'lkjhgfdsa',
    'zxcvbnm',
    'mnbvcxz',
  ]
  return sequences.some((sequence) => {
    for (let size = 4; size <= Math.min(sequence.length, normalized.length); size += 1) {
      for (let index = 0; index <= sequence.length - size; index += 1) {
        if (normalized.includes(sequence.slice(index, index + size))) return true
      }
    }
    return false
  })
}

function hasRepeatedCharacters(password: string): boolean {
  return /(.)\1{2,}/.test(password)
}

function hasCommonYear(password: string): boolean {
  return /(?:19[5-9]\d|20[0-3]\d)/.test(password)
}

function scoreToLevel(score: number): Exclude<PasswordStrengthLevel, 'empty'> {
  if (score < 35) return 'weak'
  if (score < 60) return 'medium'
  if (score < 82) return 'strong'
  return 'very-strong'
}

function levelToSegments(level: PasswordStrengthLevel): number {
  if (level === 'empty') return 0
  if (level === 'weak') return 1
  if (level === 'medium') return 2
  if (level === 'strong') return 3
  return 4
}

function getSummary(level: PasswordStrengthLevel, hasDatasetMatch: boolean): string {
  if (level === 'empty') return 'pending'
  if (hasDatasetMatch) return 'compromised'
  if (level === 'weak') return 'weak'
  if (level === 'medium') return 'medium'
  if (level === 'strong') return 'strong'
  return 'very-strong'
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const value = String(password ?? '')
  const characterClasses = getCharacterClasses(value)
  const emptyResult: PasswordStrengthResult = {
    level: 'empty',
    score: 0,
    segmentCount: 0,
    summary: getSummary('empty', false),
    datasetMatches: [],
    passedChecks: [],
    warnings: [],
    characterClasses,
  }
  if (!value) return emptyResult

  const datasetMatches = findCommonPasswordMatches(value)
  const passedChecks: string[] = []
  const warnings: string[] = []

  const length = Array.from(value).length
  if (length >= 12) passedChecks.push('len12')
  else if (length < 8) warnings.push('too-short')
  else warnings.push('not-min-len')

  const classCount = Object.values(characterClasses).filter(Boolean).length
  if (characterClasses.lowercase) passedChecks.push('lowercase')
  if (characterClasses.uppercase) passedChecks.push('uppercase')
  if (characterClasses.digit) passedChecks.push('digit')
  if (characterClasses.symbol) passedChecks.push('symbol')
  if (classCount < 3) warnings.push('few-types')

  const repeated = hasRepeatedCharacters(value)
  const sequence = hasSequence(value)
  const commonYear = hasCommonYear(value)
  if (repeated) warnings.push('repeated')
  if (sequence) warnings.push('sequential')
  if (commonYear) warnings.push('year')

  if (datasetMatches.length > 0) {
    return {
      level: 'weak',
      score: 0,
      segmentCount: 1,
      summary: getSummary('weak', true),
      datasetMatches,
      passedChecks,
      warnings,
      characterClasses,
    }
  }

  let score = 0
  if (length >= 16) score += 42
  else if (length >= 12) score += 34
  else if (length >= 8) score += 22
  else score += Math.max(6, length * 2)

  score += classCount * 9
  if (length >= 20) score += 8
  if (classCount === 4 && length >= 12) score += 8
  if (classCount === 1) score -= 18
  if (/^[A-Za-z]+$/.test(value) || /^[0-9]+$/.test(value)) score -= 12
  if (repeated) score -= 8
  if (sequence) score -= 12
  if (commonYear) score -= 6

  score = Math.max(0, Math.min(100, score))
  const level = scoreToLevel(score)
  return {
    level,
    score,
    segmentCount: levelToSegments(level),
    summary: getSummary(level, false),
    datasetMatches,
    passedChecks,
    warnings,
    characterClasses,
  }
}
