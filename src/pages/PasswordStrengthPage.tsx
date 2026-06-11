import { useMemo, useState } from 'react'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { evaluatePasswordStrength, type PasswordStrengthLevel } from '@/lib/tools/password-strength'

const LEVEL_LABELS: Record<PasswordStrengthLevel, string> = {
  empty: '待输入',
  weak: '弱',
  medium: '中',
  strong: '强',
  'very-strong': '很强',
}

const LEVEL_STYLES: Record<PasswordStrengthLevel, string> = {
  empty: 'bg-muted',
  weak: 'bg-red-500',
  medium: 'bg-amber-500',
  strong: 'bg-emerald-500',
  'very-strong': 'bg-green-600',
}

const CHECK_LABELS = [
  { key: 'lowercase', label: '小写字母' },
  { key: 'uppercase', label: '大写字母' },
  { key: 'digit', label: '数字' },
  { key: 'symbol', label: '特殊符号' },
] as const

export function PasswordStrengthPage() {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const result = useMemo(() => evaluatePasswordStrength(password), [password])
  const activeStyle = LEVEL_STYLES[result.level]
  const match = result.datasetMatches[0]

  return (
    <ToolLayout
      title="Password Strength"
      description="检查密码是否命中常见弱密码库，并根据长度、字符类型和常见模式评估强度。所有计算在浏览器本地完成。"
      category="Security"
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs">密码</Label>
          <div className="flex gap-2">
            <Input
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码..."
              className="font-mono text-sm"
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setVisible((value) => !value)}
              aria-label={visible ? '隐藏密码' : '显示密码'}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{LEVEL_LABELS[result.level]}</span>
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
          <p className="text-sm text-muted-foreground">{result.summary}</p>
        </div>

        {match && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="destructive">弱密码库命中</Badge>
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
            <div className="text-xs text-muted-foreground mb-2">字符组成</div>
            <div className="grid grid-cols-2 gap-2">
              {CHECK_LABELS.map((item) => {
                const passed = result.characterClasses[item.key]
                return (
                  <div key={item.key} className="flex items-center gap-2 text-sm">
                    <span className={cn('h-2 w-2 rounded-full', passed ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                    <span className={passed ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2">
            <div className="text-xs text-muted-foreground mb-2">检查结果</div>
            <div className="space-y-1.5">
              {result.passedChecks.length === 0 && result.warnings.length === 0 ? (
                <p className="text-sm text-muted-foreground">输入后显示检查项</p>
              ) : null}
              {result.passedChecks.map((item) => (
                <p key={item} className="text-sm text-emerald-700 dark:text-emerald-400">{item}</p>
              ))}
              {result.warnings.map((item) => (
                <p key={item} className="text-sm text-amber-700 dark:text-amber-400">{item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
