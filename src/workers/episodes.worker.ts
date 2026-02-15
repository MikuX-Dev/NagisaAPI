import { Worker, type Job } from 'bullmq'
import { redis as redisConnection } from '../database/cache'
import { db } from '../database/db'
import { eq } from 'drizzle-orm'
import { episode } from '../database/schema'

import {
  getEpisodes as getDBEpisodes,
  addEpisodes,
  updateEpisodes,
} from '../database/functions'
import { getEpisodes as scrapeEpisodes } from '../mapping/create-full-anime'

import { QUEUE_EPISODES, type EpisodesUpdatePayload } from '../queue'
import { getSingleFribbAnime } from '../crawler/fribb'

const episodesWorker = new Worker<EpisodesUpdatePayload>(
  QUEUE_EPISODES,
  async (job: Job<EpisodesUpdatePayload>) => {
    const { infoId, readd } = job.data

    job.log(`Starting episodes refresh for anime ${infoId}`)

    const { getInfo } = await import('../database/functions')
    const current = await getInfo(infoId)
    if (!current) {
      job.log(`Anime ${infoId} not found, skipping episodes update.`)
      return { skipped: true, reason: 'not_found' }
    }

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

    const freshEpisodes = await scrapeEpisodes(singleFribb)

    if (readd) {
      const deletedCount = await db
        .delete(episode)
        .where(eq(episode.infoId, infoId))

      job.log(
        `Deleted ${deletedCount.rowCount || 0} existing episodes for re-add.`,
      )

      const rows = freshEpisodes.map((ep) => ({
        infoId,
        titles: ep.titles,
        title: ep.title,
        thumbnailImage: ep.thumbnailImage,
        preview: ep.preview,
        description: ep.description,
        number: ep.number,
        rating: ep.rating,
        filler: ep.filler,
        recap: ep.recap,
        runtime: ep.runtime,
        ago: ep.ago,
        providers: ep.providers,
      }))

      await addEpisodes(rows)
      job.log(`Re-added ${freshEpisodes.length} episodes.`)
      job.log(`Episodes re-add for anime ${infoId} complete.`)
      return {
        inserted: freshEpisodes.length,
        updated: 0,
        deleted: deletedCount.rowCount || 0,
      }
    }

    const existingEpisodes = await getDBEpisodes(infoId, { limit: 10_000 })

    const existingByNumber = new Map(
      existingEpisodes.map((ep) => [ep.number, ep]),
    )

    const toInsert: typeof freshEpisodes = []
    const toUpdate: { episodeId: string; data: (typeof freshEpisodes)[0] }[] =
      []

    for (const ep of freshEpisodes) {
      const existing = existingByNumber.get(ep.number)

      if (!existing) {
        toInsert.push(ep)
      } else {
        const changed =
          JSON.stringify(existing.titles) !== JSON.stringify(ep.titles) ||
          existing.thumbnailImage !== ep.thumbnailImage ||
          existing.description !== ep.description ||
          existing.rating !== ep.rating ||
          existing.filler !== ep.filler ||
          existing.recap !== ep.recap ||
          existing.runtime !== ep.runtime ||
          JSON.stringify(existing.providers) !== JSON.stringify(ep.providers)

        if (changed) {
          toUpdate.push({ episodeId: existing.id, data: ep })
        }
      }
    }

    if (toInsert.length > 0) {
      const rows = toInsert.map((ep) => ({
        infoId,
        titles: ep.titles,
        thumbnailImage: ep.thumbnailImage,
        preview: ep.preview,
        description: ep.description,
        number: ep.number,
        rating: ep.rating,
        filler: ep.filler,
        recap: ep.recap,
        runtime: ep.runtime,
        ago: ep.ago,
        providers: ep.providers,
      }))

      await addEpisodes(rows)
      job.log(`Inserted ${toInsert.length} new episodes.`)
    }

    for (const { episodeId, data } of toUpdate) {
      await updateEpisodes(episodeId, infoId, {
        titles: data.titles,
        thumbnailImage: data.thumbnailImage,
        preview: data.preview,
        description: data.description,
        rating: data.rating,
        filler: data.filler,
        recap: data.recap,
        runtime: data.runtime,
        ago: data.ago,
        providers: data.providers,
      })
    }

    if (toUpdate.length > 0) {
      job.log(`Updated ${toUpdate.length} existing episodes.`)
    }

    job.log(`Episodes refresh for anime ${infoId} complete.`)
    return { inserted: toInsert.length, updated: toUpdate.length }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
)

episodesWorker.on('completed', (job) => {
  console.log(`[episodes-worker] Job ${job.id} completed`)
})

episodesWorker.on('failed', (job, err) => {
  console.error(`[episodes-worker] Job ${job?.id} failed:`, err?.message)
})

export { episodesWorker }
