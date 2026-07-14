import benchmarkWasmUrl from './cpu-benchmark-workload.wasm?url'

export type BenchmarkKernel = {
  runBlock(seed: number, blockIndex: number): number
  selfTest(): number
}

export const KERNEL_SELF_TEST_CHECKSUM = 4_092_411_906

export async function instantiateBenchmarkKernel(bytes: BufferSource): Promise<BenchmarkKernel> {
  const { instance } = await WebAssembly.instantiate(bytes, {
    env: {
      abort: () => {
        throw new Error('Benchmark kernel aborted')
      },
    },
  })
  return instance.exports as unknown as BenchmarkKernel
}

export async function loadBenchmarkKernel(): Promise<BenchmarkKernel> {
  const response = await fetch(benchmarkWasmUrl)
  return instantiateBenchmarkKernel(await response.arrayBuffer())
}

export function verifyBenchmarkKernel(kernel: BenchmarkKernel): boolean {
  return kernel.selfTest() >>> 0 === KERNEL_SELF_TEST_CHECKSUM
}
