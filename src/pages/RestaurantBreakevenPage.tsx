import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, ChartPie, Receipt, Info, ShieldCheck } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { computeMonthlyRevenueFromFlow, computeRestaurantBreakeven } from '@/lib/tools/restaurant-breakeven'

type RevenueMode = 'direct' | 'flow'
type T = ReturnType<typeof useTranslation>['t']

const BRAND = '#f59e0b'
const GOOD = '#10b981'
const NEUTRAL = '#94a3b8'

function n(raw: string): number {
  const v = Number(raw)
  return Number.isFinite(v) ? v : 0
}

function yuan(value: number): string {
  return `¥${Math.round(Math.abs(value)).toLocaleString('zh-CN')}`
}

function signedYuan(value: number): string {
  return `${value < 0 ? '-' : ''}${yuan(value)}`
}

function yuanCompact(value: number): string {
  if (Math.abs(value) >= 10000) {
    const wan = value / 10000
    return `¥${wan % 1 === 0 ? wan.toFixed(0) : wan.toFixed(1)}万`
  }
  return yuan(value)
}

function pctFmt(value: number): string {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'
}

export function RestaurantBreakevenPage() {
  const { t } = useTranslation('tools')

  // Upfront investment (optional)
  const [transferFee, setTransferFee] = useState('50000')
  const [renovation, setRenovation] = useState('150000')
  const [equipment, setEquipment] = useState('80000')
  const [deposits, setDeposits] = useState('30000')
  const [startupOther, setStartupOther] = useState('10000')

  // Monthly fixed costs
  const [rent, setRent] = useState('25000')
  const [labor, setLabor] = useState('40000')
  const [utilities, setUtilities] = useState('6000')
  const [fixedOther, setFixedOther] = useState('4000')

  // Variable cost rates (percent, e.g. 33 = 33%)
  const [foodRatePct, setFoodRatePct] = useState(33)
  const [commissionRatePct, setCommissionRatePct] = useState(8)
  const [packagingRatePct, setPackagingRatePct] = useState(2)
  const [varOtherRatePct, setVarOtherRatePct] = useState(3)

  // Revenue assumption
  const [revenueMode, setRevenueMode] = useState<RevenueMode>('direct')
  const [revenueDirect, setRevenueDirect] = useState('162000')
  const [avgTicket, setAvgTicket] = useState('45')
  const [dailyFlow, setDailyFlow] = useState('120')
  const [openDays, setOpenDays] = useState('30')

  const flowRevenue = computeMonthlyRevenueFromFlow(n(avgTicket), n(dailyFlow), n(openDays))
  const monthlyRevenue = revenueMode === 'direct' ? n(revenueDirect) : flowRevenue

  const result = useMemo(
    () =>
      computeRestaurantBreakeven({
        transferFee: n(transferFee),
        renovation: n(renovation),
        equipment: n(equipment),
        deposits: n(deposits),
        startupOther: n(startupOther),
        rent: n(rent),
        labor: n(labor),
        utilities: n(utilities),
        fixedOther: n(fixedOther),
        foodRate: foodRatePct / 100,
        commissionRate: commissionRatePct / 100,
        packagingRate: packagingRatePct / 100,
        varOtherRate: varOtherRatePct / 100,
        monthlyRevenue,
      }),
    [
      transferFee,
      renovation,
      equipment,
      deposits,
      startupOther,
      rent,
      labor,
      utilities,
      fixedOther,
      foodRatePct,
      commissionRatePct,
      packagingRatePct,
      varOtherRatePct,
      monthlyRevenue,
    ],
  )

  return (
    <ToolLayout toolId="restaurant-breakeven" category="Finance">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* ---------- Inputs ---------- */}
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline gap-1.5 text-sm font-semibold">
              <span>{t('restaurant-breakeven.upfrontTitle')}</span>
              <span className="text-xs font-normal text-muted-foreground">{t('restaurant-breakeven.upfrontHint')}</span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              <Field label={t('restaurant-breakeven.transferFee')}>
                <BaseInput value={transferFee} onChange={setTransferFee} />
              </Field>
              <Field label={t('restaurant-breakeven.renovation')}>
                <BaseInput value={renovation} onChange={setRenovation} />
              </Field>
              <Field label={t('restaurant-breakeven.equipment')}>
                <BaseInput value={equipment} onChange={setEquipment} />
              </Field>
              <Field label={t('restaurant-breakeven.deposits')}>
                <BaseInput value={deposits} onChange={setDeposits} />
              </Field>
              <div className="col-span-2">
                <Field label={t('restaurant-breakeven.startupOther')}>
                  <BaseInput value={startupOther} onChange={setStartupOther} />
                </Field>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-baseline justify-between text-sm font-semibold">
              <span>{t('restaurant-breakeven.fixedTitle')}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {t('restaurant-breakeven.fixedSum')} <b className="font-semibold text-foreground">{yuan(result.totalFixed)}</b>
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              <Field label={t('restaurant-breakeven.rent')}>
                <BaseInput value={rent} onChange={setRent} />
              </Field>
              <Field label={t('restaurant-breakeven.labor')}>
                <BaseInput value={labor} onChange={setLabor} />
              </Field>
              <Field label={t('restaurant-breakeven.utilities')}>
                <BaseInput value={utilities} onChange={setUtilities} />
              </Field>
              <Field label={t('restaurant-breakeven.fixedOther')}>
                <BaseInput value={fixedOther} onChange={setFixedOther} />
              </Field>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-baseline justify-between text-sm font-semibold">
              <span>{t('restaurant-breakeven.variableTitle')}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {t('restaurant-breakeven.variableSum')} <b className="font-semibold text-foreground">{pctFmt(result.variableRatio)}</b>
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              <Field label={t('restaurant-breakeven.foodRate')}>
                <PercentInput value={foodRatePct} onChange={setFoodRatePct} />
              </Field>
              <Field label={t('restaurant-breakeven.commissionRate')}>
                <PercentInput value={commissionRatePct} onChange={setCommissionRatePct} />
              </Field>
              <Field label={t('restaurant-breakeven.packagingRate')}>
                <PercentInput value={packagingRatePct} onChange={setPackagingRatePct} />
              </Field>
              <Field label={t('restaurant-breakeven.varOtherRate')}>
                <PercentInput value={varOtherRatePct} onChange={setVarOtherRatePct} />
              </Field>
            </div>
          </div>

          <Separator />

          <div className="space-y-2.5">
            <div className="text-sm font-semibold">{t('restaurant-breakeven.revenueTitle')}</div>
            <Tabs value={revenueMode} onValueChange={(v) => setRevenueMode(v as RevenueMode)}>
              <TabsList>
                <TabsTrigger value="direct">{t('restaurant-breakeven.tabDirect')}</TabsTrigger>
                <TabsTrigger value="flow">{t('restaurant-breakeven.tabFlow')}</TabsTrigger>
              </TabsList>
            </Tabs>

            {revenueMode === 'direct' ? (
              <Field label={t('restaurant-breakeven.revenueDirect')}>
                <BaseInput value={revenueDirect} onChange={setRevenueDirect} />
              </Field>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('restaurant-breakeven.avgTicket')}>
                    <BaseInput value={avgTicket} onChange={setAvgTicket} />
                  </Field>
                  <Field label={t('restaurant-breakeven.dailyFlow')}>
                    <PlainInput value={dailyFlow} onChange={setDailyFlow} />
                  </Field>
                  <div className="col-span-2">
                    <Field label={t('restaurant-breakeven.openDays')}>
                      <PlainInput value={openDays} onChange={setOpenDays} />
                    </Field>
                  </div>
                </div>
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {t('restaurant-breakeven.flowReadout', { value: yuan(flowRevenue) })}
                </p>
              </>
            )}
          </div>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('restaurant-breakeven.privacy')}
          </p>
        </div>

        {/* ---------- Results ---------- */}
        <div className="space-y-4">
          <StatGrid result={result} t={t} />

          {result.totalUpfrontInvestment > 0 && <PaybackRow result={result} t={t} />}

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {t('restaurant-breakeven.cvpTitle')}
            </div>
            <CvpChart totalFixed={result.totalFixed} variableRatio={result.variableRatio} breakeven={result.breakevenRevenue} revenue={result.revenue} t={t} />
            <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <Legend color={NEUTRAL} label={t('restaurant-breakeven.legendFixed')} />
              <Legend color={BRAND} label={t('restaurant-breakeven.legendTotal')} />
              <Legend color={GOOD} label={t('restaurant-breakeven.legendRevenue')} />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <ChartPie className="h-4 w-4 text-muted-foreground" />
              {t('restaurant-breakeven.costStructureTitle')}
            </div>
            <CostDonut rent={n(rent)} labor={n(labor)} utilities={n(utilities)} fixedOther={n(fixedOther)} foodCost={result.foodCost} varExtraCost={result.varExtraCost} t={t} />
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              {t('restaurant-breakeven.tableTitle')}
            </div>
            <PlTable result={result} rent={n(rent)} labor={n(labor)} utilities={n(utilities)} fixedOther={n(fixedOther)} t={t} />
          </div>
        </div>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t('restaurant-breakeven.disclaimer')}
      </p>
    </ToolLayout>
  )
}

