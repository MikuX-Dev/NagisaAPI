// biome-ignore assist/source/organizeImports: I dont wanna deal with this no more.
import { nanoid } from '../id-gen/nanoid'
import { slug } from '../id-gen/slug'

import Anidb from '../providers/meta/anidb'
import Anilist from '../providers/meta/anilist'
import Kitsu from '../providers/meta/kitsu'
import MyAnimeList from '../providers/meta/mal'
import Simkl from '../providers/meta/simkl'
import TheMovieDB from '../providers/meta/tmdb'
import TheTVDB from '../providers/meta/tvdb'

import type {
  IArtwork,
  ICharacter,
  IFormat,
  IGenre,
  Info,
  ISeason,
  IStudio,
  IStatus,
  ITag,
  ITitle,
  Episode,
  IAirDate,
  IDate,
} from '../types/anime'

import type {
  CrysolineProviderEpisode,
  FribbAnime,
  IRelation,
  ProviderEpisode,
  ProviderInfo,
  ProviderSearch,
} from '../types/provider'
import { getSubAndDubCount } from '../helper/dub'
import { getDominantColor } from '../helper/get-color'

import { FindBestMatchByTitles } from './helpers/find-best-match'
import { cleanTitle } from './helpers/sanitize-title'
import { getFillerEpisodes } from '../providers/utils/filler-list'

import Nagisa from '../providers/anime/nagisa-animekai'
import Miyako from '../providers/anime/miyako-anizone'
import Toki from '../providers/anime/toki-zencloud'
import Miyu from '../providers/anime/miyu-anidap'
import Aoi from '../providers/anime/aoi-animeparadise'
import Yuuka from '../providers/anime/yuuka-animepahe'
import Maki from '../providers/anime/maki-anicore'

