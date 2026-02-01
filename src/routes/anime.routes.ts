import Elysia from 'elysia'
import { HTTPError } from 'ky'
import { z } from 'zod'

import { getEpisodes, getInfo } from '../database/functions'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
} from '../helper/response'

const animeRoutes = new Elysia({ prefix: '/anime' })
  .get(
    '/:id',
    async ({ params }) => {
      try {
        const { id } = params

        const anime = await getInfo(id)
        const episodes = await getEpisodes(id)

        // Todo: Use workers to update the info in the background if the anime status is not finished or cancelled.

        const info = {
          ...anime,
          episodes,
        }

        return createSuccessResponse(info)
      } catch (error) {
        // Todo: Move to error handler in future. Instead of repetition.
        if (error instanceof HTTPError) {
          return createErrorResponse(
            'An API fucked us :c',
            ErrorCodes.EXTERNAL_API_ERROR,
            {
              message: error.message,
            },
          )
        }
        if (error instanceof Error) {
          return createErrorResponse(
            `We got fucked :(`,
            ErrorCodes.SERVER_ERROR,
            {
              message: error.message,
            },
          )
        }
      }
    },
    {
      params: z.object({
        id: z.string(),
      }),
    },
  )
  .get(
    '/:id/episodes',
    async ({ params, query }) => {
      try {
        const { id } = params
        const { limit, offset, orderBy } = query

        const episodes = await getEpisodes(id, {
          limit,
          offset,
          orderBy,
        })

        // Todo: Use workers to update the episodes in the background always

        return createSuccessResponse(episodes)
      } catch (error) {
        // Todo: Move to error handler in future. Instead of repetition.
        if (error instanceof HTTPError) {
          return createErrorResponse(
            'An API fucked us :c',
            ErrorCodes.EXTERNAL_API_ERROR,
            {
              message: error.message,
            },
          )
        }
        if (error instanceof Error) {
          return createErrorResponse(
            `We got fucked :(`,
            ErrorCodes.SERVER_ERROR,
            {
              message: error.message,
            },
          )
        }
      }
    },
    {
      params: z.object({
        id: z.string(),
      }),
      query: z.object({
        limit: z.preprocess((val) => Number(val), z.number().optional()),
        offset: z.preprocess((val) => Number(val), z.number().optional()),
        orderBy: z.enum(['asc', 'desc']).default('asc').optional(),
      }),
    },
  )

export { animeRoutes }
