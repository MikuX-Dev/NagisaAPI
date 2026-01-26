import type { ITitle, IStatus, IStudio, IGenre, ITag } from './anime'

/**
 * @name ProviderInfo
 * @description It is used for information of the provdiers. Consistent. All the provider's informations will be mapped to this.
 */
export interface ProviderInfo {
  titles: ITitle[]
  coverImage?: string
  bannerImage?: string
  logoImage?: string
  description?: string
  airDate?: string
  status?: IStatus
  totalEpisodes?: number
  subCount?: number
  dubCount?: number
  rating?: number
  ageRating?: string | number
  studio?: IStudio[]
  genres?: IGenre[]
  tags?: ITag[]
  createdAt: number
  updatedAt: number
}

export type AnilistMediaStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'HIATUS'
  | 'CANCELLED'
