import type {
  IAirDate,
  IArtwork,
  ICharacter,
  IFormat,
  IGenre,
  ISeason,
  IStatus,
  IStudio,
  ITag,
  ITitle,
  RelationType,
} from './anime'

/**
 * @name ProviderInfo
 * @description It is used for information of the provdiers. Consistent. All the provider's informations will be mapped to this.
 */
export interface ProviderInfo {
  id?: string
  titles: ITitle[]
  synonyms?: string[]
  coverImage?: string | null
  bannerImage?: string | null
  logoImage?: string | null
  color?: string | null
  description?: string | null
  airDate?: IAirDate | null
  status?: IStatus | null
  format?: IFormat | null
  season?: ISeason | null
  relations?: IRelation[] | null
  currentEpisode?: number | null
  countryOfOrigin?: string | null
  totalEpisodes?: number | null
  subCount?: number | null
  dubCount?: number | null
  rating?: number | null
  ageRating?: string | null
  characters?: ICharacter[]
  artwork?: IArtwork[]
  studio?: IStudio[]
  genres?: IGenre[]
  tags?: ITag[]
  tagline?: string | null
  trailers?: Array<{
    id: string
    site: string | null
    thumbnail: string | null
  }>
  createdAt: number
  updatedAt: number

  ratelimit?: {
    retryAfter: number | null
    limit: number | null
    remaining: number | null
  }
}

export interface ProviderEpisode {
  id?: string | null
  titles?: ITitle[] | null
  thumbnailImage?: string | null
  preview?: string | null
  description?: string | null
  number?: number
  rating?: number | null
  filler?: boolean
  recap?: boolean
  runtime?: number | null
  ago?: string | null

  createdAt: number
  updatedAt: number
}

export interface CrysolineEpisode {
  id?: string | null
  episodeId?: string | null
  title?: string | null
  thumbnailImage?: string | null
  preview?: string | null
  description?: string | null
  filler?: boolean
  rating?: number | null
  recap?: boolean
  runtime?: number | null
  number?: number
}

export type CrysolineProviderEpisode = Omit<
  CrysolineEpisode,
  'subCount' | 'dubCount'
> & { hasDub?: boolean }

export interface ProviderSearch {
  id: string | number
  title: string
  year?: number
  totalEpisodes?: number
}

export type AnilistMediaStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'HIATUS'
  | 'CANCELLED'

export type AnilistMediaFormat =
  | 'TV'
  | 'TV_SHORT'
  | 'MOVIE'
  | 'SPECIAL'
  | 'OVA'
  | 'ONA'
  | 'MUSIC'
  | 'MANGA'
  | 'NOVEL'
  | 'ONE_SHOT'

export interface IRelation {
  relationType: RelationType | null
  id: number
  titles: ITitle[]
  format: AnilistMediaFormat | null
  type: string | null
}

export type FribbAnime = {
  type?: 'TV' | 'ONA' | 'MOVIE' | 'OVA' | 'SPECIAL'
  anidb_id?: number
  anilist_id?: number
  animecountdown_id?: number
  'anime-planet_id'?: string
  anisearch_id?: number
  imdb_id?: string
  kitsu_id?: number
  livechart_id?: number
  mal_id?: number
  simkl_id?: number
  themoviedb_id?: number
  tvdb_id?: number
  animenewsnetwork_id?: number
  season?: {
    tvdb?: number
    tmdb?: number
  }
}
