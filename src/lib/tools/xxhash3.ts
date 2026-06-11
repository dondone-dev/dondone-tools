import { createXXHash3, createXXHash128, xxhash3, xxhash128 } from 'hash-wasm'
import { createMultiHashTool } from './hashwasm-common'
import type { DigestOptions, FileDigestOptions } from './hashwasm-common'

export { isAbortError } from './hashwasm-common'

export type XxHash3Results = {
  'xxhash3-64': string
  'xxhash3-128': string
}

const tool = createMultiHashTool({
  algorithms: [
    { key: 'xxhash3-64', createHasher: () => createXXHash3(), hashText: (bytes) => xxhash3(bytes) },
    { key: 'xxhash3-128', createHasher: () => createXXHash128(), hashText: (bytes) => xxhash128(bytes) },
  ],
})

export async function digestText(options: DigestOptions): Promise<XxHash3Results> {
  return tool.digestText(options) as Promise<XxHash3Results>
}

export async function digestFile(file: File, options?: FileDigestOptions): Promise<XxHash3Results> {
  return tool.digestFile(file, options) as Promise<XxHash3Results>
}
