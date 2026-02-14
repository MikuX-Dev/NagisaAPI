import { formatDistance } from 'date-fns'
import ky, { type KyInstance } from 'ky'

import type { IArtwork, ITitle } from '../../types/anime'
import type {
  FribbAnime,
  ProviderEpisode,
  ProviderInfo,
} from '../../types/provider'

import { MetaBase } from '../base/meta'

import Anilist, { type FuzzyDate } from './anilist'

class TheMovieDB extends MetaBase {
  override name: string = 'themoviedb'
  override url: string = 'https://api.themoviedb.org'

  public override client: KyInstance = ky.create({
    prefixUrl: `${this.url}/3`,
    timeout: 60000,
    searchParams: {
      api_key: process.env.TMDB_API_KEY,
    },
  })

  private anilist: Anilist = new Anilist()

  private parseDate(fuzzy: FuzzyDate | undefined | null): Date {
    const year = fuzzy?.year ?? 1970 // default year if missing
    const month = (fuzzy?.month ?? 1) - 1 // JS months are 0-indexed
    const day = fuzzy?.day ?? 1 // default day if missing

    return new Date(year, month, day)
  }

  private async getTranslations(
    seriesId: number,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<EpisodeTranslation[]> {
    try {
      const response = await this.client.get(
        `tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}/translations`,
      )

      if (!response.ok) {
        console.warn(
          `Failed to fetch translations for episode ${seasonNumber}x${episodeNumber}`,
        )
        return []
      }

      const data = await response.json<EpisodeTranslationsResponse>()
      return data.translations
    } catch (error) {
      console.warn(
        `Error fetching translations for episode ${seasonNumber}x${episodeNumber}:`,
        error,
      )
      return []
    }
  }

  // We need to make this function smarter.
  // TMDB Season.season_number = 0 is specials or we can get the special season by the name Specials.
  // OVA, ONA, SPECIAL from anilist are placed in "Specials" or season_number = 0 in tmdb.
  // So we need to fix our function so if anilist === special/ona/ova we do not filter out the specials season or season.season_number=0 and filter out the rest but if anilist !== special/ona/ova we filter the specials.
  // Anilist format from getInfo() are: "tv show" | "ova" | "ona" | "special" | "movie"
  public async getSeasons(fribbAnime: FribbAnime) {
    const type = fribbAnime.type?.toLowerCase() === 'movie' ? 'movie' : 'tv'
    const API_KEY = process.env.TMDB_API_KEY

    if (!API_KEY) {
      throw new Error('TMDB_API_KEY is not set')
    }

    if (!fribbAnime.themoviedb_id || !fribbAnime.anilist_id) {
      return undefined
    }

    const [tmdbResponse, alResponse] = await Promise.all([
      this.client.get(`${type}/${fribbAnime.themoviedb_id}?language=en-US`),
      this.anilist.getInfo(fribbAnime),
    ])

    if (!tmdbResponse.ok || !alResponse) {
      return undefined
    }

    const tmdbData = (await tmdbResponse.json()) as TMDBInfo
    const alType = alResponse.format?.toLowerCase() // "tv show" | "ova" | "ona" | "special" | "movie"
    const isAniListSpecial = ['ova', 'ona', 'special'].includes(
      alType as string,
    )

    if (
      type === 'movie' ||
      !tmdbData.seasons ||
      tmdbData.seasons.length === 0
    ) {
      return {
        ...tmdbData,
        allSeasons: tmdbData.seasons || [],
        isLongRunning: false,
        closestSeason: undefined,
        closestSeasonNumber: undefined,
      } as RegularResponse
    }

    // Logic for Specials:
    // If AniList is OVA/ONA/Special, we ONLY want season 0.
    // Otherwise, we want everything EXCEPT season 0.
    const filteredSeasonsForProcessing = tmdbData.seasons.filter((s) =>
      isAniListSpecial ? s.season_number === 0 : s.season_number !== 0,
    )

    const isLongRunning = alResponse.totalEpisodes
      ? alResponse.totalEpisodes > 50
      : false

    if (isLongRunning) {
      return {
        ...tmdbData,
        isLongRunning: true,
        allSeasons: filteredSeasonsForProcessing, // Only return the relevant seasons
      } as LongRunningResponse
    }

    const anilistDate = this.parseDate(alResponse.airDate?.start)
    if (!anilistDate) {
      return {
        ...tmdbData,
        allSeasons: filteredSeasonsForProcessing,
        isLongRunning: false,
        closestSeason: undefined,
        closestSeasonNumber: undefined,
      } as RegularResponse
    }

    const validSeasons = filteredSeasonsForProcessing.filter(
      (season) => season.air_date && season.air_date.trim() !== '',
    )

    if (validSeasons.length === 0) {
      return {
        ...tmdbData,
        allSeasons: filteredSeasonsForProcessing,
        isLongRunning: false,
        closestSeason: undefined,
        closestSeasonNumber: undefined,
      } as RegularResponse
    }

    let closestSeason = validSeasons[0]
    let smallestDiff = Number.POSITIVE_INFINITY

    for (const season of validSeasons) {
      const seasonDate = new Date(season.air_date)
      if (seasonDate) {
        const diff = Math.abs(anilistDate.getTime() - seasonDate.getTime())
        if (diff < smallestDiff) {
          smallestDiff = diff
          closestSeason = season
        }
      }
    }

    return {
      ...tmdbData,
      closestSeason,
      closestSeasonNumber: closestSeason?.season_number,
      isLongRunning: false,
      allSeasons: filteredSeasonsForProcessing,
    } as RegularResponse
  }

  private async fetchEpsodes(
    fribbAnime: FribbAnime,
  ): Promise<EpisodesResponse | undefined> {
    const API_KEY = process.env.TMDB_API_KEY
    const type = fribbAnime.type?.toLowerCase() === 'movie' ? 'movie' : 'tv'

    if (!API_KEY) {
      throw new Error('TMDB_API_KEY is not set')
    }

    if (!fribbAnime.themoviedb_id || !fribbAnime.anilist_id) {
      return undefined
    }

    if (type === 'movie') {
      const alResponse = await this.anilist.getInfo(fribbAnime)
      if (!alResponse) return undefined
      return {
        episodes: [] as EpisodeWithEnhancements[],
        totalEpisodes: 1,
        isLongRunning: false,
        currentEpisode: 1,
        dateRange: {
          startDate: this.parseDate(alResponse.airDate?.start).toISOString(),
          endDate: this.parseDate(alResponse.airDate?.end).toISOString(),
          effectiveEndDate: alResponse.airDate?.end
            ? this.parseDate(alResponse.airDate?.end).toISOString()
            : (new Date().toISOString().split('T')[0] as string),
        },
      }
    }

    const [seasonsData, alResponse] = await Promise.all([
      this.getSeasons(fribbAnime),
      this.anilist.getInfo(fribbAnime),
    ])

    if (!seasonsData || !alResponse) {
      return undefined
    }

    const startDate = this.parseDate(alResponse.airDate?.start)
    const endDate = this.parseDate(alResponse.airDate?.end)

    if (!startDate) {
      console.warn('No valid start date found for anime')
      return undefined
    }

    const effectiveEndDate = endDate || new Date()
    let allEpisodes: TMDBEpisode[] = []

    try {
      // We no longer hard-filter season_number !== 0 here
      // because getSeasons() already filtered the correct seasons for us.
      const seasonPromises = seasonsData.allSeasons.map(
        async (season): Promise<TMDBEpisode[]> => {
          const response = await this.client.get(
            `${type}/${fribbAnime.themoviedb_id}/season/${season.season_number}?language=en-US`,
          )

          if (!response.ok) return []

          const seasonDetails = await response.json<TMDBSeasonDetails>()
          return seasonDetails.episodes || []
        },
      )

      const seasonsEpisodes = await Promise.all(seasonPromises)
      allEpisodes = seasonsEpisodes.flat()

      const filteredEpisodes = allEpisodes.filter((episode) => {
        if (!episode.air_date) return false
        const episodeDate = new Date(episode.air_date)
        return episodeDate >= startDate && episodeDate <= effectiveEndDate
      })

      const sortedEpisodes = filteredEpisodes.sort((a, b) => {
        if (a.season_number !== b.season_number) {
          return a.season_number - b.season_number
        }
        return a.episode_number - b.episode_number
      })

      const episodesWithEnhancements: EpisodeWithEnhancements[] =
        await Promise.all(
          sortedEpisodes.map(async (ep, index) => {
            if (fribbAnime.themoviedb_id) {
              const [translations] = await Promise.all([
                this.getTranslations(
                  fribbAnime.themoviedb_id,
                  ep.season_number,
                  ep.episode_number,
                ),
              ])

              return {
                ...ep,
                image: `https://image.tmdb.org/t/p/original${ep.still_path}`,
                translations,
                isCurrentEpisode: index + 1 === alResponse.currentEpisode,
              }
            }
            return {
              ...ep,
              image: '',
              translations: [],
              isCurrentEpisode: false,
            }
          }),
        )

      return {
        episodes: episodesWithEnhancements,
        totalEpisodes: sortedEpisodes.length,
        isLongRunning: seasonsData.isLongRunning,
        currentEpisode: alResponse.currentEpisode ?? 0,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate
            ? endDate.toISOString()
            : effectiveEndDate.toISOString(),
          effectiveEndDate: effectiveEndDate
            .toISOString()
            .split('T')[0] as string,
        },
      }
    } catch (error) {
      console.error('Error fetching TMDB episodes:', error)
      return undefined
    }
  }

