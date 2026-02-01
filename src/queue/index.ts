import { Queue } from 'bullmq'
import { redis as redisConnection } from '../database/cache'

export const QUEUE_ANIME = 'anime-update'
export const QUEUE_EPISODES = 'episodes-update'

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

export const crawlQueue = new Queue('anime-crawl', {
  connection: redisConnection,
})

export interface AnimeUpdatePayload {
  infoId: string
}

export interface EpisodesUpdatePayload {
  infoId: string
}
