import Elysia from 'elysia'
import z from 'zod'

import { getAnimeFromAnilistIds } from '../database/functions'
import { getBestScore, getPopular, getTrending } from '../helper/get-spot'
// import { trendingQueue } from '../queue'
import { createSuccessResponse } from '../helper/response'

const picksRoutes = new Elysia({ prefix: '/picks' })
  .get(
    '/trending',
    async ({ query }) => {
      const anilistTrendingIds = await getTrending({
        limit: query.limit,
        offset: query.offset,
      })
      const trendingAnimes = await getAnimeFromAnilistIds(anilistTrendingIds)

      // Worker removed.

      // await trendingQueue.add('trending-add', {
      //   ids: trendingAnimes.unavailable,
      // })

      return createSuccessResponse(trendingAnimes.found)
    },
    {
      query: z.object({
        limit: z.preprocess((val) => Number(val), z.number().optional()),
        offset: z.preprocess((val) => Number(val), z.number().optional()),
      }),
    },
  )
  .get(
    '/all-time-popular',
    async ({ query }) => {
      const anilistPopularIds = await getPopular({
        limit: query.limit,
        offset: query.offset,
      })
      const popularAnimes = await getAnimeFromAnilistIds(anilistPopularIds)

      return createSuccessResponse(popularAnimes.found)
    },
    {
      query: z.object({
        limit: z.preprocess((val) => Number(val), z.number().optional()),
        offset: z.preprocess((val) => Number(val), z.number().optional()),
      }),
    },
  )
  .get(
    '/best-score',
    async ({ query }) => {
      const anilistBestScoreIds = await getBestScore({
        limit: query.limit,
        offset: query.offset,
      })
      const bestScoresAnimes = await getAnimeFromAnilistIds(anilistBestScoreIds)

      return createSuccessResponse(bestScoresAnimes.found)
    },
    {
      query: z.object({
        limit: z.preprocess((val) => Number(val), z.number().optional()),
        offset: z.preprocess((val) => Number(val), z.number().optional()),
      }),
    },
  )

export { picksRoutes }