  public async getEpisodes(
    fribbAnime: FribbAnime,
  ): Promise<ProviderEpisode[] | undefined> {
    if (!fribbAnime.themoviedb_id) return undefined

    const episodesResponse = await this.fetchEpsodes(fribbAnime)
    const episodes: ProviderEpisode[] =
      episodesResponse?.episodes.map((episode, idx) => {
        const langs = ['en', 'ja', 'es', 'de', 'ru']

        const titles = langs
          .map((lang) => {
            const trans = episode.translations.find(
              (t) => t.iso_639_1.toLowerCase() === lang,
            )
            if (!trans?.data?.name) return undefined
            return {
              languageCode:
                lang === 'en'
                  ? 'english'
                  : lang === 'ja'
                    ? 'japanese'
                    : lang === 'es'
                      ? 'spanish'
                      : lang === 'de'
                        ? 'german'
                        : 'russian',
              title: trans.data.name,
            }
          })
          .filter(Boolean) as ITitle[] // remove nulls

        return {
          titles,
          description:
            episode.translations.find((t) => t.iso_639_1.toLowerCase() === 'en')
              ?.data.overview ??
            episode.overview ??
            null,
          thumbnailImage: episode.image ?? null,
          rating: episode.vote_average,
          ago: formatDistance(new Date(episode.air_date), new Date(), {
            addSuffix: true,
          }),
          number: idx + 1,
          createdAt: Date.now(),
          updatedAt: new Date(episode.air_date).getTime(),
        }
      }) ?? []

    return episodes
  }

