import { describe, expect, it } from 'vitest'
import {
  ProviderBootstrap,
  bootstrapBenchmarkProviders,
} from '../../src/services/case-intelligence/benchmark/ProviderBootstrap'
import ProviderRegistry from '../../src/services/case-intelligence/benchmark/ProviderRegistry'
import { BENCHMARK_PROVIDER_IDS } from '../../src/services/case-intelligence/benchmark/types/benchmark.types'

describe('ProviderBootstrap', () => {
  it('registers every benchmark provider in the registry', () => {
    const registry = new ProviderBootstrap().bootstrap()

    expect(registry.list().map((provider) => provider.id)).toEqual(BENCHMARK_PROVIDER_IDS)
    for (const providerId of BENCHMARK_PROVIDER_IDS) {
      expect(registry.has(providerId)).toBe(true)
      expect(registry.get(providerId)).toMatchObject({ id: providerId })
      expect(registry.get(providerId).generateCaseModel).toBeTypeOf('function')
    }
  })

  it('can populate a supplied registry', () => {
    const registry = new ProviderRegistry()

    expect(bootstrapBenchmarkProviders(registry)).toBe(registry)
    expect(registry.list()).toHaveLength(8)
    expect(registry.get('enhanced-v3-minimax')).toMatchObject({
      id: 'enhanced-v3-minimax',
      model: expect.any(String),
    })
    expect(registry.get('enhanced-v4-minimax')).toMatchObject({
      id: 'enhanced-v4-minimax',
      model: expect.any(String),
    })
  })

  it('keeps duplicate handling inside the registry', () => {
    const registry = bootstrapBenchmarkProviders()

    expect(() => new ProviderBootstrap().bootstrap(registry))
      .toThrow('benchmark_provider_already_registered:mock')
  })
})
