import type { BaseLimits, CityRates } from './payroll-cn'

export interface CityPreset extends BaseLimits {
  id: string
  /** i18n key suffix under `payroll-cn.city.*`. */
  nameKey: string
  rates: CityRates
}

/**
 * Snapshot of 2025 contribution bases and rates for six major cities.
 *
 * Bases (社保缴费基数上下限) are taken from the cities' 2025 公告. Rates use each
 * city's published employer/employee splits where confirmed, otherwise the
 * common national defaults; maternity is set to 0 where merged into medical.
 * Housing-fund base limits are approximated to the social-insurance limits and
 * default to a 12% rate (adjustable in the UI, statutory range 5%–12%).
 *
 * All figures CHANGE yearly and by district — the UI surfaces this date and a
 * "verify with the local 社保局" disclaimer, and every value is user-editable.
 */
export const DATA_SNAPSHOT = '2025'

const STANDARD_DEFAULTS = {
  unemployment: { employee: 0.005, employer: 0.005 },
  injury: { employee: 0, employer: 0.004 },
  housingFund: { employee: 0.12, employer: 0.12 },
}

export const CITY_PRESETS: CityPreset[] = [
  {
    id: 'beijing',
    nameKey: 'beijing',
    siBaseMin: 7162,
    siBaseMax: 35811,
    hfBaseMin: 2420,
    hfBaseMax: 35811,
    rates: {
      pension: { employee: 0.08, employer: 0.16 },
      medical: { employee: 0.02, employer: 0.098 },
      maternity: { employee: 0, employer: 0 },
      medicalFixedEmployee: 3,
      ...STANDARD_DEFAULTS,
    },
  },
  {
    id: 'shanghai',
    nameKey: 'shanghai',
    siBaseMin: 7460,
    siBaseMax: 37302,
    hfBaseMin: 2690,
    hfBaseMax: 37302,
    rates: {
      pension: { employee: 0.08, employer: 0.16 },
      medical: { employee: 0.02, employer: 0.09 },
      maternity: { employee: 0, employer: 0 },
      unemployment: { employee: 0.005, employer: 0.005 },
      injury: { employee: 0, employer: 0.002 },
      housingFund: { employee: 0.07, employer: 0.07 },
    },
  },
  {
    id: 'guangzhou',
    nameKey: 'guangzhou',
    siBaseMin: 5510,
    siBaseMax: 27549,
    hfBaseMin: 2300,
    hfBaseMax: 27549,
    rates: {
      pension: { employee: 0.08, employer: 0.16 },
      medical: { employee: 0.02, employer: 0.055 },
      maternity: { employee: 0, employer: 0.01 },
      unemployment: { employee: 0.002, employer: 0.0048 },
      injury: { employee: 0, employer: 0.002 },
      housingFund: { employee: 0.12, employer: 0.12 },
    },
  },
  {
    id: 'shenzhen',
    nameKey: 'shenzhen',
    siBaseMin: 2520,
    siBaseMax: 27549,
    hfBaseMin: 2520,
    hfBaseMax: 27549,
    rates: {
      pension: { employee: 0.08, employer: 0.16 },
      medical: { employee: 0.02, employer: 0.062 },
      maternity: { employee: 0, employer: 0.0045 },
      unemployment: { employee: 0.003, employer: 0.007 },
      injury: { employee: 0, employer: 0.0014 },
      housingFund: { employee: 0.05, employer: 0.05 },
    },
  },
  {
    id: 'hangzhou',
    nameKey: 'hangzhou',
    siBaseMin: 4986,
    siBaseMax: 25299,
    hfBaseMin: 2490,
    hfBaseMax: 25299,
    rates: {
      pension: { employee: 0.08, employer: 0.16 },
      medical: { employee: 0.02, employer: 0.095 },
      maternity: { employee: 0, employer: 0 },
      ...STANDARD_DEFAULTS,
    },
  },
  {
    id: 'chengdu',
    nameKey: 'chengdu',
    siBaseMin: 4588,
    siBaseMax: 22938,
    hfBaseMin: 2100,
    hfBaseMax: 22938,
    rates: {
      pension: { employee: 0.08, employer: 0.16 },
      medical: { employee: 0.02, employer: 0.065 },
      maternity: { employee: 0, employer: 0 },
      ...STANDARD_DEFAULTS,
    },
  },
]

export function getCityPreset(id: string): CityPreset | undefined {
  return CITY_PRESETS.find((c) => c.id === id)
}

/**
 * Flexible-employment (灵活就业人员) contribution presets, shared with the
 * dedicated calculator. Flexible workers pay the WHOLE contribution themselves
 * (no employer split), generally only pension + medical, no housing fund.
 *
 * Pension is nationally standardized at 20% of a self-chosen base within the
 * province's [floor, ceiling] (8 percentage points go to the personal account),
 * so the pension base reuses each city's social-insurance limits above.
 *
 * Medical rate/base vary by city. Confirmed 2025 figures: Shanghai 10%,
 * Shenzhen 8% (base 6727–33633), Guangzhou 6.5% (base 6236–31179). Beijing,
 * Hangzhou and Chengdu use representative approximations (`medicalConfirmed:
 * false`) — the UI flags these and every value is editable.
 */
