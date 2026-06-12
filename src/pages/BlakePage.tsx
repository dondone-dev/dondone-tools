import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { HashToolLayout } from '@/components/tools/HashToolLayout'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { digestText, digestFile, type BlakeAlgorithm } from '@/lib/tools/blake'

export function BlakePage() {
  const { t } = useTranslation('tools')
  const [algorithm, setAlgorithm] = useState<BlakeAlgorithm>('blake2b')

  const label = algorithm === 'blake2b' ? 'BLAKE2b' : 'BLAKE3'

  return (
    <ToolLayout toolId="blake" category="Hash">
      <div className="flex items-center gap-2 mb-4">
        <Label className="text-xs text-muted-foreground shrink-0">{t('blake.algorithm')}</Label>
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