export const getMap = async (anime: FribbAnime): Promise<Info> => {
  const providers = {
    anidb: new Anidb(),
    anilist: new Anilist(),
    simkl: new Simkl(),
    kitsu: new Kitsu(),
    mal: new MyAnimeList(),
    tmdb: new TheMovieDB(),
    tvdb: new TheTVDB(),
  }

  const results = await Promise.allSettled([
    providers.anidb.getInfo(anime),
    providers.anilist.getInfo(anime),
    providers.simkl.getInfo(anime),
    providers.kitsu.getInfo(anime),
    providers.mal.getInfo(anime),
    providers.tmdb.getInfo(anime),
    providers.tvdb.getInfo(anime),
  ])

  const getData = (index: number): ProviderInfo | undefined =>
    results[index]?.status === 'fulfilled'
      ? (results[index] as PromiseFulfilledResult<ProviderInfo | undefined>)
          .value
      : undefined

  const data = {
    anidb: getData(0),
    anilist: getData(1),
    simkl: getData(2),
    kitsu: getData(3),
    mal: getData(4),
    tmdb: getData(5),
    tvdb: getData(6),
  }

  const titleToMap = {
    english:
      data.anilist?.titles.find((title) => title.languageCode === 'english')
        ?.title ||
      data.kitsu?.titles.find((title) => title.languageCode === 'english')
        ?.title ||
      data.mal?.titles.find((title) => title.languageCode === 'english')
        ?.title ||
      data.anidb?.titles.find((title) => title.languageCode === 'english')
        ?.title ||
      data.simkl?.titles.find((title) => title.languageCode === 'english')
        ?.title ||
      data.tmdb?.titles.find((title) => title.languageCode === 'english')
        ?.title ||
      '',
    romaji:
      data.anilist?.titles.find((title) => title.languageCode === 'romaji')
        ?.title ||
      data.kitsu?.titles.find((title) => title.languageCode === 'romaji')
        ?.title ||
      data.mal?.titles.find((title) => title.languageCode === 'romaji')
        ?.title ||
      data.anidb?.titles.find((title) => title.languageCode === 'romaji')
        ?.title ||
      data.simkl?.titles.find((title) => title.languageCode === 'romaji')
        ?.title ||
      data.tmdb?.titles.find((title) => title.languageCode === 'romaji')
        ?.title ||
      '',
    native:
      data.anilist?.titles.find((title) => title.languageCode === 'japanese')
        ?.title ||
      data.kitsu?.titles.find((title) => title.languageCode === 'japanese')
        ?.title ||
      data.mal?.titles.find((title) => title.languageCode === 'japanese')
        ?.title ||
      data.anidb?.titles.find((title) => title.languageCode === 'japanese')
        ?.title ||
      data.simkl?.titles.find((title) => title.languageCode === 'japanese')
        ?.title ||
      data.tmdb?.titles.find((title) => title.languageCode === 'japanese')
        ?.title ||
      '',
  }

  let bestNagisaMatch: ProviderSearch | undefined
  let nagisaEpisodes: CrysolineProviderEpisode[] | undefined

  const nagisa = new Nagisa()
  const nagisaSearch = await nagisa.search(
    cleanTitle(
      titleToMap.english ?? titleToMap.romaji ?? titleToMap.native ?? '',
    ),
  )
  if (nagisaSearch && nagisaSearch.length > 0) {
    const bestMatches = FindBestMatchByTitles(titleToMap, nagisaSearch)

    if (
      bestMatches.mostCommonMatchIndex === 0 ||
      bestMatches.mostCommonMatchIndex
    ) {
      bestNagisaMatch = nagisaSearch[bestMatches.mostCommonMatchIndex]
    }
  }

  if (bestNagisaMatch) {
    const episodes = await nagisa.getEpisodes(bestNagisaMatch.id.toString())
    nagisaEpisodes = episodes
  }

  let subCount: number | null = null
  let dubCount: number | null = null

  if (nagisaEpisodes && nagisaEpisodes.length > 0) {
    const { subCount: nagisaSubCount, dubCount: nagisaDubCount } =
      getSubAndDubCount(nagisa.providerType, nagisaEpisodes)
    subCount = nagisaSubCount
    dubCount = nagisaDubCount
  }

  const mergedGenres = new Map<string, IGenre>()
  const mergedTags = new Map<string, ITag>()
  const mergedArtwork = new Map<string, IArtwork>()
  const mergedStudios = new Map<string, IStudio>()

  Object.values(data).forEach((providerData) => {
    if (!providerData) return

    providerData.genres?.forEach((g) => {
      if (g.name) mergedGenres.set(g.name.toLowerCase(), g)
    })

    providerData.tags?.forEach((t) => {
      if (t.name) mergedTags.set(t.name.toLowerCase(), t)
    })

    providerData.artwork?.forEach((art) => {
      if (art.image) mergedArtwork.set(art.image, art)
    })

    providerData.studio?.forEach((s) => {
      if (s.name) mergedStudios.set(s.name.toLowerCase(), s)
    })
  })

  const getDescription = (): string | null => {
    return (
      data.simkl?.description ||
      data.anidb?.description ||
      data.tmdb?.description ||
      data.anilist?.description ||
      data.mal?.description ||
      null
    )
  }

  const getCharacters = (): ICharacter[] => {
    return (
      data.anilist?.characters ||
      data.mal?.characters ||
      data.kitsu?.characters ||
      []
    )
  }

  const getRelations = (): IRelation[] | null => {
    return (
      data.anilist?.relations ||
      data.mal?.relations ||
      data.kitsu?.relations ||
      []
    )
  }

  const getTitles = (): ITitle[] => {
    return data.anilist?.titles || data.mal?.titles || []
  }

  const getTotalEpisodes = () =>
    data.tmdb?.totalEpisodes ??
    data.anilist?.totalEpisodes ??
    data.mal?.totalEpisodes ??
    null
  const getCurrentEpisode = () =>
    data.tmdb?.currentEpisode ??
    data.anilist?.currentEpisode ??
    data.mal?.currentEpisode ??
    null

  function airDateToISOString(date: IDate | null) {
    if (!date) return null
    if (!date.year) return null

    const month = (date.month ?? 1) - 1
    const day = date.day ?? 1

    const jsDate = new Date(date.year, month, day)
    return jsDate.toISOString()
  }

  const airDate: IAirDate = {
    start: {
      month:
        data.anilist?.airDate?.start.month ||
        data.mal?.airDate?.start.month ||
        null,
      day:
        data.anilist?.airDate?.start.day ||
        data.mal?.airDate?.start.day ||
        null,
      year:
        data.anilist?.airDate?.start.year ||
        data.mal?.airDate?.start.year ||
        null,
      string: airDateToISOString(
        data.anilist?.airDate?.start || data.mal?.airDate?.start || null,
      ),
    },
    end: {
      month:
        data.anilist?.airDate?.end.month ||
        data.mal?.airDate?.end.month ||
        null,
      day: data.anilist?.airDate?.end.day || data.mal?.airDate?.end.day || null,
      year:
        data.anilist?.airDate?.end.year || data.mal?.airDate?.end.year || null,
      string: airDateToISOString(
        data.anilist?.airDate?.end || data.mal?.airDate?.end || null,
      ),
    },
  }

  const toCamelCase = (str: string) =>
    str.replace(/_([a-z])/g, (_, char) => char.toUpperCase())

  const transformAnime = (anime: FribbAnime) => {
    return Object.fromEntries(
      Object.entries(anime)
        .filter(([key]) => key !== 'season' && key !== 'type')
        .map(([key, value]) => [toCamelCase(key), value.toString()]),
    )
  }

  const externalIds = transformAnime(anime)
  const relations = getRelations()
  const hasPrequelRelation = relations?.some(
    (relation) => relation.relationType?.toLowerCase() === 'prequel',
  )

  let coverImage: null | string = null

  if (hasPrequelRelation) {
    const seasons = await providers.tmdb.getSeasons(anime)
    const tmdbCoverImage = seasons?.closestSeason?.poster_path
      ? `https://image.tmdb.org/t/p/original${seasons?.closestSeason?.poster_path}`
      : null
      
    coverImage =
      tmdbCoverImage ??
      data.anilist?.coverImage ??
      data.mal?.coverImage ??
      data.tvdb?.coverImage ??
      null
  } else {
    coverImage =
      data.tmdb?.coverImage ??
      data.anilist?.coverImage ??
      data.mal?.coverImage ??
      data.tvdb?.coverImage ??
      null
  }

  const info: Info = {
    id: nanoid().toString(),
    slug: slug(
      titleToMap.english || titleToMap.romaji || titleToMap.native || '',
    ),
    title: titleToMap.english || titleToMap.romaji || titleToMap.native || '',
    // Core Metadata
    titles: getTitles(),
    synonyms: data.anilist?.synonyms || data.mal?.synonyms || [],
    description: getDescription(),
    externalIds,

    // Images: Prefer high-quality providers, but TVDB is often best for banners/logos
    coverImage,
    bannerImage:
      data.tmdb?.bannerImage ??
      data.tvdb?.bannerImage ??
      data.kitsu?.bannerImage ??
      data.anilist?.bannerImage ??
      data.mal?.bannerImage ??
      null,
    logoImage: data.tmdb?.logoImage ?? null,
    color:
      (await getDominantColor(
        data.tmdb?.bannerImage ??
          data.tvdb?.bannerImage ??
          data.kitsu?.bannerImage ??
          data.anilist?.bannerImage ??
          data.mal?.bannerImage ??
          undefined,
      )) ??
      data.anilist?.color ??
      null,
    coverColor:
      (await getDominantColor(coverImage ?? undefined)) ??
      data.anilist?.color ??
      null,

    // Status & Dates (Anilist is generally most up-to-date for status)
    status: (data.anilist?.status ??
      data.mal?.status ??
      null) as IStatus | null,
    format: (data.anilist?.format ??
      data.mal?.format ??
      null) as IFormat | null,
    season: (data.anilist?.season ??
      data.mal?.season ??
      null) as ISeason | null,
    airDate: airDate ?? null,

    // Stats
    currentEpisode: getCurrentEpisode(),
    totalEpisodes: getTotalEpisodes(),
    countryOfOrigin: data.anilist?.countryOfOrigin ?? null,
    rating:
      Math.round(
        data.anilist?.rating ?? data.mal?.rating ?? data.tmdb?.rating ?? 0,
      ) ?? null,
    ageRating: data.anilist?.ageRating ?? data.mal?.ageRating ?? null,

    subCount,
    dubCount,

    // Collections (Merged & Prioritized)
    characters: getCharacters(),
    relations: relations,
    artwork: Array.from(mergedArtwork.values()), // Shared/Merged set
    studio: Array.from(mergedStudios.values()), // Shared/Merged set
    genres: Array.from(mergedGenres.values()), // Shared/Merged set
    tags: Array.from(mergedTags.values()), // Shared/Merged set

    // Timestamps
    createdAt: Date.now(),
    updatedAt: Date.now(),

    // Anilist Rate Limit Headers
    ratelimit: data.anilist?.ratelimit,
  }

  return info
}

