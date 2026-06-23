// Flexible-employment (灵活就业人员) social insurance calculator.
//
// Flexible workers pay the entire contribution themselves — there is no
// employer split. They enroll in pension (养老) on the PROVINCIAL pension base
// (distinct from the employee social-insurance base), optionally unemployment
// (失业, where the city allows it, e.g. Beijing), and optionally medical (医疗).
// There is no work-injury/maternity and (in general) no housing fund. Income
// tax is out of scope (their income is 经营所得/劳务报酬, taxed differently).
//
// Medical differs by city: most charge a percentage of a separate medical base;
// some (Beijing) charge a flat fixed monthly fee that does not scale.

export type MedicalConfig =
  | { kind: 'flat'; amount: number }
  | { kind: 'rate'; rate: number; base: number; baseMin: number; baseMax: number }

export interface FlexibleInput {
  /** Self-chosen pension base; clamped to [pensionBaseMin, pensionBaseMax]. */
  pensionBase: number
  pensionBaseMin: number
  pensionBaseMax: number
  pensionRate: number
  /** Share of the pension base credited to the personal account (e.g. 0.08). */
  pensionAccountRate: number
  /** Unemployment rate on the pension base; 0 if not applicable. */
  unemploymentRate: number

  includeMedical: boolean
  medical: MedicalConfig
}

export interface FlexibleResult {
  pension: {
    base: number
    amount: number
    /** Portion credited to the personal account. */
    toAccount: number
    /** Portion to the pooling account (amount − toAccount). */
    toPool: number
    clamped: boolean
  }
  /** Null when the city has no flexible unemployment option. */
  unemployment: { base: number; amount: number } | null
  /** Null when medical is excluded. `base` is null for a flat fee. */
  medical: { kind: 'flat' | 'rate'; base: number | null; amount: number; clamped: boolean } | null
  monthlyTotal: number
  annualTotal: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Coerce to a finite, non-negative number; fall back to `fallback` otherwise. */
function safe(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

export function computeFlexibleInsurance(input: FlexibleInput): FlexibleResult {
  const rawPension = safe(input.pensionBase, input.pensionBaseMin)
  const pensionBase = clamp(rawPension, input.pensionBaseMin, input.pensionBaseMax)
  const pensionAmount = round2(pensionBase * input.pensionRate)
  const pensionToAccount = round2(pensionBase * input.pensionAccountRate)

  const pension = {
    base: pensionBase,
    amount: pensionAmount,
    toAccount: pensionToAccount,
    toPool: round2(pensionAmount - pensionToAccount),
    clamped: rawPension !== pensionBase,
  }

  const unemployment =
    input.unemploymentRate > 0
      ? { base: pensionBase, amount: round2(pensionBase * input.unemploymentRate) }
      : null

  let medical: FlexibleResult['medical'] = null
  if (input.includeMedical) {
    if (input.medical.kind === 'flat') {
      medical = { kind: 'flat', base: null, amount: round2(input.medical.amount), clamped: false }
    } else {
      const raw = safe(input.medical.base, input.medical.baseMin)
      const base = clamp(raw, input.medical.baseMin, input.medical.baseMax)
      medical = { kind: 'rate', base, amount: round2(base * input.medical.rate), clamped: raw !== base }
    }
  }

  const monthlyTotal = round2(
    pension.amount + (unemployment?.amount ?? 0) + (medical?.amount ?? 0),
  )
  return {
    pension,
    unemployment,
    medical,
    monthlyTotal,
    annualTotal: round2(monthlyTotal * 12),
  }
}
