import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { evaluatePasswordStrength, type PasswordStrengthLevel } from '@/lib/tools/password-strength'

const LEVEL_STYLES: Record<PasswordStrengthLevel, string> = {
  empty: 'bg-muted',
  weak: 'bg-red-500',
  medium: 'bg-amber-500',
  strong: 'bg-emerald-500',
  'very-strong': 'bg-green-600',
}

const LEVEL_LABEL_KEYS: Record<PasswordStrengthLevel, string> = {
  empty: 'password-strength.levelEmpty',
  weak: 'password-strength.levelWeak',
  medium: 'password-strength.levelMedium',
  strong: 'password-strength.levelStrong',
  'very-strong': 'password-strength.levelVeryStrong',
}

const CHECK_KEYS = ['lowercase', 'uppercase', 'digit', 'symbol'] as const

export function PasswordStrengthPage() {
  const { t } = useTranslation('tools')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const result = useMemo(() => evaluatePasswordStrength(password), [password])
  const activeStyle = LEVEL_STYLES[result.level]
  const match = result.datasetMatches[0]

  return (
    <ToolLayout toolId="password-strength" category="Security">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs">{t('password-strength.password')}</Label>
          <div className="flex gap-2">
            <Input
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('password-strength.passwordPlaceholder')}
              className="font-mono text-sm"
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setVisible((value) => !value)}
              aria-label={visible ? t('password-strength.hidePassword') : t('password-strength.showPassword')}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t(LEVEL_LABEL_KEYS[result.level])}</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{result.score}/100</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className={cn(
                  'h-2 rounded-full transition-colors',
                  index < result.segmentCount ? activeStyle : 'bg-muted'
                )}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t(`password-strength.summary.${result.summary}`)}
          </p>
        </div>

        {match && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="destructive">{t('password-strength.weakPasswordHit')}</Badge>
              <span className="text-sm font-medium">{match.dataset}</span>
              {match.rank ? <span className="text-xs text-muted-foreground">#{match.rank}</span> : null}
            </div>
            {result.datasetMatches.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.datasetMatches.slice(1).map((item) => (
                  <Badge key={`${item.dataset}-${item.rank ?? 'main'}`} variant="outline">
                    {item.year ? `${item.year} #${item.rank}` : item.dataset}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <div className="text-xs text-muted-foreground mb-2">{t('password-strength.charComposition')}</div>
            <div className="grid grid-cols-2 gap-2">
              {CHECK_KEYS.map((key) => {
                const passed = result.characterClasses[key]
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className={cn('h-2 w-2 rounded-full', passed ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                    <span className={passed ? 'text-foreground' : 'text-muted-foreground'}>
                      {t(`password-strength.${key}`)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2">
            <div className="text-xs text-muted-foreground mb-2">{t('password-strength.checkResults')}</div>
            <div className="space-y-1.5">
              {result.passedChecks.length === 0 && result.warnings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('password-strength.enterToSeeChecks')}</p>
              ) : null}
              {result.passedChecks.map((key) => (
                <p key={key} className="text-sm text-emerald-700 dark:text-emerald-400">
                  {t(`password-strength.check.${key}`)}
                </p>
              ))}
              {result.warnings.map((key) => (
                <p key={key} className="text-sm text-amber-700 dark:text-amber-400">
                  {t(`password-strength.warn.${key}`)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
