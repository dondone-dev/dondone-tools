import { ToolLayout } from '@/components/layout/ToolLayout'
import { HashToolLayout } from '@/components/tools/HashToolLayout'
import { digestText, digestFile } from '@/lib/tools/sha3'

export function Sha3Page() {
  return (
    <ToolLayout title="SHA-3" description="计算 SHA3-224、SHA3-256、SHA3-384、SHA3-512 哈希值。所有计算在浏览器本地完成。" category="Hash">
      <HashToolLayout
        title="SHA-3"
        description=""
        category="Hash"
        resultRows={[
          { label: 'SHA3-224', key: 'sha3-224' },
          { label: 'SHA3-256', key: 'sha3-256' },
          { label: 'SHA3-384', key: 'sha3-384' },
          { label: 'SHA3-512', key: 'sha3-512' },
        ]}
        onDigestText={async (input, enc) => digestText({ input, outputEncoding: enc as 'hex' | 'base64' })}
        onDigestFile={async (file, enc, onProgress, signal) =>
          digestFile(file, { outputEncoding: enc as 'hex' | 'base64', onProgress: (p) => onProgress(p.percent), signal })
        }
      />
    </ToolLayout>
  )
}
