import Elysia from 'elysia'
import z from 'zod'

import { getAnimeFromAnilistIds } from '../database/functions'
import { getTrending } from '../helper/get-spot'
// import { trendingQueue } from '../queue'
import { createSuccessResponse } from '../helper/response'

const trendingRoutes = new Elysia({ prefix: '/trending' }).get(
  '/',
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

export { trendingRoutes }
