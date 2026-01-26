import ky, { type KyInstance } from 'ky'
import type { FribbAnime, ProviderInfo } from '../../types/provider'

export abstract class Provider {
  abstract name: string
  abstract url: string

  public client: KyInstance = ky
}

export abstract class MetaBase extends Provider {
  abstract getInfo(anime: FribbAnime): Promise<ProviderInfo | undefined>
}
