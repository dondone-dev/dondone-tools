import { ToolLayout } from '@/components/layout/ToolLayout'
import { HashToolLayout } from '@/components/tools/HashToolLayout'
import { digestText, digestFile } from '@/lib/tools/md5'

export function Md5Page() {
  return (
    <ToolLayout title="MD5" description="计算文本或文件的 MD5 哈希值。所有计算在浏览器本地完成，文件不会上传。" category="Hash">
      <HashToolLayout
        title="MD5"
        description=""
        category="Hash"
        singleResult
        resultRows={[{ label: 'MD5', key: 'result' }]}
        onDigestText={async (input, enc) => ({ result: digestText({ input, outputEncoding: enc as 'hex' | 'base64' }) })}
        onDigestFile={async (file, enc, onProgress, signal) => {
          const result = await digestFile(file, { outputEncoding: enc as 'hex' | 'base64', onProgress: (p) => onProgress(p.percent), signal })
          return { result }
        }}
      />
    </ToolLayout>
  )
}
