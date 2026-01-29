// biome-ignore assist/source/organizeImports: I dont wanna deal with this no more.
import { nanoid } from '../id-gen/nanoid'
import { slug } from '../id-gen/slug'

import Anidb from '../providers/meta/anidb'
import Anilist from '../providers/meta/anilist'
import Kitsu from '../providers/meta/kitsu'
import MyAnimeList from '../providers/meta/mal'
import Nagisa from '../providers/anime/nagisa-animekai'
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
} from '../types/anime'

import type {
  CrysolineProviderEpisode,
  FribbAnime,
  IRelation,
  ProviderInfo,
  ProviderSearch,
} from '../types/provider'
import { getSubAndDubCount } from '../helper/dub'
import { getDominantColor } from '../helper/get-color'

import { FindBestMatchByTitles } from './helpers/find-best-match'
import { cleanTitle } from './helpers/sanitize-title'

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
    english: data.anilist?.titles.find(
      (title) => title.languageCode === 'english',
    )?.title,
    romaji: data.anilist?.titles.find(
      (title) => title.languageCode === 'romaji',
    )?.title,
    native: data.anilist?.titles.find(
      (title) => title.languageCode === 'japanese',
    )?.title,
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
      data.mal?.characters ||
      data.anilist?.characters ||
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

  const info: Info = {
    id: nanoid().toString(),
    slug: slug(
      titleToMap.english ?? titleToMap.romaji ?? titleToMap.native ?? '',
    ),
    // Core Metadata
    titles: getTitles(),
    synonyms: data.anilist?.synonyms || data.mal?.synonyms || [],
    description: getDescription(),

    // Images: Prefer high-quality providers, but TVDB is often best for banners/logos
    coverImage:
      data.anilist?.coverImage ??
      data.mal?.coverImage ??
      data.tvdb?.coverImage ??
      null,
    bannerImage:
      data.tvdb?.bannerImage ??
      data.kitsu?.bannerImage ??
      data.anilist?.bannerImage ??
      data.mal?.bannerImage ??
      null,
    logoImage: data.tvdb?.logoImage ?? data.tmdb?.logoImage ?? null,
    color:
      (await getDominantColor(
        data.tvdb?.bannerImage ??
          data.kitsu?.bannerImage ??
          data.anilist?.bannerImage ??
          data.mal?.bannerImage ??
          undefined,
      )) ??
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
    airDate: data.anilist?.airDate ?? data.mal?.airDate ?? null,

    // Stats
    currentEpisode: getCurrentEpisode(),
    totalEpisodes: getTotalEpisodes(),
    countryOfOrigin: data.anilist?.countryOfOrigin ?? null,
    rating:
      data.anilist?.rating ?? data.mal?.rating ?? data.tmdb?.rating ?? null,
    ageRating: data.anilist?.ageRating ?? data.mal?.ageRating ?? null,

    subCount,
    dubCount,

    // Collections (Merged & Prioritized)
    characters: getCharacters(),
    relations: getRelations(),
    artwork: Array.from(mergedArtwork.values()), // Shared/Merged set
    studio: Array.from(mergedStudios.values()), // Shared/Merged set
    genres: Array.from(mergedGenres.values()), // Shared/Merged set
    tags: Array.from(mergedTags.values()), // Shared/Merged set

    // Timestamps
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  return info
}

// await Bun.write(
//   'index.json',
//   JSON.stringify(
//     await getMap({
//       type: 'TV',
//       anidb_id: 16188,
//       anilist_id: 132052,
//       animecountdown_id: 1604475,
//       'anime-planet_id': 'a-couple-of-cuckoos',
//       anisearch_id: 16163,
//       imdb_id: 'tt14400866',
//       kitsu_id: 44310,
//       livechart_id: 10346,
//       mal_id: 48675,
//       simkl_id: 1604475,
//       themoviedb_id: 122587,
//       tvdb_id: 400585,
//       season: {
//         tvdb: 1,
//         tmdb: 1,
//       },
//     }),
//     null,
//     2,
//   ),
// )
