import type {
  BenchmarkProvider,
  BenchmarkProviderId,
} from './types/benchmark.types'

export class ProviderRegistry {
  private readonly providers = new Map<BenchmarkProviderId, BenchmarkProvider>()

  register(provider: BenchmarkProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`benchmark_provider_already_registered:${provider.id}`)
    }
    this.providers.set(provider.id, provider)
  }

  list(): readonly BenchmarkProvider[] {
    return Array.from(this.providers.values())
  }

  has(providerId: BenchmarkProviderId): boolean {
    return this.providers.has(providerId)
  }

  get(providerId: BenchmarkProviderId): BenchmarkProvider {
    const provider = this.providers.get(providerId)
    if (!provider) throw new Error(`benchmark_provider_not_found:${providerId}`)
    return provider
  }
}

export default ProviderRegistry
