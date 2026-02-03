import Elysia from 'elysia'
import { HTTPError } from 'ky'
import { z } from 'zod'

import { redis } from '../database/cache'
import {
  getAllAnimeIdAndTitle,
  getEpisodes,
  getInfo,
} from '../database/functions'

import { getRedisKey } from '../helper/redis-keys'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
} from '../helper/response'

import {
  animeQueue,
  episodesQueue,
  JOB_REFRESH_ANIME,
  JOB_REFRESH_EPISODES,
} from '../queue'

const CACHE_TTL = 60 * 60

const animeRoutes = new Elysia({ prefix: '/anime' })
  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        const { id } = params
        const cacheKey = getRedisKey('anime', id)

        const cached = await redis.get(cacheKey)
        if (cached) {
          return createSuccessResponse(JSON.parse(cached))
        }

        const anime = await getInfo(id)
        if (!anime?.id) {
          set.status = 404
          return createErrorResponse(
            'Could not find the anime in the database.',
            ErrorCodes.NOT_FOUND,
          )
        }
        const episodes = await getEpisodes(id)

        const info = {
          ...anime,
          episodes,
        }

        await redis.set(cacheKey, JSON.stringify(info), 'EX', CACHE_TTL)

        const status = anime.status?.toLowerCase()
        if (status !== 'finished' && status !== 'cancelled') {
          await animeQueue.add(
            JOB_REFRESH_ANIME,
            { infoId: id },
            {
              jobId: `anime-refresh-${id}`,
            },
          )
        }

        await episodesQueue.add(
          JOB_REFRESH_EPISODES,
          { infoId: id },
          {
            jobId: `episodes-refresh-${id}`,
          },
        )

        return createSuccessResponse(info)
      } catch (error) {
        if (error instanceof HTTPError) {
          set.status = 500
          return createErrorResponse(
            'An external API error occurred.',
            ErrorCodes.EXTERNAL_API_ERROR,
            { message: error.message },
          )
        }
        if (error instanceof Error) {
          set.status = 500
          return createErrorResponse(
            'An internal server error occurred.',
            ErrorCodes.SERVER_ERROR,
            { message: error.message },
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
    async ({ params, query, set }) => {
      try {
        const { id } = params
        const { limit, offset, orderBy } = query

        const cacheKey = getRedisKey(
          'episodes',
          `${id}:${limit ?? 'all'}:${offset ?? 0}:${orderBy ?? 'asc'}`,
        )

        const cached = await redis.get(cacheKey)
        if (cached) {
          return createSuccessResponse(JSON.parse(cached))
        }

        const episodes = await getEpisodes(id, {
          limit,
          offset,
          orderBy,
        })

        if (episodes.length <= 0) {
          set.status = 404
          return createErrorResponse(
            `Could not find episodes for id: \`${id}\`.`,
            ErrorCodes.NOT_FOUND,
          )
        }

        await redis.set(cacheKey, JSON.stringify(episodes), 'EX', CACHE_TTL)

        await episodesQueue.add(
          JOB_REFRESH_EPISODES,
          { infoId: id },
          {
            jobId: `episodes-refresh-${id}`,
          },
        )

        return createSuccessResponse(episodes)
      } catch (error) {
        if (error instanceof HTTPError) {
          set.status = 500
          return createErrorResponse(
            'An external API error occurred.',
            ErrorCodes.EXTERNAL_API_ERROR,
            { message: error.message },
          )
        }
        if (error instanceof Error) {
          set.status = 500
          return createErrorResponse(
            'An internal server error occurred.',
            ErrorCodes.SERVER_ERROR,
            { message: error.message },
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
  .get(
    '/all',
    async ({ query }) => {
      const { limit, offset } = query

      const allResults = await getAllAnimeIdAndTitle(offset, limit)

      return createSuccessResponse(allResults)
    },
    {
      query: z.object({
        limit: z.preprocess((val) => Number(val), z.number().optional()),
        offset: z.preprocess((val) => Number(val), z.number().optional()),
      }),
    },
  )

export { animeRoutes }