export const getEpisodes = async (anime: FribbAnime): Promise<Episode[]> => {
  const providers = {
    anidb: new Anidb(),
    simkl: new Simkl(),
    mal: new MyAnimeList(),
    tmdb: new TheMovieDB(),
  }

  const metaResults = await Promise.allSettled([
    providers.anidb.getEpisodes(anime),
    providers.simkl.getEpisodes(anime),
    providers.mal.getEpisodes(anime),
    providers.tmdb.getEpisodes(anime),
  ])

  const getMetaData = (index: number): ProviderEpisode[] | undefined =>
    metaResults[index]?.status === 'fulfilled'
      ? (
          metaResults[index] as PromiseFulfilledResult<
            ProviderEpisode[] | undefined
          >
        ).value
      : undefined

  const metaData = {
    anidb: getMetaData(0),
    simkl: getMetaData(1),
    mal: getMetaData(2),
    tmdb: getMetaData(3),
  }

  let fillers: number[] = []

  if (anime.anilist_id) {
    fillers = await getFillerEpisodes(anime.anilist_id.toString())
  }

  const streamingProviders = [
    { name: 'nagisa', instance: new Nagisa() },
    {
      name: 'miyako',
      instance: new Miyako(),
    },
    {
      name: 'toki',
      instance: new Toki(),
    },
    {
      name: 'miyu',
      instance: new Miyu()
    },
    {
      name: 'aoi',
      instance: new Aoi()
    },
    {
      name: 'yuuka',
      instance: new Yuuka()
    },
    {
      name: 'maki',
      instance: new Maki()
    }
  ]

  const anilist = new Anilist()
  const mal = new MyAnimeList()
  const [anilistInfo, malInfo] = await Promise.all([
    anilist.getInfo(anime),
    mal.getInfo(anime),
  ])

  const titleToMap = {
    english:
      anilistInfo?.titles.find((t) => t.languageCode === 'english')?.title ||
      malInfo?.titles.find((t) => t.languageCode === 'english')?.title ||
      '',
    romaji:
      anilistInfo?.titles.find((t) => t.languageCode === 'romaji')?.title ||
      malInfo?.titles.find((t) => t.languageCode === 'romaji')?.title ||
      '',
    native:
      anilistInfo?.titles.find((t) => t.languageCode === 'japanese')?.title ||
      malInfo?.titles.find((t) => t.languageCode === 'japanese')?.title ||
      '',
  }

  const streamingData: Map<
    string,
    {
      episodes: CrysolineProviderEpisode[]
      providerTypes: ('SUB' | 'DUB' | 'H-SUB')[]
    }
  > = new Map()

  for (const provider of streamingProviders) {
    if (provider.name === 'toki') {
      const episodes = await provider.instance.getEpisodes(
        anilistInfo?.id ?? '',
      )

      if (episodes) {
        streamingData.set(provider.name, {
          episodes,
          providerTypes: provider.instance.providerType,
        })
      }
    } else {
      const searchResults = await provider.instance.search(
        cleanTitle(
          titleToMap.english ??
            titleToMap.romaji ??
            titleToMap.native ??
            anime.mal_id?.toString() ??
            '',
        ),
      )

      if (searchResults && searchResults.length > 0) {
        const bestMatches = FindBestMatchByTitles(titleToMap, searchResults)

        if (
          bestMatches.mostCommonMatchIndex === 0 ||
          bestMatches.mostCommonMatchIndex
        ) {
          const bestMatch = searchResults[bestMatches.mostCommonMatchIndex]
          if (bestMatch) {
            const episodes = await provider.instance.getEpisodes(
              bestMatch.id.toString(),
            )

            if (episodes) {
              streamingData.set(provider.name, {
                episodes,
                providerTypes: provider.instance.providerType,
              })
            }
          }
        }
      }
    }
  }

  const mergeTitles = (
    existing: ITitle[] | null,
    newTitles: ITitle[] | null,
  ): ITitle[] | null => {
    if (!existing && !newTitles) return null
    if (!existing) return newTitles
    if (!newTitles) return existing

    const titleMap = new Map<string, ITitle>()
    existing.forEach((title) => {
      titleMap.set(title.languageCode, title)
    })
    newTitles.forEach((title) => {
      if (!titleMap.has(title.languageCode)) {
        titleMap.set(title.languageCode, title)
      }
    })

    return Array.from(titleMap.values())
  }

  const episodeMap = new Map<number, Episode>()

  const allMetaEpisodes = [
    ...(metaData.tmdb ?? []),
    ...(metaData.simkl ?? []),
    ...(metaData.anidb ?? []),
    ...(metaData.mal ?? []),
  ]

  allMetaEpisodes.forEach((metaEp) => {
    if (metaEp.number === undefined) return

    const existing = episodeMap.get(metaEp.number)
    if (!existing) {
      episodeMap.set(metaEp.number, {
        id: nanoid().toString(),
        titles: metaEp.titles ?? null,
        thumbnailImage: metaEp.thumbnailImage ?? null,
        preview: metaEp.preview ?? null,
        description: metaEp.description ?? null,
        number: metaEp.number,
        rating: metaEp.rating ?? null,
        filler: false,
        recap: metaEp.recap ?? false,
        runtime: metaEp.runtime ?? null,
        ago: metaEp.ago ?? null,
        providers: [],
        createdAt: metaEp.createdAt ?? Date.now(),
        updatedAt: metaEp.updatedAt ?? Date.now(),
      })
    } else {
      episodeMap.set(metaEp.number, {
        ...existing,
        titles: mergeTitles(existing.titles, metaEp.titles ?? null),
        thumbnailImage:
          existing.thumbnailImage ?? metaEp.thumbnailImage ?? null,
        preview: existing.preview ?? metaEp.preview ?? null,
        description: existing.description ?? metaEp.description ?? null,
        rating: existing.rating ?? metaEp.rating ?? null,
        recap: existing.recap || (metaEp.recap ?? false),
        runtime: existing.runtime ?? metaEp.runtime ?? null,
        ago: existing.ago ?? metaEp.ago ?? null,
        updatedAt: Date.now(),
      })
    }
  })

  streamingData.forEach((providerData, providerName) => {
    providerData.episodes.forEach((streamEp) => {
      if (streamEp.number === undefined) return

      const existing = episodeMap.get(streamEp.number)

      const episodeProviderTypes = providerData.providerTypes

      const streamEpTitles = streamEp.title
        ? [{ languageCode: 'english', title: streamEp.title }]
        : null

      if (!existing) {
        episodeMap.set(streamEp.number, {
          id: nanoid().toString(),
          titles: streamEpTitles,
          thumbnailImage: streamEp.thumbnailImage ?? null,
          preview: streamEp.preview ?? null,
          description: streamEp.description ?? null,
          number: streamEp.number,
          rating: streamEp.rating ?? null,
          filler: false,
          recap: streamEp.recap ?? false,
          runtime: streamEp.runtime ?? null,
          ago: null,
          providers: [
            {
              id: streamEp.id ?? '',
              episodeId: streamEp.episodeId ?? '',
              providerType: episodeProviderTypes,
              providerName,
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      } else {
        const providers = [...existing.providers]
        const existingProvider = providers.find(
          (p) => p.providerName === providerName,
        )

        if (existingProvider) {
          existingProvider.providerType = [
            ...new Set([
              ...existingProvider.providerType,
              ...episodeProviderTypes,
            ]),
          ]
        } else {
          providers.push({
            id: streamEp.id ?? '',
            episodeId: streamEp.episodeId ?? '',
            providerType: episodeProviderTypes,
            providerName,
          })
        }

        episodeMap.set(streamEp.number, {
          ...existing,
          titles: mergeTitles(existing.titles, streamEpTitles),
          thumbnailImage:
            existing.thumbnailImage ?? streamEp.thumbnailImage ?? null,
          preview: existing.preview ?? streamEp.preview ?? null,
          description: existing.description ?? streamEp.description ?? null,
          rating: Math.round(existing.rating ?? streamEp.rating ?? 0) ?? null,
          recap: existing.recap || (streamEp.recap ?? false),
          runtime: existing.runtime ?? streamEp.runtime ?? null,
          providers,
          updatedAt: Date.now(),
        })
      }
    })
  })

  const results = Array.from(episodeMap.values()).sort(
    (a, b) => a.number - b.number,
  )

  for (const episode of results) {
    episode.filler = fillers.includes(episode.number)
  }

  return results
}

// await Bun.write(
//   'info.json',
//   JSON.stringify(
//     await getMap({
//       type: 'TV',
//       anidb_id: 18773,
//       anilist_id: 179828,
//       animecountdown_id: 2525052,
//       animenewsnetwork_id: 32992,
//       'anime-planet_id': 'a-couple-of-cuckoos-season-2',
//       anisearch_id: 19504,
//       imdb_id: 'tt14400866',
//       kitsu_id: 49067,
//       livechart_id: 12766,
//       mal_id: 59402,
//       simkl_id: 2525052,
//       themoviedb_id: 122587,
//       tvdb_id: 400585,
//       season: {
//         tvdb: 2,
//         tmdb: 2,
//       },
//     }),
//     null,
//     2,
//   ),
// )
