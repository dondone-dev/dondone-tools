import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, PiggyBank, HeartPulse, Umbrella, ShieldCheck, Info, AlertTriangle } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  computeFlexibleInsurance,
  type FlexibleResult,
  type MedicalConfig,
} from '@/lib/tools/flexible-insurance'
import { CITY_PRESETS, DATA_SNAPSHOT, getFlexiblePreset } from '@/lib/tools/payroll-cn.data'

const DEFAULT_CITY = 'shanghai'

function yuan(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseAmount(raw: string): number | undefined {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function FlexibleInsurancePage() {
  const { t } = useTranslation('tools')

  const [cityId, setCityId] = useState(DEFAULT_CITY)
  const flex = getFlexiblePreset(cityId) ?? getFlexiblePreset(DEFAULT_CITY)!

  const [pensionBaseRaw, setPensionBaseRaw] = useState(() => String(getFlexiblePreset(DEFAULT_CITY)!.pensionBaseMin))
  const [includeMedical, setIncludeMedical] = useState(true)
  const [medicalBaseRaw, setMedicalBaseRaw] = useState(() => {
    const m = getFlexiblePreset(DEFAULT_CITY)!.medical
    return m.kind === 'rate' ? String(m.baseMin) : ''
  })
  const [pensionPct, setPensionPct] = useState(() => getFlexiblePreset(DEFAULT_CITY)!.pensionRate * 100)
  const [medicalPct, setMedicalPct] = useState(() => {
    const m = getFlexiblePreset(DEFAULT_CITY)!.medical
    return m.kind === 'rate' ? m.rate * 100 : 0
  })
  const [customRate, setCustomRate] = useState(false)

  function selectCity(id: string) {
    setCityId(id)
    const f = getFlexiblePreset(id)
    if (!f) return
    setPensionBaseRaw(String(f.pensionBaseMin))
    setPensionPct(f.pensionRate * 100)
    if (f.medical.kind === 'rate') {
      setMedicalBaseRaw(String(f.medical.baseMin))
      setMedicalPct(f.medical.rate * 100)
    } else {
      setMedicalBaseRaw('')
      setMedicalPct(0)
    }
  }

  const isRateMedical = flex.medical.kind === 'rate'

  const result = useMemo<FlexibleResult>(() => {
    const medical: MedicalConfig =
      flex.medical.kind === 'flat'
        ? { kind: 'flat', amount: flex.medical.amount }
        : {
            kind: 'rate',
            rate: (parseAmount(String(medicalPct)) ?? 0) / 100,
            base: parseAmount(medicalBaseRaw) ?? flex.medical.baseMin,
            baseMin: flex.medical.baseMin,
            baseMax: flex.medical.baseMax,
          }
    return computeFlexibleInsurance({
      pensionBase: parseAmount(pensionBaseRaw) ?? flex.pensionBaseMin,
      pensionBaseMin: flex.pensionBaseMin,
      pensionBaseMax: flex.pensionBaseMax,
      pensionRate: (parseAmount(String(pensionPct)) ?? 0) / 100,
      pensionAccountRate: flex.pensionAccountRate,
      unemploymentRate: flex.unemploymentRate,
      includeMedical,
      medical,
    })
  }, [flex, pensionBaseRaw, pensionPct, includeMedical, medicalBaseRaw, medicalPct])

  // 300% ceiling = 3 × local average, so average (100%) ≈ ceiling / 3.
  const pensionTiers = [
    { label: t('flexible-insurance.tierMin'), value: flex.pensionBaseMin },
    { label: t('flexible-insurance.tierAvg'), value: Math.round(flex.pensionBaseMax / 3) },
    { label: t('flexible-insurance.tierMax'), value: flex.pensionBaseMax },
  ]

  return (
    <ToolLayout toolId="flexible-insurance" category="Finance">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr] items-start">
        {/* ---------- Inputs ---------- */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:p-1.5">
          <Field label={t('flexible-insurance.city')}>
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
          {/* Pension */}
          <Field
            label={t('flexible-insurance.pensionBase')}
            hint={t('flexible-insurance.baseRange', {
              min: yuan(flex.pensionBaseMin),
              max: yuan(flex.pensionBaseMax),
            })}
          >
            <BaseInput value={pensionBaseRaw} onChange={setPensionBaseRaw} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pensionTiers.map((tier) => {
                const isSelected = String(tier.value) === pensionBaseRaw
                return (
                  <Button
                    key={tier.label}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="xs"
                    className="px-2"
                    onClick={() => setPensionBaseRaw(String(tier.value))}
                  >
                    {tier.label}
                  </Button>
                )
              })}
            </div>
          </Field>
          {/* Medical */}
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={includeMedical} onCheckedChange={(c) => setIncludeMedical(c === true)} />
            <span className="text-sm font-medium">{t('flexible-insurance.includeMedical')}</span>
          </label>
          {includeMedical && isRateMedical && flex.medical.kind === 'rate' && (
            <Field
              label={t('flexible-insurance.medicalBase')}
              hint={t('flexible-insurance.baseRange', {
                min: yuan(flex.medical.baseMin),
                max: yuan(flex.medical.baseMax),
              })}
            >
              <BaseInput value={medicalBaseRaw} onChange={setMedicalBaseRaw} />
            </Field>
          )}
          {includeMedical && !isRateMedical && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t('flexible-insurance.medicalFlat')}
            </p>
          )}

          {includeMedical && !flex.medicalConfirmed && (
            <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t('flexible-insurance.medicalApprox')}
            </p>
          )}

          {/* Advanced: custom rates (only meaningful for rate-based medical) */}
          {isRateMedical && (
            <div className="space-y-3 pt-1">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={customRate} onCheckedChange={(c) => setCustomRate(c === true)} />
                <span className="text-sm">{t('flexible-insurance.customRate')}</span>
              </label>
              {customRate && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('flexible-insurance.pensionRate')}>
                    <PercentInput value={pensionPct} onChange={setPensionPct} />
                  </Field>
                  <Field label={t('flexible-insurance.medicalRate')}>
                    <PercentInput value={medicalPct} onChange={setMedicalPct} />
                  </Field>
                </div>
              )}
            </div>
          )}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('flexible-insurance.privacy')}
          </p>
        </div>

        {/* ---------- Results ---------- */}
        <Results result={result} t={t} />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {t('flexible-insurance.disclaimer', { year: DATA_SNAPSHOT })}
      </p>
    </ToolLayout>
  )
}

