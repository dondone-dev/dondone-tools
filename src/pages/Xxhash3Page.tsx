import { ToolLayout } from '@/components/layout/ToolLayout'
import { HashToolLayout } from '@/components/tools/HashToolLayout'
import { digestText, digestFile } from '@/lib/tools/xxhash3'

export function Xxhash3Page() {
  return (
    <ToolLayout toolId="xxhash3" category="Hash">
      <HashToolLayout
        title="xxHash3"
        description=""
        category="Hash"
        resultRows={[
          { label: 'xxHash3-64', key: 'xxhash3-64' },
          { label: 'xxHash3-128', key: 'xxhash3-128' },
        ]}
        onDigestText={async (input, enc) => digestText({ input, outputEncoding: enc as 'hex' | 'base64' })}
        onDigestFile={async (file, enc, onProgress, signal) =>
          digestFile(file, { outputEncoding: enc as 'hex' | 'base64', onProgress: (p) => onProgress(p.percent), signal })
        }
      />
    </ToolLayout>
  )
}
