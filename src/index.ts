import cors from '@elysiajs/cors'
import chalk from 'chalk'
import Elysia from 'elysia'

import { redis } from './database/cache'
import { apiRoutes } from './routes/api.routes'
import { crawlQueue, scheduleDailyUpdate } from './queue'
import { createSuccessResponse } from './helper/response'
import { getAnimeCount } from './database/functions'
await import('./workers/index')

const pastelPink = chalk.hex('#ffb7c5')
const pastelBlue = chalk.hex('#b5e8ff')
const pastelPurple = chalk.hex('#d7b5ff')
const pastelGray = chalk.hex('#e0e0e0')

const PORT = 3000
const HOST = 'localhost'

new Elysia()
  .use(cors())
  .onStart(async () => {
    await scheduleDailyUpdate()

    const existingCount = await getAnimeCount()
    if (existingCount === 0) {
      console.log('🚀 DB is empty. Triggering initial crawl...')
      await crawlQueue.add('initial-crawl', {})
    }
  })
  .get('/', () => ({
    message: 'Elo! Fuck uu<3 uwu',
  }))
  // .get('/start-crawl', async () => {
  //   const job = await crawlQueue.add('start-crawl', {})
  //   return createSuccessResponse({
  //     message: 'Crawl started.',
  //     jobId: job.id,
  //   })
  // })
  .use(apiRoutes)
  .get('/redis', async () => {
    try {
      const p = await redis.ping()

      if (p === 'PONG')
        return {
          message: 'Redis is working successfully! (*^_^*)',
        }
      else {
        return { message: 'Redis is fucked up. (；′⌒`)' }
      }
    } catch {
      return { message: 'Redis is fucked up. (；′⌒`)' }
    }
  })
  .listen(PORT)

console.log(
  pastelGray('─'.repeat(40)) +
    '\n' +
    pastelPink('♡ Server started successfully~ ♡\n') +
    pastelBlue(`→ Host : ${HOST}\n`) +
    pastelPurple(`→ Name  : Nagisa API\n`) +
    pastelBlue(`→ Full : http://${HOST}:${PORT}/\n`) +
    pastelGray('─'.repeat(40)),
)
