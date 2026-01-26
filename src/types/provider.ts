import type {
  ITitle,
  IStatus,
  IStudio,
  IGenre,
  ITag,
  ICharacter,
  IAirDate,
} from './anime'

/**
 * @name ProviderInfo
 * @description It is used for information of the provdiers. Consistent. All the provider's informations will be mapped to this.
 */
export interface ProviderInfo {
  titles: ITitle[]
  synonyms: string[]
  coverImage?: string | null
  bannerImage?: string | null
  logoImage?: string | null
  description?: string | null
  airDate?: IAirDate | null
  status?: IStatus | null
  totalEpisodes?: number | null
  subCount?: number | null
  dubCount?: number | null
  rating?: number | null
  ageRating?: string | null
  characters?: ICharacter[]
  studio?: IStudio[]
  genres?: IGenre[]
  tags?: ITag[]
  createdAt: number
  updatedAt: number
}

export interface ProviderEpisode {
  id?: string | null
  title?: ITitle[] | null
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

export type AnilistMediaStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'HIATUS'
  | 'CANCELLED'

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
  season?: {
    tvdb?: number
    tmdb?: number
  }
}