/**
 * Medical contribution for flexible workers. Most cities charge a percentage of
 * a (separate) medical base; Beijing charges a flat fixed monthly fee.
 */
export type FlexibleMedical =
  | { kind: 'flat'; amount: number }
  | { kind: 'rate'; rate: number; baseMin: number; baseMax: number }

export interface FlexiblePreset {
  /** Matches a CITY_PRESETS id. */
  id: string
  /**
   * Pension contribution base limits for flexible workers — the PROVINCIAL
   * pension base, which differs from the employee social-insurance base above
   * (e.g. Shenzhen pension floor 4775, not the local SI floor 2520).
   */
  pensionBaseMin: number
  pensionBaseMax: number
  pensionRate: number
  /** Portion of the pension base credited to the personal account. */
  pensionAccountRate: number
  /** Unemployment rate on the pension base; 0 where flexible workers can't enroll. */
  unemploymentRate: number
  medical: FlexibleMedical
  /** False when the medical figure is approximated rather than from an official notice. */
  medicalConfirmed: boolean
}

/**
 * 2025 flexible-employment presets, verified against official notices.
 * Minimum-tier monthly totals (pension + unemployment + medical):
 *   Beijing 2088.94 · Shanghai 2238.00 · Hangzhou 1470.87 ·
 *   Shenzhen 1493.16 · Guangzhou 1507.34. Chengdu medical rate is approximated.
 */
export const FLEXIBLE_PRESETS: FlexiblePreset[] = [
  // Beijing: pension+unemployment share base 7162–35811; medical is a flat fee.
  { id: 'beijing', pensionBaseMin: 7162, pensionBaseMax: 35811, pensionRate: 0.2, pensionAccountRate: 0.08, unemploymentRate: 0.01, medical: { kind: 'flat', amount: 584.92 }, medicalConfirmed: true },
  // Shanghai: pension & medical track the SI base 7460–37302.
  { id: 'shanghai', pensionBaseMin: 7460, pensionBaseMax: 37302, pensionRate: 0.2, pensionAccountRate: 0.08, unemploymentRate: 0, medical: { kind: 'rate', rate: 0.1, baseMin: 7460, baseMax: 37302 }, medicalConfirmed: true },
  // Guangdong pension floor 5510 (Guangzhou/省直), ceiling 27549; medical base separate.
  { id: 'guangzhou', pensionBaseMin: 5510, pensionBaseMax: 27549, pensionRate: 0.2, pensionAccountRate: 0.08, unemploymentRate: 0, medical: { kind: 'rate', rate: 0.065, baseMin: 6236, baseMax: 31179 }, medicalConfirmed: true },
  // Shenzhen uses the Guangdong "other regions" pension floor 4775, ceiling 27549.
  { id: 'shenzhen', pensionBaseMin: 4775, pensionBaseMax: 27549, pensionRate: 0.2, pensionAccountRate: 0.08, unemploymentRate: 0, medical: { kind: 'rate', rate: 0.08, baseMin: 6727, baseMax: 33633 }, medicalConfirmed: true },
  // Hangzhou (Zhejiang): pension & medical (含生育) share base 4986–25299.
  { id: 'hangzhou', pensionBaseMin: 4986, pensionBaseMax: 25299, pensionRate: 0.2, pensionAccountRate: 0.08, unemploymentRate: 0, medical: { kind: 'rate', rate: 0.095, baseMin: 4986, baseMax: 25299 }, medicalConfirmed: true },
  // Chengdu (Sichuan): flexible pension tiers 60%–300% of ¥7518 → 4511–22555.
  // Medical (统账结合) base ¥6117; rate approximated, flagged in the UI.
  { id: 'chengdu', pensionBaseMin: 4511, pensionBaseMax: 22555, pensionRate: 0.2, pensionAccountRate: 0.08, unemploymentRate: 0, medical: { kind: 'rate', rate: 0.085, baseMin: 6117, baseMax: 22555 }, medicalConfirmed: false },
]

export function getFlexiblePreset(id: string): FlexiblePreset | undefined {
  return FLEXIBLE_PRESETS.find((c) => c.id === id)
}

/**
 * Monthly 专项附加扣除 standards (yuan). Values the user toggles/enters; the
 * page sums the selected items into a single monthly deduction.
 */
export const SPECIAL_DEDUCTION_STANDARDS = {
  childEducation: 2000, // per child (子女教育 / 3岁以下婴幼儿照护)
  continuingEducation: 400, // 学历继续教育
  housingLoan: 1000, // 住房贷款利息
  housingRentTier1: 1500, // 直辖市/省会
  housingRentTier2: 1100, // 市区人口 > 100万
  housingRentTier3: 800, // 其他
  elderlyOnlyChild: 3000, // 赡养老人（独生子女）
  elderlyShared: 1500, // 赡养老人（分摊上限）
} as const
