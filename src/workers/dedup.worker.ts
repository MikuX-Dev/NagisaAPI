import { Worker, Job } from 'bullmq'
import { redis } from '../database/cache'
import { removeDuplicates } from '../helper/dedup'

const dedupWorker = new Worker(
  'anime-dedup',
  async (job: Job) => {
    console.log(`💌 Running dedup job ${job.id} (${job.name})...`)

    if (job.name === 'dedup-full') {
      await removeDuplicates({ batchSize: 500 })
      return { status: 'done' }
    }

    if (job.name === 'dedup-batch') {
      const { offset = 0, limit = 500 } = job.data ?? {}
      await removeDuplicates({ batchSize: limit, offset })
      return { status: 'done' }
    }

    console.warn(`⚠️ Unknown job name: ${job.name}`)
    return { status: 'skipped' }
  },
  { connection: redis },
)

dedupWorker.on('completed', (job) =>
  console.log(`✅ Dedup job ${job.id} completed.`),
)
dedupWorker.on('failed', (job, err) =>
  console.error(`❌ Dedup job ${job?.id} failed:`, err),
)

export const shutdownDedupWorker = async () => {
  await dedupWorker.close()
}

export { dedupWorker }
