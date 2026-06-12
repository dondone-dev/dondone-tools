import { ToolLayout } from '@/components/layout/ToolLayout'
import { HashToolLayout } from '@/components/tools/HashToolLayout'
import { digestText, digestFile } from '@/lib/tools/sha2'

export function Sha2Page() {
  return (
    <ToolLayout toolId="sha2" category="Hash">
      <HashToolLayout
        title="SHA-2"
        description=""
        category="Hash"
        resultRows={[
          { label: 'SHA-224', key: 'sha224' },
          { label: 'SHA-256', key: 'sha256' },
          { label: 'SHA-384', key: 'sha384' },
          { label: 'SHA-512', key: 'sha512' },
        ]}
        onDigestText={async (input, enc) => digestText({ input, outputEncoding: enc as 'hex' | 'base64' })}
        onDigestFile={async (file, enc, onProgress, signal) =>
          digestFile(file, { outputEncoding: enc as 'hex' | 'base64', onProgress: (p) => onProgress(p.percent), signal })
        }
      />
    </ToolLayout>
  )
}
