import type { IRelation } from './provider'

/**
 * @name IStatus
 * @description It is used for status of the provdiers. Consistent. All the provider's status will be mapped to this.
 */
export type IStatus =
  | 'airing'
  | 'finished'
  | 'cancelled'
  | 'hiatus'
  | 'upcoming'

export type StatusLabel =
  | 'Currently Airing'
  | 'Finished'
  | 'Cancelled'
  | 'Hiatus'
  | 'Coming Soon'

export type RelationType =
  | 'PREQUEL'
  | 'SEQUEL'
  | 'ALTERNATIVE'
  | 'SIDE_STORY'
  | 'PARENT'
  | 'SPIN_OFF'
  | 'OTHER'
  | 'ADAPTATION'

export type IFormat =
  | 'tv show' // combines tv and tv short
  | 'movie'
  | 'special'
  | 'ova'
  | 'ona'
  | 'music'
  | 'manga'
  | 'novel'
  | 'one shot'

export type ISeason = 'summer' | 'winter' | 'spring' | 'fall'

export interface ITitle {
  languageCode: string
  title: string | null
}

export interface IStudio {
  id: number
  name: string
}

export interface IGenre {
  id: number
  name: string
}

export interface ITag {
  id: number
  name: string
}

export interface IVoiceActor {
  image: string | null
  name: string | null
}

export interface ICharacter {
  image: string | null
  name: string | null
  role: string | null
  voiceActor: IVoiceActor
}

export interface IDate {
  month: number | null
  year: number | null
  day: number | null
  string: string | null
}

export interface IAirDate {
  start: IDate
  end: IDate
}

export type IArtwork = {
  type: 'banner' | 'poster' | 'clear_logo' | 'top_banner' | 'icon' | 'clear_art'
  image: string
  providerId: string
}

export interface Info {
  id: string
  slug: string
  title: string
  titles: ITitle[]
  synonyms: string[]
  externalIds: Record<string, string>
  coverImage: string | null
  bannerImage: string | null
  logoImage: string | null
  color: string | null
  description: string | null
  airDate: IAirDate | null
  status: IStatus | null
  format: IFormat | null
  season: ISeason | null
  relations: IRelation[] | null
  currentEpisode: number | null
  countryOfOrigin: string | null
  totalEpisodes: number | null
  subCount: number | null
  dubCount: number | null
  rating: number | null
  ageRating: string | null
  characters: ICharacter[]
  artwork: IArtwork[]
  studio: IStudio[]
  genres: IGenre[]
  tags: ITag[]
  createdAt: number
  updatedAt: number

  ratelimit?: {
    retryAfter: number | null
    limit: number | null
    remaining: number | null
  }
}

export interface Episode {
  id: string | null
  titles: ITitle[] | null
  thumbnailImage: string | null
  preview: string | null
  description: string | null
  number: number
  rating: number | null
  filler: boolean
  recap: boolean
  runtime: number | null
  ago: string | null
  providers: {
    episodeId: string
    id: string
    providerType: ('SUB' | 'DUB' | 'H-SUB')[]
    providerName: string
  }[]

  createdAt: number
  updatedAt: number
}

export interface DatabaseEpisode {
  id: string
  infoId: string
  titles:
    | {
        languageCode: string
        title: string | null
      }[]
    | null
  thumbnailImage: string | null
  preview: string | null
  description: string | null
  number: number
  rating: number | null
  filler: boolean
  recap: boolean
  runtime: number | null
  ago: string | null
  providers: {
    providerType: Array<'SUB' | 'DUB' | 'H-SUB'>
    providerName: string
    id?: string
    episodeId?: string
  }[]
  createdAt: string
  updatedAt: string
}
;[]
