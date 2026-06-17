import { pipeline, RawImage } from '@huggingface/transformers'

const MODEL_ID = 'onnx-community/BiRefNet_lite-ONNX'

type PipelineFn = Awaited<ReturnType<typeof pipeline>>

let _pipe: PipelineFn | null = null
let _creating: Promise<PipelineFn> | null = null
let _backend: 'webgpu' | 'wasm' = 'wasm'

type ProgressCb = (x: { status: string; loaded?: number; total?: number }) => void

async function createPipeline(progressCb: ProgressCb): Promise<PipelineFn> {
  const isSafari = /^((?!chrome|crios).)*safari/i.test(
    (self as unknown as { navigator: Navigator }).navigator?.userAgent ?? '',
  )
  const hasGpu = !isSafari && 'gpu' in (self as unknown as { navigator: Navigator }).navigator

  if (hasGpu) {
    try {
      const p = await pipeline('background-removal', MODEL_ID, {
        device: 'webgpu',
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

  _creating = createPipeline(progressCb).then((p) => {
    _pipe = p
    _creating = null
    return p
  }).catch((err) => {
    _creating = null
    throw err
  })

  return _creating
}

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data as
    | { type: 'remove'; blob: Blob; id: number }
    | { type: 'dispose' }

  if (msg.type === 'dispose') {
    if (_pipe) {
      try { await (_pipe as unknown as { dispose?: () => Promise<void> }).dispose?.() } catch { /* ignore */ }
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
      const outputs = await (pipe as unknown as (input: Blob) => Promise<RawImage[]>)(blob)
      const output = outputs[0]

      // Ensure RGBA (4 channels) for ImageData
      const rgba = output.channels === 4 ? output : output.rgba()
      const canvas = new OffscreenCanvas(rgba.width, rgba.height)
      const ctx = canvas.getContext('2d')!
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(rgba.data), rgba.width, rgba.height),
        0, 0,
      )
      const resultBlob = await canvas.convertToBlob({ type: 'image/png' })
      self.postMessage({ type: 'result', blob: resultBlob, id })
    } catch (err) {
      self.postMessage({
        type: 'error',
        kind: 'inference',
        message: err instanceof Error ? err.message : String(err),
        id,
      })
    }
  }
}
