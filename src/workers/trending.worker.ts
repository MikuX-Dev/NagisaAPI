import { Worker, type Job } from 'bullmq'
import { redis as redisConnection } from '../database/cache'
import { QUEUE_TRENDING, type TrendingAddPayload } from '../queue'
import { getSingleFribbAnime } from '../crawler/fribb'
import { getEpisodes, getMap } from '../mapping/create-full-anime'
import { addInfo, addEpisodes } from '../database/functions'
import { sleep } from 'bun'
import type { FribbAnime } from '../types/provider'

async function processSingleAnime(anime: FribbAnime) {
  try {
    const mapData = await getMap(anime)

    if (!mapData) {
      console.warn(`   ⚠️ No metadata found for ${anime.anilist_id}. Skipping.`)
      return
    }

    const {
      id: _ignoreId,
      createdAt: _ignoreCreated,
      updatedAt: _ignoreUpdated,
      studio: studioData,
      ...restInfo
    } = mapData

    const savedInfo = await addInfo({
      ...restInfo,
      studios: studioData?.map((s) => ({ id: 0, name: s.name })) ?? [],
      genres: restInfo.genres?.map((g) => ({ id: 0, name: g.name })) ?? [],
      tags: restInfo.tags?.map((t) => ({ id: 0, name: t.name })) ?? [],
    })

    if (!savedInfo?.id) {
      console.error(`   ❌ Failed to get a saved ID for ${anime.anilist_id}`)
      return
    }

    const fetchedEpisodes = await getEpisodes(anime)

    if (fetchedEpisodes && fetchedEpisodes.length > 0) {
      const episodesToInsert = fetchedEpisodes.map((ep) => {
        const { id, createdAt, updatedAt, ...epRest } = ep
        return {
          ...epRest,
          infoId: savedInfo.id,
        }
      })

      await addEpisodes(episodesToInsert)
      console.log(
        `   ✅ Success: Saved Info & ${episodesToInsert.length} Episodes.`,
      )
    } else {
      console.log(`   ✅ Success: Saved Info (No episodes found).`)
    }
  } catch (error) {
    throw error
  }
}

export const trendingWorker = new Worker<TrendingAddPayload>(
  QUEUE_TRENDING,
  async (job: Job<TrendingAddPayload>) => {
    const { ids } = job.data

    console.log(`🔥 Processing ${ids.length} trending anime`)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const id of ids) {
      try {
        await job.updateProgress(
          Math.round(((results.success + results.failed) / ids.length) * 100),
        )

        console.log(`   📍 Fetching anime ${id}...`)
        const anime = await getSingleFribbAnime(id)

        if (!anime) {
          console.warn(`   ⚠️ Could not fetch anime ${id}`)
          results.failed++
          results.errors.push(`${id}: Not found`)
          continue
        }

        await processSingleAnime(anime)
        results.success++

        await sleep(5000)
      } catch (error) {
        console.error(`   ❌ Error processing ${id}:`, error)
        results.failed++
        results.errors.push(
          `${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    console.log(`\n✨ Trending batch complete:`)
    console.log(`   ✅ Success: ${results.success}`)
    console.log(`   ❌ Failed: ${results.failed}`)

    if (results.errors.length > 0) {
      console.log(`   Errors:`, results.errors)
    }

    return results
  },
  {
    connection: redisConnection,
    concurrency: 1,
    limiter: {
      max: 5,
      duration: 60_000,
    },
  },
)

trendingWorker.on('completed', (job) => {
  console.log(`✅ Trending job ${job.id} completed`)
})

trendingWorker.on('failed', (job, err) => {
  console.error(`❌ Trending job ${job?.id} failed:`, err)
})

trendingWorker.on('error', (err) => {
  console.error('🚨 Trending worker error:', err)
})

console.log('🚀 Trending worker started')