  public async getArtwork(fribbAnime: FribbAnime): Promise<IArtwork[]> {
    const API_KEY = process.env.TMDB_API_KEY
    const type = fribbAnime.type?.toLowerCase() === 'movie' ? 'movie' : 'tv'

    if (!API_KEY) {
      throw new Error('TMDB_API_KEY is not set')
    }

    if (!fribbAnime.themoviedb_id) {
      return []
    }

    try {
      const response = await this.client.get(
        `${type}/${fribbAnime.themoviedb_id}/images?language=en&include_image_language=en,undefined,ja`,
      )

      if (!response.ok) {
        console.error(
          `TMDB Images API error: ${response.status} ${response.statusText}`,
        )
        return []
      }

      const data = await response.json<TMDBImagesResponse>()

      const baseImageUrl = 'https://image.tmdb.org/t/p/original'

      const mapToIArtwork = (
        images: TMDBImage[],
        typeMap: IArtwork['type'],
      ): IArtwork[] =>
        images.map((img) => ({
          type: typeMap,
          image: `${baseImageUrl}${img.file_path}`,
          providerId: 'tmdb',
        }))

      const backdrops = mapToIArtwork(data.backdrops, 'banner')
      const posters = mapToIArtwork(data.posters, 'poster')
      const logos = mapToIArtwork(data.logos, 'clear_logo')

      const allArtworks = [...backdrops, ...posters, ...logos]

      return allArtworks
    } catch (error) {
      console.error('Error fetching TMDB artworks:', error)
      return []
    }
  }

