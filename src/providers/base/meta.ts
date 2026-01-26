import type { ProviderInfo } from '../../types/provider'

export abstract class MetaBase {
  abstract name: string
  abstract url: string

  abstract getInfo(): ProviderInfo
}
