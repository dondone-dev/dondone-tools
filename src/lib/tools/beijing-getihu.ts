// Beijing 个体工商户 minimum 五险 (social insurance) calculator.
//
// Non-Beijing-household residents cannot enroll in Beijing flexible-employment
// social insurance, so many register a 个体工商户 (sole proprietorship) and pay
// as an EMPLOYER — covering BOTH the employer and employee portions themselves.
// The "minimum standard" applies every contribution at its base floor.
//
// The result mirrors the official tax levy bill (征收明细), which lists each
// 征收品目 separately and rounds each line on its own. Verified against real
// bills / official figures: 2021 ¥1,996.92 (floor 5360), 2022 ¥2,186.28 (5869),
// 2023 ¥2,356.27 (6326), 2024 ¥2,540.42 (6821), 2025 ¥2,667.27 (7162).
//
// NOTE: the work-injury (工伤) rate is industry-dependent (0.2%–1.9%). This tool
// uses 0.4%, matching the reference 个体工商户 bills; some published examples use
// 0.2% (e.g. the 2023 企业职工 example of ¥2,343.62), which differs only by 工伤.
//
// Housing fund (一金) is intentionally excluded: it is optional for a 个体工商户,
// is not part of the tax levy bill, and is collected separately by the 公积金中心.

export interface BeijingYear {
  year: number
  /** False when the year's official figures are not yet published (e.g. 2026). */
  available: boolean
  /** Social-insurance monthly base floor (下限). */
  siBaseMin: number
}

/**
 * Official Beijing social-insurance base floors (each from that year's July
 * notice): 2021 ¥5,360, 2022 ¥5,869, 2023 ¥6,326, 2024 ¥6,821, 2025 ¥7,162.
 * 2026 is not yet published.
 */
export const BEIJING_YEARS: BeijingYear[] = [
  { year: 2021, available: true, siBaseMin: 5360 },
  { year: 2022, available: true, siBaseMin: 5869 },
  { year: 2023, available: true, siBaseMin: 6326 },
  { year: 2024, available: true, siBaseMin: 6821 },
  { year: 2025, available: true, siBaseMin: 7162 },
  { year: 2026, available: false, siBaseMin: 0 },
]

export type CategoryKey = 'pension' | 'unemployment' | 'medical' | 'injury'
export type InsuranceKey =
  | 'pension'
  | 'unemployment'
  | 'medicalBasic'
  | 'medicalLarge'
  | 'injury'
export type Side = 'employer' | 'employee' | null

interface BillSchemaRow {
  /** 征收项目名称 group. */
  category: CategoryKey
  /** 征收品目 insurance. */
  insurance: InsuranceKey
  side: Side
  /** Contribution rate on the base (omitted when `fixed` is set). */
  rate?: number
  /** Fixed monthly amount in yuan (e.g. 大额医疗 individual ¥3). */
  fixed?: number
}

/**
 * The nine levy lines a Beijing 个体工商户 pays, matching the official bill.
 * Stable across 2021–2025. Combined this is 五险 37.2% + ¥3 fixed:
 *   pension 24% (16+8) · 基本医疗 10.8% (8.8+2) · 大额医疗 1% +¥3 ·
 *   unemployment 1% · injury 0.4%.
 */
export const BILL_SCHEMA: BillSchemaRow[] = [
  { category: 'pension', insurance: 'pension', side: 'employer', rate: 0.16 },
  { category: 'pension', insurance: 'pension', side: 'employee', rate: 0.08 },
  { category: 'unemployment', insurance: 'unemployment', side: 'employer', rate: 0.005 },
  { category: 'unemployment', insurance: 'unemployment', side: 'employee', rate: 0.005 },
  { category: 'medical', insurance: 'medicalBasic', side: 'employer', rate: 0.088 },
  { category: 'medical', insurance: 'medicalBasic', side: 'employee', rate: 0.02 },
  { category: 'medical', insurance: 'medicalLarge', side: 'employer', rate: 0.01 },
  { category: 'medical', insurance: 'medicalLarge', side: 'employee', fixed: 3 },
  { category: 'injury', insurance: 'injury', side: null, rate: 0.004 },
]

export interface BillRow {
  category: CategoryKey
  insurance: InsuranceKey
  side: Side
  amount: number
}

export interface GetihuResult {
  year: number
  siBase: number
  /** Official bill line items (五险). */
  rows: BillRow[]
  /** 五险 total — the bill grand total (金额合计). */
  socialTotal: number
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function computeBeijingGetihu(year: BeijingYear): GetihuResult {
  const siBase = year.siBaseMin

  // Each levy line is rounded on its own — matching the official bill (e.g.
  // 2024 unemployment 34.11 + 34.11 = 68.22, not round(6821 × 1%) = 68.21).
  const rows: BillRow[] = BILL_SCHEMA.map((r) => ({
    category: r.category,
    insurance: r.insurance,
    side: r.side,
    amount: r.fixed ?? round2(siBase * (r.rate ?? 0)),
  }))

  return {
    year: year.year,
    siBase,
    rows,
    socialTotal: round2(rows.reduce((sum, r) => sum + r.amount, 0)),
  }
}
