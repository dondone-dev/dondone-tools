import { useState } from 'react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Textarea } from '@/components/ui/textarea'
import { analyzeText, type StringLengthStats } from '@/lib/tools/string-length'

export function StringLengthPage() {
  const [input, setInput] = useState('')
  const stats: StringLengthStats | null = input ? analyzeText(input) : null

  const statItems = stats
    ? [
        { label: '字符数（不含换行）', value: stats.length1 },
        { label: '字符数（全半角计为1）', value: stats.length2 },
        { label: '中文字符', value: stats.chinese },
        { label: '字母', value: stats.letters },
        { label: '数字', value: stats.digits },
        { label: '空格', value: stats.spaces },
        { label: '半角字符', value: stats.halfWidth },
        { label: '全角字符', value: stats.fullWidth },
        { label: '换行数', value: stats.newlines },
        { label: '总行数', value: stats.totalLines },
      ]
    : []

  return (
    <ToolLayout title="String Length" description="统计字符串长度，包括字符数、字节数、行数、全角/半角字符统计。实时计算，无需点击。" category="Text">
      <div className="space-y-4">
        <Textarea
          placeholder="在此输入文本，统计结果实时显示..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono text-sm min-h-[160px] resize-none"
        />
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {statItems.map((item) => (
              <div key={item.label} className="bg-muted/50 rounded-md px-3 py-2">
                <div className="text-xs text-muted-foreground mb-0.5">{item.label}</div>
                <div className="text-lg font-semibold tabular-nums">{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
