import Redis from 'ioredis'

const REDIS = process.env.REDIS ?? 'redis:6379'

const REDIS_DATA_ARRAY = REDIS.split(':')
const REDIS_HOST = REDIS_DATA_ARRAY[0] ?? 'redis'
const REDIS_PORT = Number.parseInt(REDIS_DATA_ARRAY[1] ?? '6379', 10)

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
})
