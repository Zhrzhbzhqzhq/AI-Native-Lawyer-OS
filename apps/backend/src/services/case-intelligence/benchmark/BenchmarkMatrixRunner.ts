import type {
  BenchmarkMatrixReport,
  BenchmarkMatrixRequest,
} from './types/benchmark.types'

export interface BenchmarkMatrixRunner {
  run(request: BenchmarkMatrixRequest): Promise<BenchmarkMatrixReport>
}

export default BenchmarkMatrixRunner
