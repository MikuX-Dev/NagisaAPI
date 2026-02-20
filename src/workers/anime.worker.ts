// biome-ignore assist/source/organizeImports: Cant deal with this now.
import { Worker, type Job } from 'bullmq'
import { redis as redisConnection } from '../database/cache'

import { getInfo } from '../database/functions'
import { updateInfo } from '../database/functions'
import { getMap } from '../mapping/create-full-anime'

import { QUEUE_ANIME, type AnimeUpdatePayload } from '../queue'
import { getSingleFribbAnime } from '../crawler/fribb'

const animeWorker = new Worker<AnimeUpdatePayload>(
  QUEUE_ANIME,
  async (job: Job<AnimeUpdatePayload>) => {
    const { infoId } = job.data

    const current = await getInfo(infoId)
    if (!current) {
      job.log(`Anime ${infoId} not found in DB, skipping.`)
      return { skipped: true, reason: 'not_found' }
    }

    job.log(`Starting refresh for anime ${infoId}`)

    const anilistId = current.externalIds?.anilistId
    if (!anilistId) {
      job.log(`Anime ${infoId} not found in DB, skipping.`)
      return { skipped: true, reason: 'not_found' }
    }
    const singleFribb = await getSingleFribbAnime(anilistId)

    if (!singleFribb) {
      job.log(`Anime ${infoId} not found in fribb list, skipping.`)
      return { skipped: true, reason: 'not_found' }
    }

    const freshInfo = await getMap(singleFribb)

    await updateInfo(infoId, {
      slug: freshInfo.slug,
      titles: freshInfo.titles,
      synonyms: freshInfo.synonyms,
      description: freshInfo.description,
      coverImage: freshInfo.coverImage,
      bannerImage: freshInfo.bannerImage,
      logoImage: freshInfo.logoImage,
      color: freshInfo.color,
      coverColor: freshInfo.coverColor,
      status: freshInfo.status,
      format: freshInfo.format,
      season: freshInfo.season,
      tagline: freshInfo.tagline,
      airDate: freshInfo.airDate,
      currentEpisode: freshInfo.currentEpisode,
      totalEpisodes: freshInfo.totalEpisodes,
      countryOfOrigin: freshInfo.countryOfOrigin,
      rating: freshInfo.rating,
      ageRating: freshInfo.ageRating,
      subCount: freshInfo.subCount,
      dubCount: freshInfo.dubCount,
      characters: freshInfo.characters,
      relations: freshInfo.relations,
      trailers: freshInfo.trailers,
      artwork: freshInfo.artwork,
      externalIds: freshInfo.externalIds,
      genres: freshInfo.genres,
      tags: freshInfo.tags,
      studios: freshInfo.studio,
    })

    job.log(`Anime ${infoId} refreshed successfully.`)
    return { updated: true }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
)

animeWorker.on('completed', (job) => {
  console.log(`[anime-worker] Job ${job.id} completed`)
})

animeWorker.on('failed', (job, err) => {
  console.error(`[anime-worker] Job ${job?.id} failed:`, err?.message)
})

export { animeWorker }
