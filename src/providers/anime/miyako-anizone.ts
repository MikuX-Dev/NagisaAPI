import { Anime } from '@crysoline/lib'
import type {
  CrysolineProviderEpisode,
  ProviderInfo,
  ProviderSearch,
} from '../../types/provider'

import { AnimeBase } from '../base/anime'

class Miyako extends AnimeBase {
  override name: string = 'miyako'
  override url = 'https://anizone.to'
  override providerType: ('H-SUB' | 'SUB' | 'DUB')[] = ['SUB', 'DUB']

  private provider = Anime.AniZone(this.apiKey)

  override async search(query: string): Promise<ProviderSearch[] | undefined> {
    try {
      const res = await this.provider.search(query)

      return res.map((r) => ({
        title:
          r.title?.english ??
          r.title?.romaji ??
          r.title?.japanese ??
          r.title?.japanese ??
          r.title?.other ??
          '',
        id: r.id ?? '',
        year: (r as { year: number })?.year ?? undefined,
        totalEpisodes: r.totalEpisodes ?? undefined,
      }))
    } catch {
      return undefined
    }
  }

  override async getInfo(id: string): Promise<ProviderInfo | undefined> {
    try {
      const res = await this.provider.info(id)

      const info: ProviderInfo = {
        id: res.id?.toString() ?? undefined,
        titles: [
          {
            languageCode: 'english',
            title: res.title?.english ?? '',
          },
          {
            languageCode: 'romaji',
            title: res.title?.romaji ?? '',
          },
          {
            languageCode: 'japanese',
            title: res.title?.japanese ?? '',
          },
        ],

        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      return info
    } catch {
      return undefined
    }
  }

  override async getEpisodes(
    id: string,
  ): Promise<CrysolineProviderEpisode[] | undefined> {
    try {
      const res = await this.provider.episodes(id)
      const episodes: CrysolineProviderEpisode[] = res.map((r, idx) => ({
        titles: [
          {
            languageCode: 'english',
            title: r.title ?? '',
          },
        ],
        preview: r.teaserUrl,
        id: r.id?.toString(),
        hasDub: false,
        number: r.number ?? idx + 1,

        createdAt: Date.now(),
        updatedAt: Date.now(),
      }))

      return episodes
    } catch {
      return undefined
    }
  }
}

export default Miyako
