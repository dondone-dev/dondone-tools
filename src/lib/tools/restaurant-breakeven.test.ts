import { describe, it, expect } from 'vitest'
import { computeRestaurantBreakeven, computeMonthlyRevenueFromFlow, type RestaurantBreakevenInput } from './restaurant-breakeven'

function baseInput(overrides: Partial<RestaurantBreakevenInput> = {}): RestaurantBreakevenInput {
  return {
    transferFee: 50000,
    renovation: 150000,
    equipment: 80000,
    deposits: 30000,
    startupOther: 10000,
    rent: 25000,
    labor: 40000,
    utilities: 6000,
    fixedOther: 4000,
    foodRate: 0.33,
    commissionRate: 0.08,
    packagingRate: 0.02,
    varOtherRate: 0.03,
    monthlyRevenue: 162000,
    ...overrides,
  }
}

describe('computeRestaurantBreakeven', () => {
  it('matches the worked example (thin-margin restaurant)', () => {
    const r = computeRestaurantBreakeven(baseInput())
    expect(r.totalFixed).toBe(75000)
    expect(r.variableRatio).toBeCloseTo(0.46, 10)
    expect(r.breakevenRevenue).toBeCloseTo(75000 / 0.54, 2)
    expect(r.foodCost).toBeCloseTo(53460, 2)
    expect(r.grossProfit).toBeCloseTo(108540, 2)
    expect(r.netProfit).toBeCloseTo(12480, 2)
    expect(r.netMargin).toBeCloseTo(12480 / 162000, 6)
    expect(r.marginOfSafety).toBeGreaterThan(0)
    expect(r.totalUpfrontInvestment).toBe(320000)
    expect(r.paybackMonths).toBeCloseTo(320000 / 12480, 4)
  })

  it('reports revenue below break-even as a loss with no payback', () => {
    const r = computeRestaurantBreakeven(baseInput({ monthlyRevenue: 90000 }))
    expect(r.netProfit).toBeLessThan(0)
    expect(r.marginOfSafety).toBeLessThan(0)
    expect(r.paybackMonths).toBeNull()
  })

  it('yields Infinity break-even when variable ratio reaches 100%', () => {
    const r = computeRestaurantBreakeven(
      baseInput({ foodRate: 0.5, commissionRate: 0.3, packagingRate: 0.1, varOtherRate: 0.1 }),
    )
    expect(r.variableRatio).toBe(1)
    expect(r.breakevenRevenue).toBe(Infinity)
    expect(r.paybackMonths).toBeNull()
  })

  it('handles zero revenue without NaN in currency fields', () => {
    const r = computeRestaurantBreakeven(baseInput({ monthlyRevenue: 0 }))
    expect(r.foodCost).toBe(0)
    expect(r.netProfit).toBe(-r.totalFixed)
    expect(Number.isNaN(r.netMargin)).toBe(true)
  })

  it('never produces NaN currency output for non-finite or negative input', () => {
    const r = computeRestaurantBreakeven(
      baseInput({ rent: NaN, labor: -100, monthlyRevenue: Infinity }),
    )
    expect(Number.isNaN(r.totalFixed)).toBe(false)
    expect(Number.isNaN(r.netProfit)).toBe(false)
    expect(r.revenue).toBe(0)
  })

  it('treats missing upfront investment as zero (payback section optional)', () => {
    const r = computeRestaurantBreakeven(
      baseInput({ transferFee: 0, renovation: 0, equipment: 0, deposits: 0, startupOther: 0 }),
    )
    expect(r.totalUpfrontInvestment).toBe(0)
    expect(r.paybackMonths).toBe(0)
  })
})

describe('computeMonthlyRevenueFromFlow', () => {
  it('multiplies ticket size × daily customers × operating days', () => {
    expect(computeMonthlyRevenueFromFlow(45, 120, 30)).toBe(162000)
  })

  it('clamps non-finite or negative inputs to zero', () => {
    expect(computeMonthlyRevenueFromFlow(NaN, 120, 30)).toBe(0)
    expect(computeMonthlyRevenueFromFlow(45, -1, 30)).toBe(0)
  })
})
