import path from 'node:path'
import { describe, expect, it } from 'vitest'
import BenchmarkCaseLoader from '../../src/services/case-intelligence/benchmark/BenchmarkCaseLoader'

const benchmarkRoot = path.resolve(__dirname, '../../../../test-data/case-intelligence-benchmark')

describe('BenchmarkCaseLoader', () => {
  it('loads the versioned benchmark manifest', async () => {
    const loader = new BenchmarkCaseLoader(benchmarkRoot)

    await expect(loader.loadManifest()).resolves.toEqual({
      version: '1.0',
      cases: ['case-001', 'case-002', 'case-003', 'case-004', 'case-006'],
    })
    await expect(loader.listCaseIds()).resolves.toEqual([
      'case-001',
      'case-002',
      'case-003',
      'case-004',
      'case-006',
    ])
  })

  it('loads all cases declared by the manifest', async () => {
    const cases = await new BenchmarkCaseLoader(benchmarkRoot).loadCasesFromManifest()

    expect(cases).toHaveLength(5)
    expect(cases.map((benchmarkCase) => benchmarkCase.caseId))
      .toEqual(['case-001', 'case-002', 'case-003', 'case-004', 'case-006'])
  })

  it('keeps direct single-case loading compatible', async () => {
    const benchmarkCase = await new BenchmarkCaseLoader(benchmarkRoot).load('case-006')

    expect(benchmarkCase.caseId).toBe('case-006')
    expect(benchmarkCase.input.title).toContain('股权转让')
    expect(benchmarkCase.goldenCaseModel.identity.jurisdiction).toBe('中国大陆')
  })

  it('loads case-001 from the V2 cases directory', async () => {
    const benchmarkCase = await new BenchmarkCaseLoader(benchmarkRoot).load('case-001')

    expect(benchmarkCase).toMatchObject({
      caseId: 'case-001',
      input: { case_id: 'case-001', title: '海川食品与华东智造设备买卖合同纠纷' },
      goldenCaseModel: { identity: { caseId: 'case-001', caseType: '设备买卖合同纠纷' } },
    })
  })

  it('falls back to the legacy directory for case-006', async () => {
    const benchmarkCase = await new BenchmarkCaseLoader(benchmarkRoot).load('case-006')

    expect(benchmarkCase.caseId).toBe('case-006')
    expect(benchmarkCase.input.case_id).toBe('case-006')
  })
})
