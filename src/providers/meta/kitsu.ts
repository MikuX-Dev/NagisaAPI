import ky, { type KyInstance } from 'ky'

import type { ITitle } from '../../types/anime'
import type { FribbAnime, ProviderInfo } from '../../types/provider'
import { MetaBase } from '../base/meta'

class Kitsu extends MetaBase {
  override name: string = 'kitsu'
  override url: string = 'https://kitsu.app'

  public override client: KyInstance = ky.create({
    prefixUrl: `${this.url}/api`,
  })

  override async getInfo(
    fribbAnime: FribbAnime,
  ): Promise<ProviderInfo | undefined> {
    const kitsuId = fribbAnime.kitsu_id

    if (!kitsuId) return undefined

    const kitsuData = await this.client
      .get(`edge/anime/${kitsuId}`)
      .json<KitsuAnimeResponse>()

    const anime = kitsuData.data

    const coverImage =
      anime.attributes.posterImage.original ??
      anime.attributes.posterImage.large ??
      anime.attributes.posterImage.medium ??
      null
    const bannerImage =
      anime.attributes.coverImage?.original ??
      anime.attributes.coverImage?.large ??
      anime.attributes.coverImage?.medium ??
      null

    const description =
      anime.attributes.synopsis ?? anime.attributes.description

    const titles: ITitle[] = [
      {
        languageCode: 'english',
        title: anime.attributes.titles.en,
      },
      {
        languageCode: 'japanese',
        title: anime.attributes.titles.en_jp,
      },
      {
        languageCode: 'romaji',
        title: anime.attributes.titles.ja_jp,
      },
    ]

    return {
      titles,
      bannerImage,
      coverImage,
      description,

      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }
}

export default Kitsu

export interface KitsuAnimeResponse {
  data: KitsuAnimeData
}

export interface KitsuAnimeData {
  id: string
  type: string
  links: KitsuAnimeLinks
  attributes: KitsuAnimeAttributes
  relationships: KitsuAnimeRelationships
}

export interface KitsuAnimeLinks {
  self: string
}

export interface KitsuAnimeAttributes {
  createdAt: string
  updatedAt: string
  slug: string
  synopsis: string
  description: string
  coverImageTopOffset: number
  titles: Titles
  canonicalTitle: string
  abbreviatedTitles: string[]
  averageRating: string
  ratingFrequencies: Record<string, string>
  userCount: number
  favoritesCount: number
  startDate: string
  endDate: string | null
  nextRelease: string | null
  popularityRank: number
  ratingRank: number
  ageRating: string
  ageRatingGuide: string
  subtype: string
  status: string
  tba: string | null
  posterImage: Image
  coverImage: Image
  episodeCount: number
  episodeLength: number
  totalLength: number
  youtubeVideoId: string
  showType: string
  nsfw: boolean
}

export interface Titles {
  en: string
  en_jp: string
  ja_jp: string
}

export interface Image {
  tiny: string
  small: string
  medium?: string
  large: string
  original: string
  meta?: ImageMeta
}

export interface ImageMeta {
  dimensions: {
    tiny?: ImageDimension
    small?: ImageDimension
    medium?: ImageDimension
    large?: ImageDimension
  }
}

export interface ImageDimension {
  width: number
  height: number
}

export interface KitsuAnimeRelationships {
  genres: RelationshipLinks
  categories: RelationshipLinks
  castings: RelationshipLinks
  installments: RelationshipLinks
  mappings: RelationshipLinks
  reviews: RelationshipLinks
  mediaRelationships: RelationshipLinks
  characters: RelationshipLinks
  staff: RelationshipLinks
  productions: RelationshipLinks
  quotes: RelationshipLinks
  episodes: RelationshipLinks
  streamingLinks: RelationshipLinks
  animeProductions: RelationshipLinks
  animeCharacters: RelationshipLinks
  animeStaff: RelationshipLinks
}

export interface RelationshipLinks {
  links: {
    self: string
    related: string
  }
}
