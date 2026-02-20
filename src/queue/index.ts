import { Queue } from 'bullmq'
import { redis as redisConnection } from '../database/cache'

export const QUEUE_ANIME = 'anime-update'
export const QUEUE_EPISODES = 'episodes-update'
export const QUEUE_TRENDING = 'trending-add'
export const QUEUE_SCHEMA_UPDATE = 'anime-schema-update'

export const JOB_REFRESH_ANIME = 'refresh-anime'
export const JOB_REFRESH_EPISODES = 'refresh-episodes'

export const animeQueue = new Queue(QUEUE_ANIME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 60 * 60 * 6 },
    removeOnFail: { age: 60 * 60 * 24 },
  },
})

export const episodesQueue = new Queue(QUEUE_EPISODES, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 60 * 60 * 6 },
    removeOnFail: { age: 60 * 60 * 24 },
  },
})

export const trendingQueue = new Queue(QUEUE_TRENDING, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 60 * 60 * 6 },
    removeOnFail: { age: 60 * 60 * 24 },
  },
})

export const crawlQueue = new Queue('anime-crawl', {
  connection: redisConnection,
})

export const dedupQueue = new Queue('anime-dedup', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 60 * 60 * 6 },
    removeOnFail: { age: 60 * 60 * 24 },
  },
})

export const schemaUpdateQueue = new Queue(QUEUE_SCHEMA_UPDATE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 60 * 60 * 24 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
  },
})

const crawlerQueue = new Queue('anime-crawl', { connection: redisConnection })

export const scheduleDailyUpdate = async () => {
  await crawlerQueue.add(
    'daily-update',
    {},
    {
      repeat: {
        pattern: '0 0 * * *',
      },
      jobId: 'daily-anime-sync',
    },
  )
  console.log('📅 Daily update cron scheduled for 00:00')
}

export interface AnimeUpdatePayload {
  infoId: string
}

export interface TrendingAddPayload {
  ids: string[]
}

export interface EpisodesUpdatePayload {
  infoId: string
  readd: boolean
}
