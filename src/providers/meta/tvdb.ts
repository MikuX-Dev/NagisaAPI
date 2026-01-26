import ky, { type KyInstance } from 'ky'
import { MetaBase } from '../base/meta'
import type { FribbAnime, ProviderInfo } from '../../types/provider'
import type { IArtwork as ProviderIArtwork } from '../../types/anime'

class TheTVDB extends MetaBase {
  override name: string = 'thetvdb'
  override url: string = 'https://api4.thetvdb.com'

  private keys = [
    'f5744a13-9203-4d02-b951-fbd7352c1657',
    '8f406bec-6ddb-45e7-8f4b-e1861e10f1bb',
    '5476e702-85aa-45fd-a8da-e74df3840baf',
    '51020266-18f7-4382-81fc-75a4014fa59f',
  ]

  public override client: KyInstance = ky.create({
    prefixUrl: `${this.url}/v4`,
  })

  private async getToken(key: string): Promise<string | undefined> {
    const data: Response | undefined = await this.client
      .post('login', {
        body: JSON.stringify({
          apikey: `${key}`,
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .catch(() => {
        return undefined
      })
    if (!data) return undefined

    if (data.ok) {
      return ((await data.json()) as { data: { token: string } }).data
        .token as string
    }

    return undefined
  }

  public async getInfo(
    fribbAnime: FribbAnime,
  ): Promise<ProviderInfo | undefined> {
    const tvdbId = fribbAnime.tvdb_id

    if (!tvdbId) return undefined

    const type =
      String(fribbAnime.type)?.toLowerCase() === 'movie' ? 'movies' : 'series'

    const token = await this.getToken(
      this.keys[(Math.random() * this.keys.length) | 0] as string,
    )

    const data = await this.client
      .get(`${type}/${tvdbId}/extended`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .catch(() => {
        return undefined
      })

    if (!data) return undefined

    if (data.ok) {
      const info = (await data.json<{ data: ITVDBResponse }>()).data

      const artwork: IArtwork[] = info.artworks

      const artworkIds = {
        banner: [1, 16, 6],
        poster: [2, 7, 14, 27],
        backgrounds: [3, 8, 15],
        icon: [5, 10, 18, 19, 26],
        clearArt: [22, 24],
        clearLogo: [23, 25],
        fanart: [11, 12],
        actorPhoto: [13],
        cinemagraphs: [20, 21],
      }

      const artworkData: ProviderIArtwork[] = artwork
        .map((art) => {
          const type: ProviderIArtwork['type'] | null =
            artworkIds.backgrounds.includes(art.type)
              ? 'banner'
              : artworkIds.banner.includes(art.type)
                ? 'top_banner'
                : artworkIds.clearLogo.includes(art.type)
                  ? 'clear_logo'
                  : artworkIds.poster.includes(art.type)
                    ? 'poster'
                    : artworkIds.icon.includes(art.type)
                      ? 'icon'
                      : artworkIds.clearArt.includes(art.type)
                        ? 'clear_art'
                        : null

          if (!type || !art.image) return null

          return {
            type,
            image: art.image,
            providerId: this.name,
          } as ProviderIArtwork
        })
        .filter((item): item is ProviderIArtwork => item !== null)

      artworkData.sort((a, b) => {
        const scoreA = artwork.find((x) => x.image === a.image)?.score ?? 0
        const scoreB = artwork.find((x) => x.image === b.image)?.score ?? 0
        return scoreB - scoreA
      })

      const bannerImage = artworkData.find(
        (art) => art.type === 'banner',
      )?.image

      return {
        titles: [],
        genres: info.genres.map((g) => ({ id: g.id, name: g.name })),
        tags: info.tags.map((t) => ({ id: t.id, name: t.name })),
        artwork: artworkData,
        bannerImage,

        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    }

    return undefined
  }
}

export default TheTVDB

// await Bun.write('info.json', JSON.stringify(await tvdb.getInfo({
//   "type" : "TV",
//   "anidb_id" : 17630,
//   "anilist_id" : 154768,
//   "animecountdown_id" : 1995266,
//   "anime-planet_id" : "my-dress-up-darling-season-2",
//   "anisearch_id" : 17703,
//   "imdb_id" : "tt15765670",
//   "kitsu_id" : 46492,
//   "livechart_id" : 11514,
//   "mal_id" : 53065,
//   "simkl_id" : 1995266,
//   "themoviedb_id" : 123249,
//   "tvdb_id" : 401233,
//   "season" : {
//     "tvdb" : 2,
//     "tmdb" : 2
//   }
// }), null, 2));

export interface ITVDBResponse {
  id: number
  name: string
  slug: string
  image: string
  nameTranslations: string[]
  overviewTranslations: string[]
  aliases: {
    language: string
    name: string
  }[]
  firstAired: string
  lastAired: string
  nextAired: string
  score: number
  status: {
    id: number
    name: string
    recordType: string
    keepUpdated: boolean
  }
  originalCountry: string
  originalLanguage: string
  defaultSeasonType: number
  isOrderRandomized: boolean
  lastUpdated: string
  averageRuntime: number
  episodes: number | null
  overview: string
  year: number
  artworks: IArtwork[]
  companies: INetwork[]
  originalNetwork: INetwork
  latestNetwork: INetwork
  genres: {
    id: number
    name: string
    slug: string
  }[]
  trailers: {
    id: number
    name: string
    url: string
    language: string
    runtime: number
  }[]
  lists: IList[]
  remoteIds: {
    id: string
    type: number
    sourceName: string
  }[]
  characters: ITVDBCharacter[]
  airsDays: {
    sunday: boolean
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
  }
  airsTime: string
  seasons: ITVDBSeason[]
  tags: {
    id: number
    tag: number
    tagName: string
    name: string
    helpText: null
  }[]
  contentRatings: {
    id: number
    name: string
    country: string
    description: string
    contentType: string
    order: number
    fullname: string | null
  }[]
  seasonTypes: {
    id: number
    name: string
    type: string
    alternateName: string | null
  }[]
}

export interface IArtwork {
  id: number
  image: string
  thumbnail: string
  language: null | string
  type: number
  score: number
  width: number
  height: number
  includesText: boolean
  thumbnailWidth: number
  thumbnailHeight: number
  updatedAt: number
  status: {
    id: number
    name: null | string
  }
  tagOptions: null
}

export interface INetwork {
  id: number
  name: string
  slug: string
  nameTranslations: string[]
  overviewTranslations: string[]
  aliases: string[]
  country: string
  primaryCompanyType: number
  activeDate: null
  inactiveDate: null
  companyType: {
    companyTypeId: number
    companyTypeName: string
  }
  parentCompany: {
    id: null
    name: null
    relation: {
      id: null
      typeName: null
    }
  }
}

export interface IList {
  id: number
  name: string
  overview: string
  url: string
  isOfficial: boolean
  nameTranslations: string[]
  overviewTranslations: string[]
  aliases: string[]
  score: number
  image: string
  imageIsFallback: boolean
  remoteIds: null
  tags: null
}

export interface ITVDBCharacter {
  id: number
  name: string
  peopleId: number
  seriesId: number
  series: null
  movie: null
  movieId: null
  episodeId: null
  type: number
  image: string
  sort: number
  isFeatured: boolean
  url: string
  nameTranslations: null
  overviewTranslations: null
  aliases: null
  peopleType: string
  peopleName: string
  peopleImageURL: string
  personName: string
  tagOptions: null
  personImgURL: string
}

export interface ITVDBSeason {
  id: number
  seriesId: number
  type: {
    id: number
    name: string
    type: string
    alternateName: null
  }
  number: number
  nameTranslations: string[]
  overviewTranslations: string[]
  image: string
  imageType: number
  companies: {
    studio: null
    network: null
    production: null
    distributor: null
    specialEffects: null
  }
  lastUpdated: string
}
