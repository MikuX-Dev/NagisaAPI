import { Worker } from 'bullmq'

import { startCrawl, stopCrawl } from '../crawler/crawl'
import { redis } from '../database/cache'

const animeCrawler = new Worker(
  'anime-crawl',
  async (job) => {
    console.log(`💌 Running job ${job.id}...`)
    await startCrawl()
    return { status: 'done' }
  },
  { connection: redis },
)

export const shutdownCrawler = async () => {
  stopCrawl()
  await animeCrawler.close()
}

export { animeCrawler }
