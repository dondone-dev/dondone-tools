import { describe, it, expect } from 'vitest'
import {
  computeFlexibleInsurance,
  type FlexibleInput,
  type MedicalConfig,
} from './flexible-insurance'
import { getFlexiblePreset, type FlexiblePreset } from './payroll-cn.data'

/** Build a lib input from a preset at its minimum pension/medical tier. */
function minTierInput(preset: FlexiblePreset, overrides: Partial<FlexibleInput> = {}): FlexibleInput {
  const medical: MedicalConfig =
    preset.medical.kind === 'flat'
      ? { kind: 'flat', amount: preset.medical.amount }
      : {
          kind: 'rate',
          rate: preset.medical.rate,
          base: preset.medical.baseMin,
          baseMin: preset.medical.baseMin,
          baseMax: preset.medical.baseMax,
        }
  return {
    pensionBase: preset.pensionBaseMin,
    pensionBaseMin: preset.pensionBaseMin,
    pensionBaseMax: preset.pensionBaseMax,
    pensionRate: preset.pensionRate,
    pensionAccountRate: preset.pensionAccountRate,
    unemploymentRate: preset.unemploymentRate,
    includeMedical: true,
    medical,
    ...overrides,
  }
}

describe('computeFlexibleInsurance — verified official minimum tiers (2025)', () => {
  it('Beijing: pension 1432.40 + unemployment 71.62 + flat medical 584.92 = 2088.94', () => {
    const r = computeFlexibleInsurance(minTierInput(getFlexiblePreset('beijing')!))
    expect(r.pension.amount).toBeCloseTo(1432.4, 2)
    expect(r.unemployment?.amount).toBeCloseTo(71.62, 2)
    expect(r.medical?.kind).toBe('flat')
    expect(r.medical?.base).toBeNull()
    expect(r.medical?.amount).toBeCloseTo(584.92, 2)
    expect(r.monthlyTotal).toBeCloseTo(2088.94, 2)
  })

  it('Shanghai: 7460 × (20% + 10%) = 2238.00, no unemployment', () => {
    const r = computeFlexibleInsurance(minTierInput(getFlexiblePreset('shanghai')!))
    expect(r.unemployment).toBeNull()
    expect(r.pension.amount).toBeCloseTo(1492, 2)
    expect(r.medical?.amount).toBeCloseTo(746, 2)
    expect(r.monthlyTotal).toBeCloseTo(2238.0, 2)
  })

  it('Hangzhou: pension 997.20 + medical 473.67 = 1470.87', () => {
    const r = computeFlexibleInsurance(minTierInput(getFlexiblePreset('hangzhou')!))
    expect(r.pension.amount).toBeCloseTo(997.2, 2)
    expect(r.medical?.amount).toBeCloseTo(473.67, 2)
    expect(r.monthlyTotal).toBeCloseTo(1470.87, 2)
  })

  it('Shenzhen: pension floor 4775 (not the SI floor 2520) × 20% = 955', () => {
    const r = computeFlexibleInsurance(minTierInput(getFlexiblePreset('shenzhen')!))
    expect(r.pension.base).toBe(4775)
    expect(r.pension.amount).toBeCloseTo(955, 2)
    expect(r.medical?.amount).toBeCloseTo(538.16, 2) // 6727 × 8%
    expect(r.monthlyTotal).toBeCloseTo(1493.16, 2)
  })

  it('Guangzhou: pension 5510 × 20% + medical 6236 × 6.5% = 1507.34', () => {
    const r = computeFlexibleInsurance(minTierInput(getFlexiblePreset('guangzhou')!))
    expect(r.pension.amount).toBeCloseTo(1102, 2)
    expect(r.medical?.amount).toBeCloseTo(405.34, 2)
    expect(r.monthlyTotal).toBeCloseTo(1507.34, 2)
  })
})

describe('computeFlexibleInsurance — behavior', () => {
  const shanghai = getFlexiblePreset('shanghai')!

  it('splits pension into personal account (8%) and pooling', () => {
    const r = computeFlexibleInsurance(minTierInput(shanghai))
    expect(r.pension.toAccount).toBeCloseTo(7460 * 0.08, 2)
    expect(r.pension.toPool).toBeCloseTo(r.pension.amount - r.pension.toAccount, 2)
  })

  it('omits medical when not included', () => {
    const r = computeFlexibleInsurance(minTierInput(shanghai, { includeMedical: false }))
    expect(r.medical).toBeNull()
    expect(r.monthlyTotal).toBe(r.pension.amount)
  })

  it('clamps a chosen pension base above the ceiling', () => {
    const r = computeFlexibleInsurance(minTierInput(shanghai, { pensionBase: 999999 }))
    expect(r.pension.base).toBe(shanghai.pensionBaseMax)
    expect(r.pension.clamped).toBe(true)
  })

  it('never produces NaN for non-finite input', () => {
    const r = computeFlexibleInsurance(
      minTierInput(shanghai, {
        pensionBase: NaN,
        medical: { kind: 'rate', rate: 0.1, base: Infinity, baseMin: 7460, baseMax: 37302 },
      }),
    )
    expect(Number.isNaN(r.monthlyTotal)).toBe(false)
    expect(r.pension.base).toBe(shanghai.pensionBaseMin)
    expect(r.medical?.base).toBe(7460)
  })
})
