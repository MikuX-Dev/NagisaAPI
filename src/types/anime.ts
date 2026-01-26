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
  title: string
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
