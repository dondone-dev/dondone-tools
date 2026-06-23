import { describe, it, expect } from 'vitest'
import { computeBeijingGetihu, BEIJING_YEARS, type BillRow } from './beijing-getihu'

const y2021 = BEIJING_YEARS.find((y) => y.year === 2021)!
const y2022 = BEIJING_YEARS.find((y) => y.year === 2022)!
const y2023 = BEIJING_YEARS.find((y) => y.year === 2023)!
const y2024 = BEIJING_YEARS.find((y) => y.year === 2024)!
const y2025 = BEIJING_YEARS.find((y) => y.year === 2025)!

function find(rows: BillRow[], insurance: string, side: string | null) {
  return rows.find((r) => r.insurance === insurance && r.side === side)!
}

describe('computeBeijingGetihu — verified against official levy bills', () => {
  it('2025: floor 7162 → line items and total 2667.27', () => {
    const { rows, socialTotal } = computeBeijingGetihu(y2025)
    expect(find(rows, 'pension', 'employer').amount).toBeCloseTo(1145.92, 2)
    expect(find(rows, 'pension', 'employee').amount).toBeCloseTo(572.96, 2)
    expect(find(rows, 'unemployment', 'employer').amount).toBeCloseTo(35.81, 2)
    expect(find(rows, 'unemployment', 'employee').amount).toBeCloseTo(35.81, 2)
    expect(find(rows, 'medicalBasic', 'employer').amount).toBeCloseTo(630.26, 2)
    expect(find(rows, 'medicalBasic', 'employee').amount).toBeCloseTo(143.24, 2)
    expect(find(rows, 'medicalLarge', 'employer').amount).toBeCloseTo(71.62, 2)
    expect(find(rows, 'medicalLarge', 'employee').amount).toBeCloseTo(3.0, 2)
    expect(find(rows, 'injury', null).amount).toBeCloseTo(28.65, 2)
    expect(socialTotal).toBeCloseTo(2667.27, 2)
  })

  it('2021: floor 5360 → total 1996.92', () => {
    expect(computeBeijingGetihu(y2021).socialTotal).toBeCloseTo(1996.92, 2)
  })

  it('2022: floor 5869 → total 2186.28', () => {
    expect(computeBeijingGetihu(y2022).socialTotal).toBeCloseTo(2186.28, 2)
  })

  it('2023: floor 6326 → total 2356.27; individual side 667.23 matches the official figure', () => {
    const { rows, socialTotal } = computeBeijingGetihu(y2023)
    // Official 2023 example: individual-side total ¥667.23 (养老/失业/医疗 rates confirmed).
    const employeeTotal = rows
      .filter((r) => r.side === 'employee')
      .reduce((sum, r) => sum + r.amount, 0)
    expect(employeeTotal).toBeCloseTo(667.23, 2)
    // 工伤 at 0.4% (industry-dependent) per the reference 个体户 bills.
    expect(find(rows, 'injury', null).amount).toBeCloseTo(25.3, 2) // 6326 × 0.4%
    expect(socialTotal).toBeCloseTo(2356.27, 2)
  })

  it('2024: floor 6821 → line items and total 2540.42', () => {
    const { rows, socialTotal } = computeBeijingGetihu(y2024)
    expect(find(rows, 'pension', 'employer').amount).toBeCloseTo(1091.36, 2)
    expect(find(rows, 'pension', 'employee').amount).toBeCloseTo(545.68, 2)
    // 6821 × 0.5% = 34.105 rounds to 34.11 on each side → 68.22, not 68.21
    expect(find(rows, 'unemployment', 'employer').amount).toBeCloseTo(34.11, 2)
    expect(find(rows, 'unemployment', 'employee').amount).toBeCloseTo(34.11, 2)
    expect(find(rows, 'medicalBasic', 'employer').amount).toBeCloseTo(600.25, 2)
    expect(find(rows, 'medicalBasic', 'employee').amount).toBeCloseTo(136.42, 2)
    expect(find(rows, 'medicalLarge', 'employer').amount).toBeCloseTo(68.21, 2)
    expect(find(rows, 'medicalLarge', 'employee').amount).toBeCloseTo(3.0, 2)
    expect(find(rows, 'injury', null).amount).toBeCloseTo(27.28, 2)
    expect(socialTotal).toBeCloseTo(2540.42, 2)
  })
})
