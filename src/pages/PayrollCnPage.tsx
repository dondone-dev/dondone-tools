import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, Building2, Receipt, ShieldCheck, Info } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  computePayroll,
  type CityRates,
  type ContributionBreakdown,
  type PayrollResult,
} from '@/lib/tools/payroll-cn'
import {
  CITY_PRESETS,
  DATA_SNAPSHOT,
  SPECIAL_DEDUCTION_STANDARDS as STD,
  getCityPreset,
} from '@/lib/tools/payroll-cn.data'

const FUND_RATE_OPTIONS = [0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12]

function yuan(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pct(n: number): string {
  return `${(n * 100).toFixed(2).replace(/\.?0+$/, '')}%`
}

/** Parse user input to a non-negative finite number, or undefined if invalid. */
function parseAmount(raw: string): number | undefined {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function PayrollCnPage() {
  const { t } = useTranslation('tools')

  const [cityId, setCityId] = useState('beijing')
  const [grossRaw, setGrossRaw] = useState('20000')
  const [fundRate, setFundRate] = useState(0.12)

  // Special additional deductions (专项附加扣除)
  const [children, setChildren] = useState(0)
  const [continuingEdu, setContinuingEdu] = useState(false)
  const [housing, setHousing] = useState<'none' | 'loan' | 'rent1' | 'rent2' | 'rent3'>('none')
  const [elderly, setElderly] = useState<'none' | 'only' | 'shared'>('none')

  // Advanced: custom contribution base
  const [customBase, setCustomBase] = useState(false)
  const [siBaseRaw, setSiBaseRaw] = useState('')
  const [hfBaseRaw, setHfBaseRaw] = useState('')

  const city = getCityPreset(cityId) ?? CITY_PRESETS[0]
  const gross = parseAmount(grossRaw) ?? 0

  function selectCity(id: string) {
    setCityId(id)
    const next = getCityPreset(id)
    if (next) setFundRate(next.rates.housingFund.employee)
  }

  const specialDeduction =
    children * STD.childEducation +
    (continuingEdu ? STD.continuingEducation : 0) +
    (housing === 'loan'
      ? STD.housingLoan
      : housing === 'rent1'
        ? STD.housingRentTier1
        : housing === 'rent2'
          ? STD.housingRentTier2
          : housing === 'rent3'
            ? STD.housingRentTier3
            : 0) +
    (elderly === 'only' ? STD.elderlyOnlyChild : elderly === 'shared' ? STD.elderlyShared : 0)

  const result = useMemo<PayrollResult | null>(() => {
    if (gross <= 0) return null
    const rates: CityRates = {
      ...city.rates,
      housingFund: { employee: fundRate, employer: fundRate },
    }
    return computePayroll({
      gross,
      siBaseMin: city.siBaseMin,
      siBaseMax: city.siBaseMax,
      hfBaseMin: city.hfBaseMin,
      hfBaseMax: city.hfBaseMax,
      rates,
      specialDeduction,
      siBaseOverride: customBase ? parseAmount(siBaseRaw) : undefined,
      hfBaseOverride: customBase ? parseAmount(hfBaseRaw) : undefined,
    })
  }, [city, gross, fundRate, specialDeduction, customBase, siBaseRaw, hfBaseRaw])

  return (
    <ToolLayout toolId="payroll-cn" category="Finance">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* ---------- Inputs ---------- */}
        <div className="space-y-5">
          <Field label={t('payroll-cn.city')}>
            <Select value={cityId} onValueChange={selectCity}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITY_PRESETS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {t(`payroll-cn.cityName.${c.nameKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t('payroll-cn.gross')}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ¥
              </span>
              <Input
                value={grossRaw}
                onChange={(e) => setGrossRaw(e.target.value.replace(/[^\d.]/g, ''))}
                inputMode="decimal"
                className="pl-7 font-mono text-sm tabular-nums"
                placeholder="20000"
              />
            </div>
          </Field>

          <Field label={t('payroll-cn.fundRate')}>
            <Select value={String(fundRate)} onValueChange={(v) => setFundRate(Number(v))}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUND_RATE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {pct(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Separator />

          {/* Special additional deductions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">{t('payroll-cn.deductions')}</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {yuan(specialDeduction)}/{t('payroll-cn.perMonth')}
              </span>
            </div>

            <Field label={t('payroll-cn.childEducation')} hint={t('payroll-cn.childEducationHint')}>
              <Select value={String(children)} onValueChange={(v) => setChildren(Number(v))}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n === 0 ? t('payroll-cn.childrenNone') : String(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t('payroll-cn.housing')}>
              <Select value={housing} onValueChange={(v) => setHousing(v as typeof housing)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('payroll-cn.housingNone')}</SelectItem>
                  <SelectItem value="loan">{t('payroll-cn.housingLoan')}</SelectItem>
                  <SelectItem value="rent1">{t('payroll-cn.rent1')}</SelectItem>
                  <SelectItem value="rent2">{t('payroll-cn.rent2')}</SelectItem>
                  <SelectItem value="rent3">{t('payroll-cn.rent3')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label={t('payroll-cn.elderly')}>
              <Select value={elderly} onValueChange={(v) => setElderly(v as typeof elderly)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('payroll-cn.elderlyNone')}</SelectItem>
                  <SelectItem value="only">{t('payroll-cn.elderlyOnly')}</SelectItem>
                  <SelectItem value="shared">{t('payroll-cn.elderlyShared')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={continuingEdu}
                onCheckedChange={(c) => setContinuingEdu(c === true)}
              />
              <span className="text-sm">{t('payroll-cn.continuingEdu')}</span>
            </label>
          </div>

          <Separator />

          {/* Advanced: custom base */}
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={customBase} onCheckedChange={(c) => setCustomBase(c === true)} />
              <span className="text-sm">{t('payroll-cn.customBase')}</span>
            </label>
            {!customBase && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t('payroll-cn.fullBaseHint', {
                  min: yuan(city.siBaseMin),
                  max: yuan(city.siBaseMax),
                })}
              </p>
            )}
            {customBase && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('payroll-cn.siBase')}>
                  <Input
                    value={siBaseRaw}
                    onChange={(e) => setSiBaseRaw(e.target.value.replace(/[^\d.]/g, ''))}
                    inputMode="decimal"
                    placeholder={String(city.siBaseMin)}
                    className="font-mono text-sm tabular-nums"
                  />
                </Field>
                <Field label={t('payroll-cn.hfBase')}>
                  <Input
                    value={hfBaseRaw}
                    onChange={(e) => setHfBaseRaw(e.target.value.replace(/[^\d.]/g, ''))}
                    inputMode="decimal"
                    placeholder={String(city.hfBaseMin)}
                    className="font-mono text-sm tabular-nums"
                  />
                </Field>
              </div>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('payroll-cn.privacy')}
          </p>
        </div>

        {/* ---------- Results ---------- */}
        {result ? (
          <Results result={result} t={t} />
        ) : (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            {t('payroll-cn.idle')}
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {t('payroll-cn.disclaimer', { year: DATA_SNAPSHOT })}
      </p>
    </ToolLayout>
  )
}

function Results({
  result,
  t,
}: {
  result: PayrollResult
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <div className="space-y-4">
      {/* Hero: take-home */}
      <div className="rounded-xl border bg-muted/30 p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              {t('payroll-cn.netSalary')}
            </div>
            <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {yuan(result.netSalary)}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-xs font-medium text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {t('payroll-cn.companyCost')}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {yuan(result.companyCost)}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('payroll-cn.costRatio', { ratio: pct(result.costRatio) })}
            </div>
          </div>
        </div>
        <CompositionBar result={result} t={t} />
      </div>

      {/* Tax */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            {t('payroll-cn.tax')}
          </span>
          <span className="text-lg font-semibold tabular-nums">{yuan(result.tax.monthlyAvg)}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <span>{t('payroll-cn.taxAnnual', { value: yuan(result.tax.annual) })}</span>
          <span>{t('payroll-cn.bracketRate', { rate: pct(result.tax.bracketRate) })}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('payroll-cn.taxNote')}</p>
      </div>

      {/* Contribution breakdowns */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ContributionCard
          title={t('payroll-cn.personal')}
          data={result.employee}
          t={t}
          showEmployerOnly={false}
          clamped={result.appliedBases.siClamped}
        />
        <ContributionCard
          title={t('payroll-cn.employer')}
          data={result.employer}
          t={t}
          showEmployerOnly
          clamped={result.appliedBases.siClamped}
        />
      </div>
    </div>
  )
}

function CompositionBar({
  result,
  t,
}: {
  result: PayrollResult
  t: ReturnType<typeof useTranslation>['t']
}) {
  const gross = result.netSalary + result.employee.total + result.tax.monthlyAvg
  if (gross <= 0) return null
  const segments = [
    { key: 'net', value: result.netSalary, className: 'bg-emerald-500' },
    { key: 'insurance', value: result.employee.total, className: 'bg-sky-500' },
    { key: 'tax', value: result.tax.monthlyAvg, className: 'bg-amber-500' },
  ]
  return (
    <div className="mt-4 space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <div
            key={s.key}
            className={s.className}
            style={{ width: `${(s.value / gross) * 100}%` }}
            title={`${t(`payroll-cn.seg.${s.key}`)}: ${yuan(s.value)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', s.className)} />
            {t(`payroll-cn.seg.${s.key}`)}
          </span>
        ))}
      </div>
    </div>
  )
}

const EMPLOYEE_ROWS: (keyof ContributionBreakdown)[] = [
  'pension',
  'medical',
  'unemployment',
  'housingFund',
]
const EMPLOYER_ROWS: (keyof ContributionBreakdown)[] = [
  'pension',
  'medical',
  'unemployment',
  'injury',
  'maternity',
  'housingFund',
]

function ContributionCard({
  title,
  data,
  t,
  showEmployerOnly,
  clamped,
}: {
  title: string
  data: ContributionBreakdown
  t: ReturnType<typeof useTranslation>['t']
  showEmployerOnly: boolean
  clamped: boolean
}) {
  const rows = showEmployerOnly ? EMPLOYER_ROWS : EMPLOYEE_ROWS
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-base font-semibold tabular-nums">{yuan(data.total)}</span>
      </div>
      <dl className="space-y-1.5">
        {rows.map((key) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <dt className="text-muted-foreground">{t(`payroll-cn.item.${key}`)}</dt>
            <dd className="tabular-nums">{yuan(data[key])}</dd>
          </div>
        ))}
      </dl>
      {clamped && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
          {t('payroll-cn.baseClamped')}
        </p>
      )}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
