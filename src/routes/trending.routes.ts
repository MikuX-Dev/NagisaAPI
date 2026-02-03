import Elysia from 'elysia'

import { getTrending } from '../helper/get-spot'
import { getAnimeFromAnilistIds } from '../database/functions'
import { trendingQueue } from '../queue'
import z from 'zod'
import { createSuccessResponse } from '../helper/response'

const trendingRoutes = new Elysia({ prefix: '/trending' }).get(
  '/',
  async ({ query }) => {
    const anilistTrendingIds = await getTrending()
    const trendingAnimes = await getAnimeFromAnilistIds(anilistTrendingIds)

    await trendingQueue.add('trending-update', {
      ids: trendingAnimes.unavailable,
    })

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
