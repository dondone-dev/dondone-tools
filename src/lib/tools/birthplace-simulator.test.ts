import { describe, expect, it } from 'vitest'
import {
  formatBirthCount,
  formatBirthOdds,
  formatBirthProbability,
  getBirthRarity,
  pickBirthCountry,
  prepareBirthDistribution,
  type BirthDataset,
} from './birthplace-simulator'

const dataset = (countries: BirthDataset['countries']): BirthDataset => ({
  year: 2023,
  source: 'test',
  countries,
})

const country = (code: string, births: number) => ({
  code,
  name: code,
  region: 'Test',
  births,
  year: 2023,
  source: 'test',
  flagCode: code,
})

describe('prepareBirthDistribution', () => {
  it('builds cumulative weights and probabilities', () => {
    const distribution = prepareBirthDistribution(dataset([country('aa', 9), country('bb', 1)]))

    expect(distribution.totalBirths).toBe(10)
    expect(distribution.countries[0].cumulativeBirths).toBe(9)
    expect(distribution.countries[0].probability).toBe(0.9)
    expect(distribution.countries[1].cumulativeBirths).toBe(10)
  })

  it.each([
    ['empty', []],
    ['duplicate', [country('aa', 1), country('aa', 1)]],
    ['negative', [country('aa', -1)]],
    ['zero', [country('aa', 0)]],
    ['nan', [country('aa', Number.NaN)]],
    ['infinity', [country('aa', Number.POSITIVE_INFINITY)]],
  ])('rejects %s data', (_, countries) => {
    expect(() => prepareBirthDistribution(dataset(countries))).toThrow()
  })
})

describe('pickBirthCountry', () => {
  const distribution = prepareBirthDistribution(dataset([country('aa', 9), country('bb', 1)]))

  it('selects the first country at the zero boundary', () => {
    expect(pickBirthCountry(distribution, () => 0).code).toBe('aa')
  })

  it('selects the second country after the weighted boundary', () => {
    expect(pickBirthCountry(distribution, () => 0.9).code).toBe('bb')
    expect(pickBirthCountry(distribution, () => 0.999999).code).toBe('bb')
  })

  it('selects the only country for a single-country distribution', () => {
    const single = prepareBirthDistribution(dataset([country('aa', 1)]))
    expect(pickBirthCountry(single, () => 0.999999).code).toBe('aa')
  })

  it('rejects random values outside the half-open interval', () => {
    expect(() => pickBirthCountry(distribution, () => -0.01)).toThrow()
    expect(() => pickBirthCountry(distribution, () => 1)).toThrow()
  })
})

describe('formatting', () => {
  it('formats counts and probabilities for a locale', () => {
    expect(formatBirthCount(23219488, 'en-US')).toBe('23,219,488')
    expect(formatBirthProbability(0.174, 'en-US')).toBe('17.4%')
    expect(formatBirthOdds(0.174, 'en-US')).toBe('5.7')
  })

  it('keeps very small probabilities readable', () => {
    expect(formatBirthProbability(0.0012, 'en-US')).toBe('0.12%')
  })

  it('rejects non-positive odds probabilities', () => {
    expect(() => formatBirthOdds(0, 'en-US')).toThrow()
  })
})

describe('getBirthRarity', () => {
  it('classifies probability into rarity tiers', () => {
    expect(getBirthRarity(0.17).tier).toBe('common')
    expect(getBirthRarity(0.05).tier).toBe('common')
    expect(getBirthRarity(0.02).tier).toBe('uncommon')
    expect(getBirthRarity(0.01).tier).toBe('uncommon')
    expect(getBirthRarity(0.005).tier).toBe('rare')
    expect(getBirthRarity(0.001).tier).toBe('rare')
    expect(getBirthRarity(0.0001).tier).toBe('ultra-rare')
  })
})
