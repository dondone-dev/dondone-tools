// Restaurant break-even / P&L calculator.
//
// Simplified CVP (cost-volume-profit) model: monthly costs split into a
// fixed portion (rent, labor, utilities, other) and a variable portion
// expressed as a rate of revenue (food cost, delivery commission, packaging,
// other). Break-even revenue is the point where revenue covers both:
//   revenue = fixedCosts + revenue * variableRatio
//   revenue * (1 - variableRatio) = fixedCosts
//   revenue = fixedCosts / (1 - variableRatio)
// When variableRatio >= 1, no revenue level breaks even (Infinity).

export interface RestaurantBreakevenInput {
  /** One-time upfront investment — only used for payback period, not monthly P&L. */
  transferFee: number
  renovation: number
  equipment: number
  deposits: number
  startupOther: number

  /** Monthly fixed costs. */
  rent: number
  labor: number
  utilities: number
  fixedOther: number

  /** Variable cost rates, as fractions of revenue (e.g. 0.33 for 33%). */
  foodRate: number
  commissionRate: number
  packagingRate: number
  varOtherRate: number

  /** Estimated monthly revenue. */
  monthlyRevenue: number
}

export interface RestaurantBreakevenResult {
  totalFixed: number
  variableRatio: number
  /** Infinity when variableRatio >= 1 (no revenue level breaks even). */
  breakevenRevenue: number
  revenue: number
  foodCost: number
  /** Commission + packaging + other-variable, in currency. */
  varExtraCost: number
  variableCost: number
  grossProfit: number
  netProfit: number
  /** NaN when revenue is 0. */
  netMargin: number
  /** NaN when revenue is 0; can be negative. */
  marginOfSafety: number
  totalUpfrontInvestment: number
  /** Null when netProfit <= 0 (never recovers under current assumptions). */
  paybackMonths: number | null
}

function safe(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function computeRestaurantBreakeven(input: RestaurantBreakevenInput): RestaurantBreakevenResult {
  const rent = safe(input.rent)
  const labor = safe(input.labor)
  const utilities = safe(input.utilities)
  const fixedOther = safe(input.fixedOther)
  const totalFixed = rent + labor + utilities + fixedOther

  const foodRate = safe(input.foodRate)
  const commissionRate = safe(input.commissionRate)
  const packagingRate = safe(input.packagingRate)
  const varOtherRate = safe(input.varOtherRate)
  const variableRatio = foodRate + commissionRate + packagingRate + varOtherRate

  const breakevenRevenue = variableRatio < 1 ? round2(totalFixed / (1 - variableRatio)) : Infinity

  const revenue = safe(input.monthlyRevenue)
  const foodCost = round2(revenue * foodRate)
  const varExtraCost = round2(revenue * (commissionRate + packagingRate + varOtherRate))
  const variableCost = round2(foodCost + varExtraCost)
  const grossProfit = round2(revenue - foodCost)
  const netProfit = round2(revenue - totalFixed - variableCost)
  const netMargin = revenue > 0 ? netProfit / revenue : NaN
  const marginOfSafety =
    revenue > 0 && Number.isFinite(breakevenRevenue) ? (revenue - breakevenRevenue) / revenue : NaN

  const totalUpfrontInvestment =
    safe(input.transferFee) + safe(input.renovation) + safe(input.equipment) + safe(input.deposits) + safe(input.startupOther)
  const paybackMonths = netProfit > 0 ? totalUpfrontInvestment / netProfit : null

  return {
    totalFixed,
    variableRatio,
    breakevenRevenue,
    revenue,
    foodCost,
    varExtraCost,
    variableCost,
    grossProfit,
    netProfit,
    netMargin,
    marginOfSafety,
    totalUpfrontInvestment,
    paybackMonths,
  }
}

/** Monthly revenue derived from average ticket size × daily customers × operating days. */
export function computeMonthlyRevenueFromFlow(avgTicket: number, dailyFlow: number, openDays: number): number {
  return safe(avgTicket) * safe(dailyFlow) * safe(openDays)
}
