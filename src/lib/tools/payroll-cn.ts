// China payroll calculator: 五险一金 (social insurance + housing fund),
// individual income tax (工资薪金 / 综合所得), take-home pay and employer cost.
//
// Tax uses the annualized method: it assumes a constant monthly salary across
// the year, computes the full-year tax via the comprehensive-income bracket
// table, then divides by 12 for an "average monthly tax". This yields a single
// stable figure, unlike the cumulative-withholding method where same-salary
// monthly tax rises through the year.

export interface InsuranceRate {
  /** Employee contribution rate, e.g. 0.08 for 8%. */
  employee: number
  /** Employer contribution rate. */
  employer: number
}

export interface CityRates {
  pension: InsuranceRate
  medical: InsuranceRate
  unemployment: InsuranceRate
  /** Work injury — employer only (employee rate is 0). */
  injury: InsuranceRate
  /** Maternity — employer only; 0 where merged into medical. */
  maternity: InsuranceRate
  housingFund: InsuranceRate
  /** Fixed monthly employee 大额/大病医疗 fee in yuan (e.g. Beijing ¥3). */
  medicalFixedEmployee?: number
}

export interface BaseLimits {
  /** Social-insurance contribution base floor / ceiling (月缴费基数上下限). */
  siBaseMin: number
  siBaseMax: number
  /** Housing-fund contribution base floor / ceiling. */
  hfBaseMin: number
  hfBaseMax: number
}

export interface PayrollInput extends BaseLimits {
  /** Pre-tax monthly salary in yuan. */
  gross: number
  rates: CityRates
  /**
   * Explicit social-insurance base. When omitted, the gross salary is used
   * ("足额按实际工资缴纳"). Always clamped to [siBaseMin, siBaseMax].
   */
  siBaseOverride?: number
  /** Explicit housing-fund base; clamped to [hfBaseMin, hfBaseMax]. */
  hfBaseOverride?: number
  /** Monthly 专项附加扣除 total in yuan. */
  specialDeduction: number
}

export interface ContributionBreakdown {
  pension: number
  medical: number
  unemployment: number
  injury: number
  maternity: number
  housingFund: number
  total: number
}

export interface TaxResult {
  /** Full-year income tax. */
  annual: number
  /** Average monthly tax (annual / 12). */
  monthlyAvg: number
  /** Annual taxable income after all deductions. */
  annualTaxable: number
  /** Marginal bracket rate applied, e.g. 0.1 for 10%. */
  bracketRate: number
}

export interface PayrollResult {
  employee: ContributionBreakdown
  employer: ContributionBreakdown
  tax: TaxResult
  /** Take-home pay = gross − employee contributions − monthly tax. */
  netSalary: number
  /** Employer total cost = gross + employer contributions. */
  companyCost: number
  /** companyCost / gross. */
  costRatio: number
  appliedBases: {
    si: number
    hf: number
    /** True when gross was outside [min, max] and the base was clamped. */
    siClamped: boolean
    hfClamped: boolean
  }
}

/** Monthly basic deduction (起征点): ¥5,000. */
export const MONTHLY_BASIC_DEDUCTION = 5000

interface TaxBracket {
  /** Upper bound of annual taxable income for this bracket (Infinity for top). */
  upTo: number
  rate: number
  /** 速算扣除数 (quick deduction). */
  quickDeduction: number
}

/** Comprehensive-income annual tax brackets (工资薪金, 2019 reform). */
export const TAX_BRACKETS: TaxBracket[] = [
  { upTo: 36000, rate: 0.03, quickDeduction: 0 },
  { upTo: 144000, rate: 0.1, quickDeduction: 2520 },
  { upTo: 300000, rate: 0.2, quickDeduction: 16920 },
  { upTo: 420000, rate: 0.25, quickDeduction: 31920 },
  { upTo: 660000, rate: 0.3, quickDeduction: 52920 },
  { upTo: 960000, rate: 0.35, quickDeduction: 85920 },
  { upTo: Infinity, rate: 0.45, quickDeduction: 181920 },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Round to 2 decimal places, avoiding float dust. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function computeContributions(input: PayrollInput): {
  employee: ContributionBreakdown
  employer: ContributionBreakdown
  appliedBases: PayrollResult['appliedBases']
} {
  const { gross, rates } = input

  const rawSi = Number.isFinite(input.siBaseOverride) ? (input.siBaseOverride as number) : gross
  const rawHf = Number.isFinite(input.hfBaseOverride) ? (input.hfBaseOverride as number) : gross
  const siBase = clamp(rawSi, input.siBaseMin, input.siBaseMax)
  const hfBase = clamp(rawHf, input.hfBaseMin, input.hfBaseMax)

  const fixedMedical = rates.medicalFixedEmployee ?? 0

  const employee: ContributionBreakdown = {
    pension: round2(siBase * rates.pension.employee),
    medical: round2(siBase * rates.medical.employee + fixedMedical),
    unemployment: round2(siBase * rates.unemployment.employee),
    injury: 0,
    maternity: 0,
    housingFund: round2(hfBase * rates.housingFund.employee),
    total: 0,
  }
  employee.total = round2(
    employee.pension + employee.medical + employee.unemployment + employee.housingFund,
  )

  const employer: ContributionBreakdown = {
    pension: round2(siBase * rates.pension.employer),
    medical: round2(siBase * rates.medical.employer),
    unemployment: round2(siBase * rates.unemployment.employer),
    injury: round2(siBase * rates.injury.employer),
    maternity: round2(siBase * rates.maternity.employer),
    housingFund: round2(hfBase * rates.housingFund.employer),
    total: 0,
  }
  employer.total = round2(
    employer.pension +
      employer.medical +
      employer.unemployment +
      employer.injury +
      employer.maternity +
      employer.housingFund,
  )

  return {
    employee,
    employer,
    appliedBases: {
      si: siBase,
      hf: hfBase,
      siClamped: rawSi !== siBase,
      hfClamped: rawHf !== hfBase,
    },
  }
}

/**
 * Annualized income tax from a constant monthly taxable amount.
 * monthlyTaxable = gross − employee contributions − 5000 − special deductions.
 */
export function computeIncomeTax(monthlyTaxable: number): TaxResult {
  const annualTaxable = Math.max(0, monthlyTaxable) * 12
  const bracket = TAX_BRACKETS.find((b) => annualTaxable <= b.upTo) ?? TAX_BRACKETS[TAX_BRACKETS.length - 1]
  const annual = round2(Math.max(0, annualTaxable * bracket.rate - bracket.quickDeduction))
  return {
    annual,
    monthlyAvg: round2(annual / 12),
    annualTaxable: round2(annualTaxable),
    bracketRate: annualTaxable > 0 ? bracket.rate : 0,
  }
}

export function computePayroll(input: PayrollInput): PayrollResult {
  const { employee, employer, appliedBases } = computeContributions(input)

  const monthlyTaxable =
    input.gross - employee.total - MONTHLY_BASIC_DEDUCTION - Math.max(0, input.specialDeduction)
  const tax = computeIncomeTax(monthlyTaxable)

  const netSalary = round2(input.gross - employee.total - tax.monthlyAvg)
  const companyCost = round2(input.gross + employer.total)
  const costRatio = input.gross > 0 ? Math.round((companyCost / input.gross) * 10000) / 10000 : 0

  return { employee, employer, tax, netSalary, companyCost, costRatio, appliedBases }
}
