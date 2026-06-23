import { describe, it, expect } from 'vitest'
import {
  computeContributions,
  computeIncomeTax,
  computePayroll,
  type PayrollInput,
} from './payroll-cn'
import { getCityPreset } from './payroll-cn.data'

const beijing = getCityPreset('beijing')!

function baseInput(overrides: Partial<PayrollInput> = {}): PayrollInput {
  return {
    gross: 20000,
    siBaseMin: beijing.siBaseMin,
    siBaseMax: beijing.siBaseMax,
    hfBaseMin: beijing.hfBaseMin,
    hfBaseMax: beijing.hfBaseMax,
    rates: beijing.rates,
    specialDeduction: 0,
    ...overrides,
  }
}

describe('computeContributions', () => {
  it('computes Beijing employee/employer split at ¥20,000 (within base limits)', () => {
    const { employee, employer, appliedBases } = computeContributions(baseInput())

    expect(appliedBases.si).toBe(20000)
    expect(appliedBases.siClamped).toBe(false)

    // employee: 8% + (2% + ¥3) + 0.5% + 12%
    expect(employee.pension).toBe(1600)
    expect(employee.medical).toBe(403) // 400 + ¥3 fixed
    expect(employee.unemployment).toBe(100)
    expect(employee.housingFund).toBe(2400)
    expect(employee.total).toBe(4503)

    // employer: 16% + 9.8% + 0.5% + 0.4% injury + 0 maternity + 12%
    expect(employer.pension).toBe(3200)
    expect(employer.medical).toBe(1960)
    expect(employer.unemployment).toBe(100)
    expect(employer.injury).toBe(80)
    expect(employer.maternity).toBe(0)
    expect(employer.housingFund).toBe(2400)
    expect(employer.total).toBe(7740)
  })

  it('clamps the base to the ceiling for high earners', () => {
    const { employee, appliedBases } = computeContributions(baseInput({ gross: 50000 }))
    expect(appliedBases.si).toBe(35811)
    expect(appliedBases.siClamped).toBe(true)
    expect(employee.pension).toBeCloseTo(35811 * 0.08, 2)
  })

  it('clamps the base to the floor for low earners', () => {
    const { appliedBases } = computeContributions(baseInput({ gross: 6000 }))
    expect(appliedBases.si).toBe(7162) // floored
    expect(appliedBases.siClamped).toBe(true)
    expect(appliedBases.hf).toBe(6000) // above hf floor 2420, not clamped
    expect(appliedBases.hfClamped).toBe(false)
  })

  it('honors an explicit base override (still clamped)', () => {
    const { appliedBases } = computeContributions(baseInput({ gross: 30000, siBaseOverride: 10000 }))
    expect(appliedBases.si).toBe(10000)
  })

  it('falls back to gross when an override is non-finite (never produces NaN)', () => {
    const { employee, appliedBases } = computeContributions(
      baseInput({ gross: 20000, siBaseOverride: NaN, hfBaseOverride: Infinity }),
    )
    expect(appliedBases.si).toBe(20000)
    expect(appliedBases.hf).toBe(20000)
    expect(Number.isNaN(employee.total)).toBe(false)
  })
})

describe('computeIncomeTax (annualized)', () => {
  it('returns zero tax for non-positive taxable income', () => {
    expect(computeIncomeTax(0).annual).toBe(0)
    expect(computeIncomeTax(-500).annual).toBe(0)
    expect(computeIncomeTax(-500).bracketRate).toBe(0)
  })

  it('applies the 3% bracket at the boundary', () => {
    const r = computeIncomeTax(3000) // annual 36,000
    expect(r.bracketRate).toBe(0.03)
    expect(r.annual).toBe(1080)
    expect(r.monthlyAvg).toBe(90)
  })

  it('moves into the 10% bracket just past the boundary', () => {
    const r = computeIncomeTax(3000.01) // annual 36,000.12
    expect(r.bracketRate).toBe(0.1)
    expect(r.annual).toBeCloseTo(36000.12 * 0.1 - 2520, 2)
  })

  it('applies the top 45% bracket', () => {
    const r = computeIncomeTax(100000) // annual 1,200,000
    expect(r.bracketRate).toBe(0.45)
    expect(r.annual).toBe(1200000 * 0.45 - 181920)
  })
})

describe('computePayroll', () => {
  it('computes full result for Beijing ¥20,000, no special deduction', () => {
    const r = computePayroll(baseInput())

    // monthlyTaxable = 20000 - 4503 - 5000 = 10497 → annual 125,964 → 10% − 2520
    expect(r.tax.annualTaxable).toBe(125964)
    expect(r.tax.bracketRate).toBe(0.1)
    expect(r.tax.annual).toBeCloseTo(10076.4, 2)
    expect(r.tax.monthlyAvg).toBeCloseTo(839.7, 2)

    expect(r.netSalary).toBeCloseTo(20000 - 4503 - 839.7, 2)
    expect(r.companyCost).toBe(27740)
    expect(r.costRatio).toBeCloseTo(1.387, 3)
  })

  it('special deductions lower the taxable income and tax', () => {
    const withDeduction = computePayroll(baseInput({ specialDeduction: 3000 }))
    const without = computePayroll(baseInput({ specialDeduction: 0 }))
    expect(withDeduction.tax.annual).toBeLessThan(without.tax.annual)
    // monthlyTaxable = 20000 - 4503 - 5000 - 3000 = 7497 → annual 89,964
    expect(withDeduction.tax.annualTaxable).toBe(89964)
    expect(withDeduction.tax.annual).toBeCloseTo(89964 * 0.1 - 2520, 2)
  })

  it('yields zero tax when income is below the threshold', () => {
    const r = computePayroll(baseInput({ gross: 6000 }))
    expect(r.tax.annual).toBe(0)
    expect(r.netSalary).toBeLessThan(6000)
  })
})
