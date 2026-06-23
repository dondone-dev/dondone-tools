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