function StatGrid({
  result,
  t,
}: {
  result: ReturnType<typeof computeRestaurantBreakeven>
  t: T
}) {
  const netProfitColor = result.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
  const netMarginColor = Number.isFinite(result.netMargin) && result.netMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
  const mosColor = Number.isFinite(result.marginOfSafety) && result.marginOfSafety >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label={t('restaurant-breakeven.statBreakeven')} value={Number.isFinite(result.breakevenRevenue) ? yuan(result.breakevenRevenue) : '—'} sub={t('restaurant-breakeven.statBreakevenSub')} />
      <StatTile label={t('restaurant-breakeven.statNetProfit')} value={signedYuan(result.netProfit)} valueClassName={netProfitColor} sub={t('restaurant-breakeven.statNetProfitSub')} />
      <StatTile label={t('restaurant-breakeven.statNetMargin')} value={pctFmt(result.netMargin)} valueClassName={netMarginColor} sub={t('restaurant-breakeven.statNetMarginSub')} />
      <StatTile
        label={t('restaurant-breakeven.statMoS')}
        value={Number.isFinite(result.marginOfSafety) ? `${result.marginOfSafety >= 0 ? '+' : ''}${pctFmt(result.marginOfSafety)}` : '—'}
        valueClassName={mosColor}
        sub={t('restaurant-breakeven.statMoSSub')}
      />
    </div>
  )
}

