import { Meta } from '@crysoline/lib'
import ky, { type KyInstance } from 'ky'

import type {
  CrysolineProviderEpisode,
  ProviderInfo,
  ProviderSearch,
} from '../../types/provider'

import { AnimeBase } from '../base/anime'

class Toki extends AnimeBase {
  override name: string = 'toki'
  override providerType: ('H-SUB' | 'SUB' | 'DUB')[] = ['SUB', 'DUB']

  override url: string = 'https://zencloud.cc'

  public override client: KyInstance = ky.create({
    prefixUrl: this.url,
  })

  override async search(query: string): Promise<ProviderSearch[] | undefined> {
    const anilist = Meta.Anilist(this.apiKey)
    const res = await anilist.search(query)

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
  }

  override async getInfo(_id: string): Promise<ProviderInfo | undefined> {
    return undefined
  }

  override async getEpisodes(
    id: string,
  ): Promise<CrysolineProviderEpisode[] | undefined> {
    const res = await this.client
      .get(`videos/raw?anilist_id=${id}`)
      .json<ApiResponse>()

    const episodes: CrysolineProviderEpisode[] = res.data
      .map((r) => ({
        episodeId: r.access_id,
        id: id,
        number: r.episode,
      }))
      .sort((a, b) => a.number - b.number)

    return episodes
  }
}

export default Toki

export interface ApiResponse {
  status: 'success'
  data: EpisodeData[]
  pagination: Pagination
}

export interface EpisodeData {
  access_id: string
  imdb: string | null
  audio: string // could be narrowed to "dual" if you want
  anilist_id: number
  mal_id: number | null
  episode: number
  player_url: string
}

export interface Pagination {
  current_page: number
  per_page: number
  total_items: number
  total_pages: number
  next_page: number | null
  prev_page: number | null
}