  override async getInfo(anime: FribbAnime): Promise<ProviderInfo | undefined> {
    const API_KEY = process.env.TMDB_API_KEY
    const type = anime.type?.toLowerCase() === 'movie' ? 'movie' : 'tv'

    if (!API_KEY) {
      throw new Error('TMDB_API_KEY is not set')
    }

    if (!anime.themoviedb_id) {
      return undefined
    }

    try {
      const [basicResponse, keywordsResponse, artworksResponse] =
        await Promise.all([
          this.client.get(`${type}/${anime.themoviedb_id}?language=en-US`),
          this.client.get(`${type}/${anime.themoviedb_id}/keywords`),
          this.client.get(
            `${type}/${anime.themoviedb_id}/images?language=en&include_image_language=en,undefined,ja`,
          ),
        ])

      if (!basicResponse.ok) {
        console.error(
          `TMDB API error: ${basicResponse.status} ${basicResponse.statusText}`,
        )
        return undefined
      }

      const basicData = await basicResponse.json<TMDBDetailedInfo>()

      let keywords: TMDBKeyword[] = []
      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json<TMDBKeywordsResponse>()
        keywords =
          type === 'tv'
            ? keywordsData.results || []
            : keywordsData.keywords || []
      } else {
        console.warn(`Failed to fetch keywords: ${keywordsResponse.status}`)
      }

      const genres =
        basicData.genres.filter(
          (genre) => !['Animation'].includes(genre.name),
        ) || []
      const artworksData = await artworksResponse.json<TMDBImagesResponse>()

      function getBestImage(
        logos: TMDBImage[],
        language_iso: 'en' | 'jp' | null = null,
        dimension: { width: number; height: number } | 'smallest' = 'smallest',
      ): TMDBImage | null {
        const filtered = language_iso
          ? logos.filter((l) => l.iso_639_1 === language_iso)
          : logos

        if (filtered.length === 0) return null

        if (dimension === 'smallest') {
          return filtered.reduce((smallest, current) => {
            const smallestArea =
              (smallest.width as number) * (smallest.height as number)
            const currentArea =
              (current.width as number) * (current.height as number)
            return currentArea < smallestArea ? current : smallest
          })
        } else {
          return filtered.reduce((closest, current) => {
            const currentDiff =
              Math.abs((current.width as number) - dimension.width) +
              Math.abs((current.height as number) - dimension.height)
            const closestDiff =
              Math.abs((closest.width as number) - dimension.width) +
              Math.abs((closest.height as number) - dimension.height)
            return currentDiff < closestDiff ? current : closest
          })
        }
      }

      const logoImagePath = getBestImage(artworksData.logos, 'en', {
        height: 300,
        width: 400,
      })?.file_path
      const bannerImagePath = getBestImage(artworksData.backdrops, null, {
        width: 3840,
        height: 2180,
      })?.file_path
      const coverImagePath = getBestImage(artworksData.posters, 'en', {
        width: 2000,
        height: 3000,
      })?.file_path

      const artwork = await this.getArtwork(anime)

      const logoImage = logoImagePath
        ? `https://image.tmdb.org/t/p/original${logoImagePath}`
        : null
      const bannerImage = bannerImagePath
        ? `https://image.tmdb.org/t/p/original${bannerImagePath}`
        : null
      const coverImage = coverImagePath
        ? `https://image.tmdb.org/t/p/original${coverImagePath}`
        : null

      return {
        logoImage,
        bannerImage,
        coverImage,
        genres,
        tags: keywords,
        titles: [
          {
            languageCode: 'japanese',
            title: basicData.original_name ?? '',
          },
        ],
        artwork,

        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    } catch (_e) {
      return undefined
    }
  }
}

export default TheMovieDB

export interface TMDBSeason {
  air_date: string
  episode_count: number
  id: number
  name: string
  overview: string
  poster_path: string
  season_number: number
  vote_average: number
}

export interface TMDBInfo {
  first_air_date: string
  last_air_date: string
  number_of_seasons: number
  number_of_episodes: number
  name: string
  seasons: TMDBSeason[]
}

export interface TMDBCrewMember {
  department: string
  job: string
  credit_id: string
  adult: boolean
  gender: number
  id: number
  known_for_department: string
  name: string
  original_name: string
  popularity: number
  profile_path: string | undefined
}

export interface TMDBGuestStar {
  character: string
  credit_id: string
  order: number
  adult: boolean
  gender: number
  id: number
  known_for_department: string
  name: string
  original_name: string
  popularity: number
  profile_path: string | undefined
}

export interface TMDBEpisode {
  air_date: string
  episode_number: number
  id: number
  name: string
  overview: string
  production_code: string
  runtime: number
  season_number: number
  show_id: number
  still_path: string | undefined
  vote_average: number
  vote_count: number
  crew: TMDBCrewMember[]
  guest_stars: TMDBGuestStar[]
}

