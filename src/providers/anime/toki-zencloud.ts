import { Meta, type Source } from '@crysoline/lib'
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

  async getSources(_id: string, episodeId: string, _type: string) {
    const res = await this.client
      .get<VideoResponse>(
        `file/direct_link?file_code=${episodeId}&ip=127.0.0.1&key=${process.env.ZEN_KEY}&=v2`,
      )
      .json()

    const intro = res.data.chapters.find(
      (chap) => chap.title.toLowerCase() === 'opening',
    )
    const outro = res.data.chapters.find(
      (chap) => chap.title.toLowerCase() === 'ending',
    )

    const source: Source = {
      sources: [
        {
          url: res.data.m3u8_url,
          isM3U8: true,
        },
      ],
      subtitles: res.data.subtitles.map((sub) => ({
        url: sub.url,
        label: `${sub.language_name} (${sub.title})`,
        srcLang: `${sub.language}`,
      })),
      thumbnails: res.data.has_vtt_thumbnails
        ? res.data.thumbnails_vtt_url
        : null,
      intro: {
        start: intro?.start_time,
        end: intro?.end_time,
      },
      outro: {
        start: outro?.start_time,
        end: outro?.end_time,
      },
      metadata: {
        chapters: res.data.chapters.map((chap) => ({
          id: chap.id,
          videoId: chap.video_id,
          name: chap.title,
          start: chap.start_time,
          end: chap.end_time,
        })),
        fonts: res.data.fonts,
      },
    }

    return source
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

interface VideoResponse {
  status: string
  data: VideoData
}

interface VideoData {
  file_id: string
  file_code: string
  original_filename: string
  created_at: string // ISO date string
  download_url: string
  player_url: string
  m3u8_url: string
  thumbnail_url: string
  has_subtitles: boolean
  subtitles: Subtitle[]
  fonts: Font[]
  chapters: Chapter[]
  has_vtt_thumbnails: boolean
  thumbnails_vtt_url: string
  token: string
  token_expires: string // ISO date string
  client_ip: string
  token_ip_bound: boolean
  premium_status: number
  premium_expires: string | null // could be null
}

interface Subtitle {
  url: string
  language: string
  language_name: string
  title: string
  format: string
  is_default: boolean
}

interface Font {
  name: string
  url: string
}

interface Chapter {
  id: string
  video_id: string
  start_time: number
  end_time: number
  title: string
  description: string
  created_at: string // ISO date string
}
