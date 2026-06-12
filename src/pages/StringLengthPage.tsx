import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { analyzeText, type StringLengthStats } from '@/lib/tools/string-length'

export function StringLengthPage() {
  const { t } = useTranslation('tools')
  const [input, setInput] = useState('')
  const stats: StringLengthStats | null = input ? analyzeText(input) : null

  const statItems = stats
    ? [
        { labelKey: 'string-length.lengthExclNewlines', value: stats.length1 },
        { labelKey: 'string-length.length', value: stats.length2 },
        { labelKey: 'string-length.chineseChars', value: stats.chinese },
        { labelKey: 'string-length.letters', value: stats.letters },
        { labelKey: 'string-length.digits', value: stats.digits },
        { labelKey: 'string-length.spaces', value: stats.spaces },
        { labelKey: 'string-length.halfWidth', value: stats.halfWidth },
        { labelKey: 'string-length.fullWidth', value: stats.fullWidth },
        { labelKey: 'string-length.newlines', value: stats.newlines },
        { labelKey: 'string-length.totalLines', value: stats.totalLines },
      ]
    : []

  return (
    <ToolLayout toolId="string-length" category="Text">
      <div className="space-y-4">
        <Textarea
          placeholder={t('string-length.placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono text-sm min-h-[160px] resize-none"
        />
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {statItems.map((item) => (
              <div key={item.labelKey} className="bg-muted/50 rounded-md px-3 py-2">
                <div className="text-xs text-muted-foreground mb-0.5">{t(item.labelKey)}</div>
                <div className="text-lg font-semibold tabular-nums">{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