export interface TMDBSeasonDetails {
  _id: string
  air_date: string
  episodes: TMDBEpisode[]
  name: string
  overview: string
  id: number
  poster_path: string | undefined
  season_number: number
  vote_average: number
}

export interface SeasonResponseBase extends TMDBInfo {
  allSeasons: TMDBSeason[]
  isLongRunning: boolean
}

export interface LongRunningResponse extends SeasonResponseBase {
  isLongRunning: true
  closestSeason?: undefined
  closestSeasonNumber?: undefined
}

export interface RegularResponse extends SeasonResponseBase {
  isLongRunning: false
  closestSeason: TMDBSeason | undefined
  closestSeasonNumber?: number
}

export type SeasonResponse = LongRunningResponse | RegularResponse

export interface EpisodeStill {
  aspect_ratio: number
  height: number
  iso_639_1: string | undefined
  file_path: string
  vote_average: number
  vote_count: number
  width: number
  full_url: string
}

export interface EpisodeImagesResponse {
  id: number
  stills: EpisodeStill[]
}

export interface EpisodeTranslationData {
  name: string
  overview: string
}

export interface EpisodeTranslation {
  iso_3166_1: string
  iso_639_1: string
  name: string
  english_name: string
  data: EpisodeTranslationData
}

export interface EpisodeTranslationsResponse {
  id: number
  translations: EpisodeTranslation[]
}

export interface EpisodeWithEnhancements
  extends Omit<TMDBEpisode, 'still_path'> {
  image: string
  still_path: string | undefined
  translations: EpisodeTranslation[]
  isCurrentEpisode: boolean
}

export interface EpisodesResponse {
  episodes: EpisodeWithEnhancements[]
  totalEpisodes: number
  isLongRunning: boolean
  currentEpisode: number
  dateRange: {
    startDate: string
    endDate: string | undefined
    effectiveEndDate: string
  }
}

interface TMDBImage {
  aspect_ratio?: number
  height?: number
  iso_639_1: string | undefined
  file_path?: string
  vote_average?: number
  vote_count?: number
  width?: number
  id?: number
}

export interface TMDBImagesResponse {
  id: number
  backdrops: TMDBImage[]
  logos: TMDBImage[]
  posters: TMDBImage[]
}

export interface ArtworkImage extends TMDBImage {
  full_url: string
  image_type:
    | 'backdrop'
    | 'poster'
    | 'logo'
    | 'backgrounds'
    | 'icon'
    | 'clear_art'
    | 'fanart'
    | 'actor_photo'
    | 'cinemagraph'
}

export interface ArtworksResponse {
  backdrops: ArtworkImage[]
  posters: ArtworkImage[]
  logos: ArtworkImage[]
  totalImages: number
}

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBProductionCompany {
  id: number
  logo_path: string | null
  name: string
  origin_country: string
}

export interface TMDBNetwork {
  id: number
  logo_path: string | null
  name: string
  origin_country: string
}

export interface TMDBKeyword {
  id: number
  name: string
}

export interface TMDBKeywordsResponse {
  id: number
  keywords?: TMDBKeyword[]
  results?: TMDBKeyword[]
}

export interface TMDBDetailedInfo {
  id: number
  name?: string
  title?: string
  overview: string
  genres: TMDBGenre[]
  production_companies: TMDBProductionCompany[]
  networks?: TMDBNetwork[]
  first_air_date?: string
  release_date?: string
  vote_average: number
  vote_count: number
  popularity: number
  original_language: string
  original_name?: string
  original_title?: string
}

export interface TMDBInfoResponse {
  basic: TMDBDetailedInfo
  keywords: TMDBKeyword[]
  studios: TMDBProductionCompany[]
  networks?: TMDBNetwork[]
  genres: TMDBGenre[]
}

// const tmdb = new TheMovieDB();
// console.dir(await tmdb.getSeasons(
// {
//   "type" : "TV",
//   "anidb_id" : 17947,
//   "anilist_id" : 163134,
//   "animecountdown_id" : 2125704,
//   "anime-planet_id" : "rezero-starting-life-in-another-world-season-3",
//   "anisearch_id" : 18302,
//   "imdb_id" : "tt5607616",
//   "kitsu_id" : 47235,
//   "livechart_id" : 11908,
//   "mal_id" : 54857,
//   "simkl_id" : 2125704,
//   "themoviedb_id" : 65942,
//   "tvdb_id" : 305089,
//   "season" : {
//     "tvdb" : 3,
//     "tmdb" : 3
//   }
// }
// ), { depth: null })
