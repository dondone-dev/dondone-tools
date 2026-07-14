import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { BENCHMARK_SEED } from './cpu-benchmark'
import { instantiateBenchmarkKernel, verifyBenchmarkKernel, type BenchmarkKernel } from './cpu-benchmark-wasm'

async function loadKernelForTest() {
  const bytes = await readFile(`${process.cwd()}/src/lib/tools/cpu-benchmark-workload.wasm`)
  return instantiateBenchmarkKernel(bytes)
}

describe('CPU benchmark WASM kernel', () => {
  it('produces deterministic checksums for the same block', async () => {
    const kernel = await loadKernelForTest()

    expect(kernel.runBlock(BENCHMARK_SEED, 0)).toBe(kernel.runBlock(BENCHMARK_SEED, 0))
  })

  it('mixes the block index into the workload', async () => {
    const kernel = await loadKernelForTest()

    expect(kernel.runBlock(BENCHMARK_SEED, 0)).not.toBe(kernel.runBlock(BENCHMARK_SEED, 1))
  })

  it('matches the frozen self-test checksum', async () => {
    const kernel = await loadKernelForTest()

    expect(verifyBenchmarkKernel(kernel)).toBe(true)
  })

  it('rejects a kernel with an unexpected self-test checksum', () => {
    const invalidKernel: BenchmarkKernel = {
      selfTest: () => 0,
      runBlock: () => 0,
    }

    expect(verifyBenchmarkKernel(invalidKernel)).toBe(false)
  })

  it('rejects invalid WebAssembly bytes', async () => {
    await expect(instantiateBenchmarkKernel(new Uint8Array([0, 1, 2, 3]))).rejects.toBeInstanceOf(WebAssembly.CompileError)
  })
})
