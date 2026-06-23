import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, HelpCircle, RefreshCw } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useClipboard } from '@/hooks/useClipboard'
import {
  MAX_RANDOM_STRING_LENGTH,
  MIN_RANDOM_STRING_LENGTH,
  generateRandomString,
  normalizeRandomStringOptions,
  type RandomStringOptions,
} from '@/lib/tools/random-string'

const DEFAULT_OPTIONS: Required<RandomStringOptions> = {
  length: 32,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSpecial: false,
  minimumNumbers: 1,
  avoidAmbiguous: false,
  beautifulString: false,
  startWithLetter: false,
}

type BooleanOption = 'includeUppercase' | 'includeLowercase' | 'includeNumbers' | 'includeSpecial' | 'avoidAmbiguous' | 'beautifulString' | 'startWithLetter'

export function RandomStringPage() {
  const { t } = useTranslation('tools')
  const [options, setOptions] = useState<Required<RandomStringOptions>>(DEFAULT_OPTIONS)
  const [value, setValue] = useState(() => generateRandomString(DEFAULT_OPTIONS))
  const { copiedText, copy } = useClipboard()

  const normalized = useMemo(() => normalizeRandomStringOptions(options), [options])
  const copied = copiedText === value

  function updateNumber(field: 'length' | 'minimumNumbers', nextValue: string) {
    const parsed = Number.parseInt(nextValue, 10)
    setOptions((current) => ({ ...current, [field]: Number.isNaN(parsed) ? 0 : parsed }))
  }

  function toggleOption(field: BooleanOption, checked: boolean) {
    setOptions((current) => {
      const next = { ...current, [field]: checked }
      if (field === 'includeNumbers' && !checked) next.minimumNumbers = 0
      if (field === 'beautifulString' && checked) next.includeSpecial = false
      return { ...next, ...pickNormalizedNumbers(next) }
    })
  }

  function handleGenerate() {
    const nextOptions = normalizeRandomStringOptions(options)
    setOptions((current) => ({ ...current, ...nextOptions }))
    setValue(generateRandomString(nextOptions))
  }

  return (
    <ToolLayout toolId="random-string" category="Random">
      <TooltipProvider>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] gap-4">
          <section className="space-y-3">
            <div className="rounded-md border bg-card">
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <Label className="text-xs text-muted-foreground">{t('random-string.result')}</Label>
                <div className="ml-auto flex items-center gap-1">
                  <IconButton label={t('random-string.regenerate')} onClick={handleGenerate}>
                    <RefreshCw className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={copied ? t('random-string.copied') : t('random-string.copy')} onClick={() => copy(value)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </IconButton>
                </div>
              </div>
              <div className="min-h-24 px-4 py-5 font-mono text-xl leading-relaxed break-all select-all sm:text-2xl">
                {value}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{t('random-string.characterSetSize', { count: normalized.characterSet.length })}</span>
              <span>{t('random-string.lengthRange')}</span>
            </div>
          </section>

          <section className="space-y-4 rounded-md border p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('random-string.length')} hint={t('random-string.lengthHint')}>
                <Input
                  type="number"
                  min={MIN_RANDOM_STRING_LENGTH}
                  max={MAX_RANDOM_STRING_LENGTH}
                  value={options.length}
                  onChange={(event) => updateNumber('length', event.target.value)}
                />
              </Field>
              <Field label={t('random-string.minimumNumbers')}>
                <Input
                  type="number"
                  min={0}
                  max={normalized.length}
                  value={options.minimumNumbers}
                  onChange={(event) => updateNumber('minimumNumbers', event.target.value)}
                />
              </Field>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('random-string.include')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <CheckboxRow id="random-string-uppercase" checked={normalized.includeUppercase} onCheckedChange={(checked) => toggleOption('includeUppercase', checked)} label={t('random-string.uppercase')} />
                <CheckboxRow id="random-string-lowercase" checked={normalized.includeLowercase} onCheckedChange={(checked) => toggleOption('includeLowercase', checked)} label={t('random-string.lowercase')} />
                <CheckboxRow id="random-string-numbers" checked={normalized.includeNumbers} onCheckedChange={(checked) => toggleOption('includeNumbers', checked)} label={t('random-string.numbers')} />
                <CheckboxRow
                  id="random-string-special"
                  checked={normalized.includeSpecial}
                  disabled={normalized.beautifulString}
                  onCheckedChange={(checked) => toggleOption('includeSpecial', checked)}
                  label={t('random-string.special')}
                />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <CheckboxRow
                id="random-string-ambiguous"
                checked={normalized.avoidAmbiguous}
                onCheckedChange={(checked) => toggleOption('avoidAmbiguous', checked)}
                label={t('random-string.avoidAmbiguous')}
                hint={t('random-string.avoidAmbiguousHint')}
              />
              <CheckboxRow
                id="random-string-beautiful"
                checked={normalized.beautifulString}
                onCheckedChange={(checked) => toggleOption('beautifulString', checked)}
                label={t('random-string.beautifulString')}
                hint={t('random-string.beautifulStringHint')}
              />
              <CheckboxRow
                id="random-string-start-letter"
                checked={normalized.startWithLetter}
                onCheckedChange={(checked) => toggleOption('startWithLetter', checked)}
                label={t('random-string.startWithLetter')}
              />
            </div>

            <Button onClick={handleGenerate} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('random-string.generate')}
            </Button>
          </section>
        </div>
      </TooltipProvider>
    </ToolLayout>
  )
}

function pickNormalizedNumbers(options: RandomStringOptions) {
  const normalized = normalizeRandomStringOptions(options)
  return {
    length: normalized.length,
    minimumNumbers: normalized.minimumNumbers,
    includeSpecial: normalized.includeSpecial,
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function CheckboxRow({
  id,
  checked,
  disabled,
  label,
  hint,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  disabled?: boolean
  label: string
  hint?: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <Label htmlFor={id} className="text-sm font-normal leading-none">
        {label}
      </Label>
      {hint ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground transition-colors hover:text-foreground" aria-label={hint}>
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64 leading-relaxed">{hint}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
