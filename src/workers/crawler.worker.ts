import { Worker } from 'bullmq'

import { checkForUpdates, startCrawl, stopCrawl } from '../crawler/crawl'
import { redis } from '../database/cache'

const animeCrawler = new Worker(
  'anime-crawl',
  async (job) => {
    if (job.name === 'daily-update') {
      console.log(`💌 Running job ${job.id}...`)
      await checkForUpdates()

      return { status: 'done' }
    } else {
      console.log(`💌 Running job ${job.id}...`)
      await startCrawl()
      return { status: 'done' }
    }
  },
  { connection: redis },
)

export const shutdownCrawler = async () => {
  stopCrawl()
  await animeCrawler.close()
}

export { animeCrawler }
