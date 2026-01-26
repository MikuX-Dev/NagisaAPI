import type { IFormat } from '../types/anime'
import type { AnilistMediaFormat } from '../types/provider'

export const mapAniListFormatToIFormat = (
  format: AnilistMediaFormat | null,
): IFormat | null => {
  switch (format) {
    case 'TV':
    case 'TV_SHORT':
      return 'tv show'
    case 'MOVIE':
      return 'movie'
    case 'SPECIAL':
      return 'special'
    case 'OVA':
      return 'ova'
    case 'ONA':
      return 'ona'
    case 'MUSIC':
      return 'music'
    case 'MANGA':
      return 'manga'
    case 'NOVEL':
      return 'novel'
    case 'ONE_SHOT':
      return 'one shot'
    default:
      return null
  }
}
