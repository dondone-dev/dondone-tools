import { useState } from 'react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { HashToolLayout } from '@/components/tools/HashToolLayout'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { digestText, digestFile, type BlakeAlgorithm } from '@/lib/tools/blake'

export function BlakePage() {
  const [algorithm, setAlgorithm] = useState<BlakeAlgorithm>('blake2b')

  const label = algorithm === 'blake2b' ? 'BLAKE2b' : 'BLAKE3'

  return (
    <ToolLayout title="BLAKE" description="计算 BLAKE2b 和 BLAKE3 哈希值，支持文本和文件输入。所有计算在浏览器本地完成。" category="Hash">
      <div className="flex items-center gap-2 mb-4">
        <Label className="text-xs text-muted-foreground shrink-0">算法</Label>
        <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as BlakeAlgorithm)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blake2b">BLAKE2b</SelectItem>
            <SelectItem value="blake3">BLAKE3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <HashToolLayout
        key={algorithm}
        title="BLAKE"
        description=""
        category="Hash"
        singleResult
        resultRows={[{ label, key: 'result' }]}
        onDigestText={async (input, enc) => {
          const result = await digestText({ algorithm, input, outputEncoding: enc as 'hex' | 'base64' })
          return { result }
        }}
        onDigestFile={async (file, enc, onProgress, signal) => {
          const result = await digestFile(file, { algorithm, outputEncoding: enc as 'hex' | 'base64', onProgress: (p) => onProgress(p.percent), signal })
          return { result }
        }}
      />
    </ToolLayout>
  )
}
