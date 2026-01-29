import type {
  CrysolineProviderEpisode,
  ProviderInfo,
  ProviderSearch,
} from '../../types/provider'
import { Provider } from './meta'

export abstract class AnimeBase extends Provider {
  public apiKey: string = process.env.CRYSOLINE_API_KEY || ''
  abstract providerType: ('H-SUB' | 'SUB' | 'DUB')[]

  abstract getInfo(id: string): Promise<ProviderInfo | undefined>
  abstract getEpisodes(
    id: string,
  ): Promise<CrysolineProviderEpisode[] | undefined>
  abstract search(query: string): Promise<ProviderSearch[] | undefined>
}
