import {
  BENCHMARK_SEED,
  BENCHMARK_VERSION,
  calculateBenchmarkMetrics,
  type BenchmarkSample,
  type BenchmarkWorkerEvent,
  type BenchmarkWorkerRequest,
} from './cpu-benchmark'
import { loadBenchmarkKernel, verifyBenchmarkKernel } from './cpu-benchmark-wasm'

function emit(event: BenchmarkWorkerEvent): void {
  self.postMessage(event)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mixChecksum(current: number, value: number): number {
  return (((current << 5) | (current >>> 27)) ^ value) >>> 0
}

async function run(durationMs: BenchmarkWorkerRequest['durationMs']): Promise<void> {
  const kernel = await loadBenchmarkKernel()
  emit({ type: 'phase', phase: 'validating' })
  if (!verifyBenchmarkKernel(kernel)) {
    emit({ type: 'invalid', reason: 'checksum' })
    return
  }

  emit({ type: 'phase', phase: 'warming' })
  const warmupStarted = performance.now()
  let warmupBlock = 0
  while (performance.now() - warmupStarted < 2000) {
    kernel.runBlock(BENCHMARK_SEED, warmupBlock)
    warmupBlock += 1
  }

  for (const value of [3, 2, 1]) {
    emit({ type: 'countdown', value })
    await delay(1000)
  }

  emit({ type: 'running' })
  const samples: BenchmarkSample[] = [{ elapsedMs: 0, completedUnits: 0, checksum: 0 }]
  const started = performance.now()
  let lastReported = started
  let completedUnits = 0
  let checksum = 0

  while (performance.now() - started < durationMs) {
    const blockChecksum = kernel.runBlock(BENCHMARK_SEED, completedUnits) >>> 0
    completedUnits += 1
    checksum = mixChecksum(checksum, blockChecksum)
    const now = performance.now()
    if (now - lastReported >= 250) {
      const sample = { elapsedMs: now - started, completedUnits, checksum }
      samples.push(sample)
      emit({ type: 'progress', sample })
      lastReported = now
    }
  }

  const effectiveMs = performance.now() - started
  const finalSample = { elapsedMs: effectiveMs, completedUnits, checksum }
  if (samples[samples.length - 1].completedUnits !== completedUnits) {
    samples.push(finalSample)
    emit({ type: 'progress', sample: finalSample })
  }

  emit({
    type: 'complete',
    result: {
      version: BENCHMARK_VERSION,
      durationMs,
      effectiveMs,
      completedUnits,
      checksum: checksum.toString(16).padStart(8, '0'),
      samples,
      ...calculateBenchmarkMetrics(samples, effectiveMs, completedUnits),
    },
  })
}

self.onmessage = (event: MessageEvent<BenchmarkWorkerRequest>) => {
  if (event.data.type !== 'start') return
  run(event.data.durationMs).catch((error) => {
    emit({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  })
}
