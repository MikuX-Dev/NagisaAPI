import Elysia from 'elysia'
import z from 'zod'

import { getAnimeFromAnilistIds } from '../database/functions'
import {
  getBestScore,
  getPopular,
  getTrending,
  getRecentlyAired,
  getPopularMovies,
  getPopularThisSeason,
  getUpcomingAnime,
} from '../helper/get-spot'
// import { trendingQueue } from '../queue'
import { createSuccessResponse } from '../helper/response'
import { redis } from '../database/cache'

const CACHE_TTL = 12 * 60 * 60

interface CacheParams {
  limit?: number
  offset?: number
  fresh?: boolean
}

const querySchema = z.object({
  limit: z.preprocess((val) => Number(val), z.number().optional()),
  offset: z.preprocess((val) => Number(val), z.number().optional()),
  fresh: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().optional(),
  ),
})

const getCacheKey = (prefix: string, params: CacheParams): string => {
  return `anilist:${prefix}:${params.limit ?? 'default'}:${params.offset ?? 'default'}`
}

const getCachedOrFetch = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  forceFresh: boolean = false,
): Promise<T> => {
  if (!forceFresh) {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as T
    }
  }

  // Fetch fresh data and update cache
  const freshData = await fetchFn()
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(freshData))

  return freshData
}

const picksRoutes = new Elysia({ prefix: '/picks' })
  .get(
    '/trending',
    async ({ query }) => {
      const cacheKey = getCacheKey('trending', query)

      const anilistTrendingIds = await getCachedOrFetch(
        cacheKey,
        () => getTrending({ limit: query.limit, offset: query.offset }),
        query.fresh,
      )

      const trendingAnimes = await getAnimeFromAnilistIds(anilistTrendingIds)

      // await trendingQueue.add('trending-add', {
      //   ids: trendingAnimes.unavailable,
      // })

      return createSuccessResponse(trendingAnimes.found)
    },
    { query: querySchema },
  )
  .get(
    '/all-time-popular',
    async ({ query }) => {
      const cacheKey = getCacheKey('popular', query)

      const anilistPopularIds = await getCachedOrFetch(
        cacheKey,
        () => getPopular({ limit: query.limit, offset: query.offset }),
        query.fresh,
      )

      const popularAnimes = await getAnimeFromAnilistIds(anilistPopularIds)

      // await trendingQueue.add('popular-add', {
      //   ids: popularAnimes.unavailable,
      // })

      return createSuccessResponse(popularAnimes.found)
    },
    { query: querySchema },
  )
  .get(
    '/best-score',
    async ({ query }) => {
      const cacheKey = getCacheKey('bestscore', query)

      const anilistBestScoreIds = await getCachedOrFetch(
        cacheKey,
        () => getBestScore({ limit: query.limit, offset: query.offset }),
        query.fresh,
      )

      const bestScoresAnimes = await getAnimeFromAnilistIds(anilistBestScoreIds)

      // await trendingQueue.add('bestscore-add', {
      //   ids: bestScoresAnimes.unavailable,
      // })

      return createSuccessResponse(bestScoresAnimes.found)
    },
    { query: querySchema },
  )
  .get(
    '/recently-aired',
    async ({ query }) => {
      const cacheKey = getCacheKey('recently-aired', query)

      const anilistRecentlyAiredIds = await getCachedOrFetch(
        cacheKey,
        () => getRecentlyAired({ limit: query.limit, offset: query.offset }),
        query.fresh,
      )

      const recentlyAiredAnimes = await getAnimeFromAnilistIds(
        anilistRecentlyAiredIds,
      )

      return createSuccessResponse(recentlyAiredAnimes.found)
    },
    { query: querySchema },
  )
  .get(
    '/popular-movies',
    async ({ query }) => {
      const cacheKey = getCacheKey('popular-movies', query)

      const anilistPopularMoviesIds = await getCachedOrFetch(
        cacheKey,
        () => getPopularMovies({ limit: query.limit, offset: query.offset }),
        query.fresh,
      )

      const popularMovies = await getAnimeFromAnilistIds(
        anilistPopularMoviesIds,
      )

      return createSuccessResponse(popularMovies.found)
    },
    { query: querySchema },
  )
  .get(
    '/popular-this-season',
    async ({ query }) => {
      const cacheKey = getCacheKey('popular-this-season', query)

      const anilistPopularThisSeasonIds = await getCachedOrFetch(
        cacheKey,
        () =>
          getPopularThisSeason({ limit: query.limit, offset: query.offset }),
        query.fresh,
      )

      const popularThisSeasonAnimes = await getAnimeFromAnilistIds(
        anilistPopularThisSeasonIds,
      )

      return createSuccessResponse(popularThisSeasonAnimes.found)
    },
    { query: querySchema },
  )
  .get(
    '/upcoming-anime',
    async ({ query }) => {
      const cacheKey = getCacheKey('upcoming-anime', query)

      const anilistUpcomingAnimeIds = await getCachedOrFetch(
        cacheKey,
        () => getUpcomingAnime({ limit: query.limit, offset: query.offset }),
        query.fresh,
      )

      const upcomingAnimes = await getAnimeFromAnilistIds(
        anilistUpcomingAnimeIds,
      )

      return createSuccessResponse(upcomingAnimes.found)
    },
    { query: querySchema },
  )

export { picksRoutes }
