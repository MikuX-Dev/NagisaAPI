import Elysia from 'elysia'
import { HTTPError } from 'ky'
import { z } from 'zod'

import { redis } from '../database/cache'
import {
  getAllAnimeIdAndTitle,
  getAnimeCount,
  getEpisodes,
  getGenres,
  getInfo,
  getStudios,
  getTags,
  nukeAllAnimeEpisodes,
} from '../database/functions'

import { getRedisKey } from '../helper/redis-keys'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
} from '../helper/response'

import Miyako from '../providers/anime/miyako-anizone'
import Nagisa from '../providers/anime/nagisa-animekai'
import Toki from '../providers/anime/toki-zencloud'
import type { AnimeBase } from '../providers/base/anime'

import {
  animeQueue,
  episodesQueue,
  JOB_REFRESH_ANIME,
  JOB_REFRESH_EPISODES,
} from '../queue'
import Akari from '../providers/anime/akari-aniliberty'
import Aoi from '../providers/anime/aoi-animeparadise'
import Eimi from '../providers/anime/eimi-animeheaven'
import Haruka from '../providers/anime/haruka-animeonsen'
import Hiyori from '../providers/anime/hiyori-animegg'
import Kaede from '../providers/anime/kaede-animex'
import Maki from '../providers/anime/maki-anicore'
import Misaki from '../providers/anime/misaki-hianime'
import Miyu from '../providers/anime/miyu-anidap'
import Rin from '../providers/anime/rin-kickassanime'
import Yuuka from '../providers/anime/yuuka-animepahe'

const CACHE_TTL = 60 * 60

const animeRoutes = new Elysia({ prefix: '/anime' })
  .get(
    '/:id',
    async ({ params, query, set }) => {
      try {
        const { id } = params
        const { anilistRefresh, fresh, episodes: useEpisodes } = query
        const cacheKey = getRedisKey(
          'anime',
          `${id}-${useEpisodes ? 'with-episodes' : 'no-episodes'}`,
        )

        const cached = await redis.get(cacheKey)
        if (cached && !fresh) {
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
          episodes: useEpisodes ? episodes : [],
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

        // Remap because anilist didnt return all the info :c
        if (
          anime.slug === '' ||
          anime.slug === null ||
          !anime.slug ||
          anilistRefresh
        ) {
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
      query: z.object({
        anilistRefresh: z.preprocess(
          (val) => Boolean(val),
          z.boolean().optional(),
        ),
        fresh: z.preprocess((val) => Boolean(val), z.boolean().optional()),
        episodes: z.preprocess((val) => Boolean(val), z.boolean().optional()),
      }),
    },
  )
  .get(
    '/:id/episodes',
    async ({ params, query, set }) => {
      try {
        const { id } = params
        const { limit, offset, orderBy, airedOnly, fresh, readd } = query

        const cacheKey = getRedisKey(
          'episodes',
          `${id}:${limit ?? 'all'}:${offset ?? 0}:${orderBy ?? 'asc'}:${airedOnly ? 'true' : 'false'}`,
        )

        const cached = await redis.get(cacheKey)
        if (cached && !fresh) {
          return createSuccessResponse(JSON.parse(cached))
        }

        const episodes = await getEpisodes(id, {
          limit,
          offset,
          orderBy,
        })

        await episodesQueue.add(
          JOB_REFRESH_EPISODES,
          { infoId: id, readd },
          {
            jobId: `episodes-refresh-${id}`,
          },
        )

        await redis.set(cacheKey, JSON.stringify(episodes), 'EX', CACHE_TTL)

        if (airedOnly) {
          const airedOnlyEpisodes = episodes.filter(
            (episode) =>
              episode.ago && !episode.ago.toLowerCase().includes('in'),
          )

          return createSuccessResponse(airedOnlyEpisodes)
        }

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
        airedOnly: z.preprocess(
          (val) => Boolean(val),
          z.boolean().optional().default(true),
        ),
        fresh: z.preprocess((val) => Boolean(val), z.boolean().optional()),
        readd: z.preprocess((val) => Boolean(val), z.boolean().optional()),
      }),
    },
  )
  .get(
    '/:id/episodes/:number',
    async ({ params, query, set }) => {
      const providers = [
        new Nagisa(),
        new Miyako(),
        new Toki(),
        new Akari(),
        new Aoi(),
        new Eimi(),
        new Haruka(),
        new Hiyori(),
        new Kaede(),
        new Maki(),
        new Misaki(),
        new Miyu(),
        new Rin(),
        new Yuuka(),
      ] as AnimeBase[]

      const { server, subType } = query
      const { id, number } = params

      const currentProvider = providers.find(
        (provider) => provider.name.toLowerCase() === server.toLowerCase(),
      )

      if (!currentProvider?.name) {
        set.status = 400
        return createErrorResponse(
          'The server you provided does not exist.',
          ErrorCodes.BAD_REQUEST,
        )
      }

      const episodes = await getEpisodes(id, { full: true, limit: 10_000 })
      const currentEpisode = episodes.find(
        (episode) => Number(episode.number) === Number(number),
      )

      // if (!currentEpisode?.id) {
      //   set.status = 404
      //   return createErrorResponse(
      //     `Could not find episode for the number: \`${number}\``,
      //     ErrorCodes.NOT_FOUND,
      //   )
      // }

      const serverEpisode = currentEpisode?.providers.find(
        (provider) =>
          provider.providerName.toLowerCase() === server.toLowerCase(),
      )

      // if (!serverEpisode?.id || !serverEpisode?.episodeId) {
      //   set.status = 404
      //   return createErrorResponse(
      //     `Could not find episode for the number: \`${number}\``,
      //     ErrorCodes.NOT_FOUND,
      //   )
      // }

      const sources = await currentProvider.getSources(
        serverEpisode?.id as string,
        serverEpisode?.episodeId as string,
        subType,
      )

      return createSuccessResponse({
        episode: currentEpisode,
        sources,
      })
    },
    {
      params: z.object({
        id: z.string(),
        number: z.preprocess((val) => Number(val), z.number().optional()),
      }),
      query: z.object({
        subType: z.enum(['sub', 'dub', 'h-sub']).default('sub'),
        server: z.string().default('toki'),
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
  .get('/count', async () => {
    const count = await getAnimeCount()

    return createSuccessResponse({ count })
  })
  .get(
    '/nuke-episodes',
    async ({ query, set }) => {
      const { pw } = query

      if (pw !== 'svznisgay123andiloveplat') {
        set.status = 403
        return createErrorResponse('NO.', ErrorCodes.FORBIDDEN)
      }

      const count = await nukeAllAnimeEpisodes()

      return createSuccessResponse({ count })
    },
    {
      query: z.object({
        pw: z.string(),
      }),
    },
  )
  .get('/genres', async () => {
    const genres = await getGenres()
    return createSuccessResponse(genres)
  })
  .get('/tags', async () => {
    const tags = await getTags()
    return createSuccessResponse(tags)
  })
  .get('/studios', async () => {
    const studios = await getStudios()
    return createSuccessResponse(studios)
  })

export { animeRoutes }
