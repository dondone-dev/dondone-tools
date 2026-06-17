import { pipeline, RawImage, env } from '@huggingface/transformers'

// Persist downloaded model files in browser CacheStorage across page refreshes
env.useBrowserCache = true

const MODEL_ID = 'onnx-community/BiRefNet_lite-ONNX'

type PipelineFn = Awaited<ReturnType<typeof pipeline>>

let _pipe: PipelineFn | null = null
let _creating: Promise<PipelineFn> | null = null
let _backend: 'webgpu' | 'wasm' = 'wasm'
// Set to true when WebGPU inference fails at runtime (e.g. storage buffer limit);
// subsequent requests go straight to WASM without re-attempting WebGPU.
let _webgpuFailed = false

type ProgressCb = (x: { status: string; loaded?: number; total?: number }) => void

async function createPipeline(progressCb: ProgressCb): Promise<PipelineFn> {
  const isSafari = /^((?!chrome|crios).)*safari/i.test(
    (self as unknown as { navigator: Navigator }).navigator?.userAgent ?? '',
  )
  const hasGpu =
    !isSafari &&
    !_webgpuFailed &&
    'gpu' in (self as unknown as { navigator: Navigator }).navigator

  if (hasGpu) {
    try {
      const p = await pipeline('background-removal', MODEL_ID, {
        device: 'webgpu',
        dtype: 'fp16',
        progress_callback: progressCb,
      })
      _backend = 'webgpu'
      return p
    } catch {
      // fallthrough to WASM
    }
  }

  const p = await pipeline('background-removal', MODEL_ID, {
    progress_callback: progressCb,
  })
  _backend = 'wasm'
  return p
}

async function getOrCreate(id: number): Promise<PipelineFn> {
  if (_pipe) return _pipe
  if (_creating) return _creating

  const progressCb: ProgressCb = (x) => {
    if (x.status === 'progress') {
      self.postMessage({ type: 'progress', loaded: x.loaded ?? 0, total: x.total ?? 0, id })
    }
  }

  _creating = createPipeline(progressCb)
    .then((p) => {
      _pipe = p
      _creating = null
      return p
    })
    .catch((err) => {
      _creating = null
      throw err
    })

  return _creating
}

async function runInference(pipe: PipelineFn, blob: Blob): Promise<Blob> {
  const outputs = await (pipe as unknown as (input: Blob) => Promise<RawImage[]>)(blob)
  const output = outputs[0]
  const rgba = output.channels === 4 ? output : output.rgba()
  const canvas = new OffscreenCanvas(rgba.width, rgba.height)
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(rgba.data), rgba.width, rgba.height),
    0,
    0,
  )
  return canvas.convertToBlob({ type: 'image/png' })
}

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data as { type: 'remove'; blob: Blob; id: number } | { type: 'dispose' }

  if (msg.type === 'dispose') {
    if (_pipe) {
      try {
        await (_pipe as unknown as { dispose?: () => Promise<void> }).dispose?.()
      } catch {
        /* ignore */
      }
      _pipe = null
    }
    self.close()
    return
  }

  if (msg.type === 'remove') {
    const { blob, id } = msg

    let pipe: PipelineFn
    try {
      pipe = await getOrCreate(id)
    } catch (err) {
      self.postMessage({
        type: 'error',
        kind: 'load',
        message: err instanceof Error ? err.message : String(err),
        id,
      })
      return
    }

    self.postMessage({ type: 'model-ready', backend: _backend, id })

    try {
      const resultBlob = await runInference(pipe, blob)
      self.postMessage({ type: 'result', blob: resultBlob, id })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      // WebGPU inference can fail at runtime on some hardware (e.g. storage buffer
      // limits). Transparently recreate the pipeline with WASM and retry once.
      if (_backend === 'webgpu') {
        _webgpuFailed = true
        try {
          await (_pipe as unknown as { dispose?: () => Promise<void> }).dispose?.()
        } catch {
          /* ignore */
        }
        _pipe = null
        _creating = null

        try {
          const wasmPipe = await getOrCreate(id)
          self.postMessage({ type: 'model-ready', backend: _backend, id })
          const retryBlob = await runInference(wasmPipe, blob)
          self.postMessage({ type: 'result', blob: retryBlob, id })
        } catch (retryErr) {
          const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
          const kind = retryMsg.includes('bad_alloc') ? 'oom' : 'inference'
          self.postMessage({ type: 'error', kind, message: retryMsg, id })
        }
        return
      }

      const kind = message.includes('bad_alloc') ? 'oom' : 'inference'
      self.postMessage({ type: 'error', kind, message, id })
    }
  }
}
