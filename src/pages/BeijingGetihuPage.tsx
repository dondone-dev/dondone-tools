import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Info } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BEIJING_YEARS,
  computeBeijingGetihu,
  type BillRow,
  type GetihuResult,
} from '@/lib/tools/beijing-getihu'
import { toChineseCurrency } from '@/lib/tools/chinese-currency'

const AVAILABLE_YEARS = BEIJING_YEARS.filter((y) => y.available)
// Tabs run newest-first: 2026 | 2025 | … | 2021.
const YEAR_TABS = [...BEIJING_YEARS].reverse()

function yuan(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function BeijingGetihuPage() {
  const { t } = useTranslation('tools')

  const [yearValue, setYearValue] = useState(String(AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1].year))

  const year = BEIJING_YEARS.find((y) => String(y.year) === yearValue) ?? AVAILABLE_YEARS[0]
  const result = useMemo(() => computeBeijingGetihu(year), [year])
  const trend = useMemo(() => AVAILABLE_YEARS.map((y) => computeBeijingGetihu(y)), [])

  return (
    <ToolLayout toolId="beijing-getihu" category="Finance">
      {/* 1. Trend chart (five insurances) */}
      <section className="rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          {t('beijing-getihu.trend')}
        </div>
        <TrendChart trend={trend} t={t} />
      </section>

      {/* 2. Year tabs */}
      <div className="overflow-x-auto">
        <Tabs value={yearValue} onValueChange={setYearValue} className="mt-2">
          <TabsList>
            {YEAR_TABS.map((y) => (
              <TabsTrigger key={y.year} value={String(y.year)} disabled={!y.available}>
                {t('beijing-getihu.yearLabel', { year: y.year })}
                {!y.available && ` · ${t('beijing-getihu.notPublished')}`}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 3. Official-style levy bill */}
      <BillTable result={result} t={t} />

      <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <p className="flex items-start gap-1.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t('beijing-getihu.context')}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">{t('beijing-getihu.disclaimer')}</p>
    </ToolLayout>
  )
}

function itemLabel(t: ReturnType<typeof useTranslation>['t'], row: BillRow): string {
  const name = t(`beijing-getihu.ins.${row.insurance}`)
  if (!row.side) return name
  return t('beijing-getihu.itemFmt', { name, side: t(`beijing-getihu.side.${row.side}`) })
}

function BillTable({
  result,
  t,
}: {
  result: GetihuResult
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">{t('beijing-getihu.col.category')}</th>
            <th className="px-4 py-2.5 font-medium">{t('beijing-getihu.col.item')}</th>
            <th className="px-4 py-2.5 text-right font-medium">{t('beijing-getihu.col.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="border-b last:border-b-0">
              <td className="px-4 py-2 text-muted-foreground">{t(`beijing-getihu.cat.${row.category}`)}</td>
              <td className="px-4 py-2">{itemLabel(t, row)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{yuan(row.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 bg-muted/30 font-medium">
            <td className="px-4 py-2.5" colSpan={2}>
              {t('beijing-getihu.totalLower')}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums">{yuan(result.socialTotal)}</td>
          </tr>
          <tr className="bg-muted/30">
            <td className="px-4 pb-2.5 text-xs text-muted-foreground" colSpan={3}>
              {t('beijing-getihu.totalUpper')}：{toChineseCurrency(result.socialTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

const CHART_COLOR = '#10b981' // emerald-500

/** Five-insurance total across years (Recharts). */
function TrendChart({
  trend,
  t,
}: {
  trend: GetihuResult[]
  t: ReturnType<typeof useTranslation>['t']
}) {
  const byYear = new Map(trend.map((r) => [r.year, r.socialTotal]))
  const data = BEIJING_YEARS.map((y) => {
    const value = byYear.get(y.year) ?? null
    return { year: y.year, available: y.available, value, label: value == null ? '' : yuan(value) }
  })

  const values = trend.map((r) => r.socialTotal)
  const yMin = Math.floor(Math.min(...values) / 100) * 100
  const yMax = Math.ceil(Math.max(...values) / 100) * 100

  return (
    <div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 24, right: 48, left: 48, bottom: 4 }}>
          <CartesianGrid vertical={false} className="stroke-border" strokeOpacity={0.6} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            padding={{ left: 48, right: 48 }}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-muted-foreground"
            tickFormatter={(yr: number) => String(yr)}
          />
          <YAxis hide domain={[yMin, yMax]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={CHART_COLOR}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
            dot={{ r: 3, fill: CHART_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          >
            <LabelList dataKey="label" position="top" offset={10} className="fill-foreground" fontSize={10} />
          </Line>
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLOR }} />
        {t('beijing-getihu.legendSocial')}
      </div>
    </div>
  )
}
