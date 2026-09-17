import { generateSshKeyPair, type GenerateOptions, type SshKeyPairResult } from './ssh-keygen'

type Request = { type: 'generate'; id: number; options: GenerateOptions }
type Response =
  | { type: 'result'; id: number; result: SshKeyPairResult }
  | { type: 'error'; id: number; message: string }

self.onmessage = async (event: MessageEvent<Request>) => {
  const { type, id, options } = event.data
  if (type !== 'generate') return
  try {
    const result = await generateSshKeyPair(options)
    const response: Response = { type: 'result', id, result }
    ;(self as unknown as Worker).postMessage(response)
  } catch (err) {
    const response: Response = { type: 'error', id, message: err instanceof Error ? err.message : String(err) }
    ;(self as unknown as Worker).postMessage(response)
  }
}
