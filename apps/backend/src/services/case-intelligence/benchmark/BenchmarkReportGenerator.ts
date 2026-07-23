import type {
  BenchmarkReportArtifact,
  BenchmarkReportRequest,
} from './types/benchmark.types'

export interface BenchmarkReportGenerator {
  generate(request: BenchmarkReportRequest): Promise<BenchmarkReportArtifact>
}

export default BenchmarkReportGenerator