function Results({
  result,
  t,
}: {
  result: FlexibleResult
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <div className="space-y-4">
      {/* Unified Bill Card */}
      <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
        {/* Hero Top */}
        <div className="bg-muted/30 p-6 border-b border-border/60">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Wallet className="h-4 w-4" />
                {t('flexible-insurance.monthlyTotal')}
              </div>
              <div className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                {yuan(result.monthlyTotal)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-muted-foreground">
                {t('flexible-insurance.annualTotal')}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {yuan(result.annualTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Insurance Breakdown Rows */}
        <div className="p-5 space-y-4">
          {/* Pension Row & Sub-details */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
                {t('flexible-insurance.pension')}
              </span>
              <span className="text-base font-semibold tabular-nums">{yuan(result.pension.amount)}</span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs text-muted-foreground bg-muted/25 rounded-lg p-2.5">
              <div>
                <div>{t('flexible-insurance.base')}</div>
                <div className="font-mono font-medium text-foreground mt-0.5">{yuan(result.pension.base)}</div>
              </div>
              <div>
                <div>{t('flexible-insurance.toAccount')}</div>
                <div className="font-mono font-medium text-foreground mt-0.5">{yuan(result.pension.toAccount)}</div>
              </div>
              <div>
                <div>{t('flexible-insurance.toPool')}</div>
                <div className="font-mono font-medium text-foreground mt-0.5">{yuan(result.pension.toPool)}</div>
              </div>
            </dl>
          </div>

          {/* Medical Row (if included) */}
          {result.medical && (
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between pb-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <HeartPulse className="h-4 w-4 text-muted-foreground" />
                  {t('flexible-insurance.medical')}
                </span>
                <span className="text-base font-semibold tabular-nums">{yuan(result.medical.amount)}</span>
              </div>
              {result.medical.base !== null && (
                <div className="text-xs text-muted-foreground">
                  {t('flexible-insurance.base')}：<span className="font-mono text-foreground">{yuan(result.medical.base)}</span>
                </div>
              )}
            </div>
          )}

          {/* Unemployment Row (if available) */}
          {result.unemployment && (
            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Umbrella className="h-4 w-4 text-muted-foreground" />
                {t('flexible-insurance.unemployment')}
              </span>
              <span className="text-base font-semibold tabular-nums">{yuan(result.unemployment.amount)}</span>
            </div>
          )}
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t('flexible-insurance.note')}
      </p>
    </div>
  )
}


function BaseInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        ¥
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        inputMode="decimal"
        className="pl-7 font-mono text-sm tabular-nums"
      />
    </div>
  )
}

function PercentInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^\d.]/g, ''))
          onChange(Number.isFinite(n) ? n : 0)
        }}
        inputMode="decimal"
        className="pr-7 font-mono text-sm tabular-nums"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        %
      </span>
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
