import { animeWorker } from './anime.worker'
import { episodesWorker } from './episodes.worker'
import { shutdownCrawler } from './crawler.worker'
import { trendingWorker } from './trending.worker'
import { schemaUpdateWorker } from './anime-schema-update.worker'
// import { shutdownDedupWorker } from './dedup.worker'

console.log('🚀 All workers started')

const handleShutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`)

  const forceQuit = setTimeout(() => {
    console.error('Forcefully exiting due to timeout')
    process.exit(1)
  }, 10000)

  try {
    await Promise.all([
      animeWorker.close(),
      episodesWorker.close(),
      trendingWorker.close(),
      schemaUpdateWorker.close(),
      shutdownCrawler(),
      // shutdownDedupWorker(),
    ])

    clearTimeout(forceQuit)
    console.log('✅ Shutdown complete. Goodbye!')
    process.exit(0)
  } catch (err) {
    console.error('Error during shutdown:', err)
    process.exit(1)
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))
