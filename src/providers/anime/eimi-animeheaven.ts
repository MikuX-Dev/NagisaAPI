import type { KyInstance } from 'ky'
import type {
  CrysolineProviderEpisode,
  ProviderInfo,
  ProviderSearch,
} from '../../types/provider'
import { AnimeBase } from '../base/anime'
import ky from 'ky'
import type { Episode, Info, Search, Source } from '@crysoline/lib'

class Eimi extends AnimeBase {
  override name: string = 'eimi'
  override url: string = 'https://animeheaven.me'
  override providerType: ('H-SUB' | 'SUB' | 'DUB')[] = ['H-SUB']

  public override client: KyInstance = ky.create({
    prefixUrl: 'https://api.crysoline.moe/api/anime/animeheaven',
    headers: {
      'x-api-key': this.apiKey,
    },
  })

  override async search(query: string): Promise<ProviderSearch[] | undefined> {
    try {
      const res = await this.client
        .get(`search?q=${encodeURIComponent(query)}`)
        .json<Search[]>()

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
    } catch (_error) {
      return undefined
    }
  }

  override async getInfo(id: string): Promise<ProviderInfo | undefined> {
    try {
      const res = await this.client.get(`info/${id}`).json<Info>()

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
    } catch (_error) {
      return undefined
    }
  }
  override async getEpisodes(
    id: string,
  ): Promise<CrysolineProviderEpisode[] | undefined> {
    try {
      const res = await this.client.get(`episodes/${id}`).json<Episode[]>()

      const episodes: CrysolineProviderEpisode[] = res.map((r, idx) => ({
        titles: [
          {
            languageCode: 'english',
            title: r.title ?? '',
          },
        ],
        preview: r.teaserUrl,
        id,
        episodeId: r.id?.toString(),
        hasDub: false,
        number: r.number ?? idx + 1,

        createdAt: Date.now(),
        updatedAt: Date.now(),
      }))

      return episodes
    } catch (_error) {
      return undefined
    }
  }

  override async getSources(
    id: string,
    episodeId: string,
    subType: string = 'sub',
  ): Promise<Source<unknown>> {
    const res = await this.client
      .get(`sources?id=${id}&episodeId=${episodeId}&subType=${subType}`)
      .json<Source>()

    return res
  }
}

export default Eimi