function StatTile({ label, value, sub, valueClassName }: { label: string; value: string; sub: string; valueClassName?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${valueClassName ?? ''}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}

function PaybackRow({
  result,
  t,
}: {
  result: ReturnType<typeof computeRestaurantBreakeven>
  t: T
}) {
  let months: string
  if (result.paybackMonths === null) {
    months = t('restaurant-breakeven.paybackNever')
  } else {
    const raw = result.paybackMonths
    if (raw >= 12) {
      let years = Math.floor(raw / 12)
      let remMonths = Math.round(raw - years * 12)
      if (remMonths === 12) {
        years += 1
        remMonths = 0
      }
      months = t('restaurant-breakeven.paybackYearsMonths', { months: raw.toFixed(1), years, remMonths })
    } else {
      months = t('restaurant-breakeven.paybackMonthsValue', { months: raw.toFixed(1) })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs text-muted-foreground">{t('restaurant-breakeven.paybackInvestLabel')}</span>
        <span className="font-semibold tabular-nums">{yuan(result.totalUpfrontInvestment)}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs text-muted-foreground">{t('restaurant-breakeven.paybackMonthsLabel')}</span>
        <span className="font-semibold tabular-nums">{months}</span>
      </span>
    </div>
  )
}

function CvpChart({
  totalFixed,
  variableRatio,
  breakeven,
  revenue,
  t,
}: {
  totalFixed: number
  variableRatio: number
  breakeven: number
  revenue: number
  t: T
}) {
  const rawMax = Math.max(Number.isFinite(breakeven) ? breakeven : 0, revenue, 1) * 1.35
  const xMax = Math.ceil(rawMax / 10000) * 10000 || 10000

  const data = [
    { x: 0, fixed: totalFixed, total: totalFixed, revenueLine: 0 },
    { x: xMax, fixed: totalFixed, total: totalFixed + variableRatio * xMax, revenueLine: xMax },
  ]

  const currentCost = totalFixed + variableRatio * revenue

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 28, right: 20, left: 8, bottom: 16 }}>
        <CartesianGrid vertical={false} className="stroke-border" strokeOpacity={0.5} />
        <XAxis
          dataKey="x"
          type="number"
          domain={[0, xMax]}
          ticks={[0, xMax / 4, xMax / 2, (xMax * 3) / 4, xMax]}
          tickFormatter={(v: number) => yuanCompact(v)}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-muted-foreground"
          label={{
            value: t('restaurant-breakeven.cvpAxisLabel'),
            position: 'bottom',
            offset: 0,
            fontSize: 11,
            fill: 'currentColor',
          }}
        />
        <YAxis type="number" domain={[0, xMax]} hide />
        <Line type="linear" dataKey="fixed" stroke={NEUTRAL} strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
        <Line type="linear" dataKey="total" stroke={BRAND} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="linear" dataKey="revenueLine" stroke={GOOD} strokeWidth={2.5} dot={false} isAnimationActive={false} />

        {Number.isFinite(breakeven) && (
          <ReferenceDot
            x={breakeven}
            y={breakeven}
            r={4.5}
            fill="var(--card)"
            stroke="currentColor"
            strokeWidth={1.5}
            label={{
              value: t('restaurant-breakeven.breakevenLabel', { value: yuan(breakeven) }),
              position: 'top',
              fontSize: 11,
              fontWeight: 600,
              fill: 'currentColor',
            }}
          />
        )}

        <ReferenceLine x={revenue} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="3 3" />
        <ReferenceDot
          x={revenue}
          y={revenue}
          r={4}
          fill={GOOD}
          stroke="none"
          label={{
            value: t('restaurant-breakeven.currentLabel', { value: yuan(revenue) }),
            position: 'top',
            fontSize: 11,
            fontWeight: 600,
            fill: 'currentColor',
          }}
        />
        <ReferenceDot x={revenue} y={currentCost} r={4} fill={BRAND} stroke="none" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

interface DonutSlice {
  key: string
  value: number
  color: string
  label: string
}

function CostDonut({
  rent,
  labor,
  utilities,
  fixedOther,
  foodCost,
  varExtraCost,
  t,
}: {
  rent: number
  labor: number
  utilities: number
  fixedOther: number
  foodCost: number
  varExtraCost: number
  t: T
}) {
  const slices: DonutSlice[] = [
    { key: 'food', value: foodCost, color: '#f59e0b', label: t('restaurant-breakeven.foodCost') },
    { key: 'rent', value: rent, color: '#6366f1', label: t('restaurant-breakeven.rent') },
    { key: 'labor', value: labor, color: '#0ea5e9', label: t('restaurant-breakeven.labor') },
    { key: 'utilities', value: utilities, color: '#14b8a6', label: t('restaurant-breakeven.utilities') },
    { key: 'varOther', value: varExtraCost, color: '#8b5cf6', label: t('restaurant-breakeven.varOther') },
    { key: 'fixedOther', value: fixedOther, color: NEUTRAL, label: t('restaurant-breakeven.fixedOther') },
  ].filter((s) => s.value > 0)

  const total = slices.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} stroke="none" isAnimationActive={false}>
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground">{t('restaurant-breakeven.donutCenterLabel')}</span>
          <span className="text-sm font-bold tabular-nums">{yuan(total)}</span>
        </div>
      </div>
      <div className="min-w-[220px] flex-1 space-y-2">
        {slices.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
            <span className="flex-1 truncate text-muted-foreground">{s.label}</span>
            <span className="font-semibold tabular-nums">{yuan(s.value)}</span>
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{total > 0 ? pctFmt(s.value / total) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlTable({
  result,
  rent,
  labor,
  utilities,
  fixedOther,
  t,
}: {
  result: ReturnType<typeof computeRestaurantBreakeven>
  rent: number
  labor: number
  utilities: number
  fixedOther: number
  t: T
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">{t('restaurant-breakeven.colCategory')}</th>
            <th className="px-4 py-2.5 font-medium">{t('restaurant-breakeven.colItem')}</th>
            <th className="px-4 py-2.5 text-right font-medium">{t('restaurant-breakeven.colAmount')}</th>
          </tr>
        </thead>
        <tbody>
          <PlRow cat={t('restaurant-breakeven.catRevenue')} item={t('restaurant-breakeven.revenueLabel')} amount={result.revenue} />
          <PlRow cat={t('restaurant-breakeven.catVariable')} item={t('restaurant-breakeven.foodCost')} amount={-result.foodCost} />
          <tr className="border-b bg-muted/30 font-semibold">
            <td className="px-4 py-2" colSpan={2}>
              {t('restaurant-breakeven.grossProfit')}
            </td>
            <td className="px-4 py-2 text-right tabular-nums">{signedYuan(result.grossProfit)}</td>
          </tr>
          <PlRow cat={t('restaurant-breakeven.catFixed')} item={t('restaurant-breakeven.rent')} amount={-rent} />
          <PlRow cat={t('restaurant-breakeven.catFixed')} item={t('restaurant-breakeven.labor')} amount={-labor} />
          <PlRow cat={t('restaurant-breakeven.catFixed')} item={t('restaurant-breakeven.utilities')} amount={-utilities} />
          <PlRow cat={t('restaurant-breakeven.catFixed')} item={t('restaurant-breakeven.fixedOther')} amount={-fixedOther} />
          <PlRow cat={t('restaurant-breakeven.catVariable')} item={t('restaurant-breakeven.varOther')} amount={-result.varExtraCost} />
        </tbody>
        <tfoot>
          <tr className="border-t-2 text-base font-semibold">
            <td className="px-4 py-2.5" colSpan={2}>
              {t('restaurant-breakeven.netProfit')}
            </td>
            <td className={`px-4 py-2.5 text-right tabular-nums ${result.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {signedYuan(result.netProfit)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function PlRow({ cat, item, amount }: { cat: string; item: string; amount: number }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-2 text-xs text-muted-foreground">{cat}</td>
      <td className="px-4 py-2">{item}</td>
      <td className={`px-4 py-2 text-right tabular-nums ${amount < 0 ? 'text-muted-foreground' : ''}`}>{signedYuan(amount)}</td>
    </tr>
  )
}

function BaseInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
      <Input value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="pl-7 font-mono text-sm tabular-nums" />
    </div>
  )
}

function PlainInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Input value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="font-mono text-sm tabular-nums" />
}

function PercentInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value.replace(/[^\d.]/g, ''))
          onChange(Number.isFinite(v) ? v : 0)
        }}
        inputMode="decimal"
        className="pr-7 font-mono text-sm tabular-nums"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
