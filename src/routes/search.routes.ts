import Elysia from 'elysia'
import { z } from 'zod'
import { search } from '../database/functions'
import { createSuccessResponse } from '../helper/response'

const searchRoutes = new Elysia({ prefix: '/search' }).get(
  '/quick',
  async ({ query }) => {
    const { query: searchQuery, limit, offset } = query

    const results = await search({ query: searchQuery, limit, offset })

    return createSuccessResponse(results)
  },
  {
    query: z.object({
      query: z.string(),
      limit: z.preprocess((val) => Number(val), z.number().optional()),
      offset: z.preprocess((val) => Number(val), z.number().optional()),
    }),
  },
)

export { searchRoutes }
