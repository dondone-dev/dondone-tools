import { createBLAKE2b, createBLAKE3, blake2b, blake3 } from 'hash-wasm'
import { createSingleHashTool } from './hashwasm-common'
import type { DigestOptions, FileDigestOptions } from './hashwasm-common'

export { isAbortError } from './hashwasm-common'

export type BlakeAlgorithm = 'blake2b' | 'blake3'

const tools = {
  blake2b: createSingleHashTool({
    createHasher: () => createBLAKE2b(),
    hashText: (bytes) => blake2b(bytes),
  }),
  blake3: createSingleHashTool({
    createHasher: () => createBLAKE3(),
    hashText: (bytes) => blake3(bytes),
  }),
}

function resolveAlgorithm(algorithm: string): BlakeAlgorithm {
  const normalized = String(algorithm || 'blake2b').trim().toLowerCase() as BlakeAlgorithm
  if (normalized in tools) return normalized
  throw new Error(`Unsupported BLAKE algorithm: ${algorithm}`)
}

export async function digestText({ algorithm = 'blake2b', ...options }: DigestOptions & { algorithm?: BlakeAlgorithm }): Promise<string> {
  return tools[resolveAlgorithm(algorithm)].digestText(options)
}

export async function digestFile(file: File, { algorithm = 'blake2b', ...options }: FileDigestOptions & { algorithm?: BlakeAlgorithm } = {}): Promise<string> {
  return tools[resolveAlgorithm(algorithm)].digestFile(file, options)
}
