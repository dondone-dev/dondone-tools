export interface BirthCountry {
  code: string
  name: string
  region: string
  births: number
  birthRate?: number
  year: number
  source: string
  flagCode: string
}

export interface BirthDataset {
  year: number
  source: string
  countries: BirthCountry[]
}

export interface PreparedBirthCountry extends BirthCountry {
  cumulativeBirths: number
  probability: number
}

export type BirthRarityTier = 'common' | 'uncommon' | 'rare' | 'ultra-rare'

export interface BirthRarityInfo {
  tier: BirthRarityTier
  badgeKey: string
  badgeClass: string
}

export function getBirthRarity(probability: number): BirthRarityInfo {
  if (probability >= 0.05) {
    return {
      tier: 'common',
      badgeKey: 'birthSimulator.rarity.common',
      badgeClass: 'border-slate-300/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
    }
  }
  if (probability >= 0.01) {
    return {
      tier: 'uncommon',
      badgeKey: 'birthSimulator.rarity.uncommon',
      badgeClass: 'border-blue-300/80 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    }
  }
  if (probability >= 0.001) {
    return {
      tier: 'rare',
      badgeKey: 'birthSimulator.rarity.rare',
      badgeClass: 'border-purple-300/80 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    }
  }
  return {
    tier: 'ultra-rare',
    badgeKey: 'birthSimulator.rarity.ultraRare',
    badgeClass: 'border-amber-300/80 bg-amber-50 text-amber-700 dark:border-amber-700/80 dark:bg-amber-950/60 dark:text-amber-300',
  }
}

export interface BirthDistribution {
  year: number
  source: string
  countries: PreparedBirthCountry[]
  totalBirths: number
}

export function prepareBirthDistribution(dataset: BirthDataset): BirthDistribution {
  if (!dataset || !Array.isArray(dataset.countries) || dataset.countries.length === 0) {
    throw new Error('Birth dataset must contain at least one country')
  }

  const codes = new Set<string>()
  let totalBirths = 0

  for (const country of dataset.countries) {
    if (!country.code || codes.has(country.code)) {
      throw new Error(`Duplicate or missing country code: ${country.code || '(empty)'}`)
    }
    if (!Number.isFinite(country.births) || country.births <= 0) {
      throw new Error(`Invalid birth count for ${country.code}`)
    }
    if (!country.name || !country.region || !country.flagCode) {
      throw new Error(`Incomplete country data for ${country.code}`)
    }
    codes.add(country.code)
    totalBirths += country.births
  }

  if (!Number.isFinite(totalBirths) || totalBirths <= 0) {
    throw new Error('Birth dataset total must be positive')
  }

  let cumulativeBirths = 0
  const countries = dataset.countries.map((country) => {
    cumulativeBirths += country.births
    return {
      ...country,
      cumulativeBirths,
      probability: country.births / totalBirths,
    }
  })

  return {
    year: dataset.year,
    source: dataset.source,
    countries,
    totalBirths,
  }
}

export function pickBirthCountry(
  distribution: BirthDistribution,
  random: () => number = Math.random,
): PreparedBirthCountry {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error('Random value must be in the range [0, 1)')
  }

  const target = value * distribution.totalBirths
  return distribution.countries.find((country) => target < country.cumulativeBirths)
    ?? distribution.countries[distribution.countries.length - 1]
}

export function formatBirthCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

export function formatBirthProbability(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: value < 0.01 ? 2 : 1,
  }).format(value)
}

export function formatBirthOdds(probability: number, locale: string): string {
  if (!Number.isFinite(probability) || probability <= 0) {
    throw new Error('Probability must be positive')
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(1 / probability)
}
