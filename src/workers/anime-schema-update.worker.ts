import { Worker, type Job } from 'bullmq'
import { redis as redisConnection } from '../database/cache'
import {
  updateInfo,
  getAllInfoRows,
  getAnimeCount,
} from '../database/functions'
import { getMap } from '../mapping/create-full-anime'
import { getSingleFribbAnime } from '../crawler/fribb'

const SCHEMA_UPDATE_PROGRESS_FILE = 'schema-update-progress.json'

interface SchemaUpdatePayload {
  trigger: 'start'
}

const schemaUpdateWorker = new Worker<SchemaUpdatePayload>(
  'anime-schema-update',
  async (job: Job<SchemaUpdatePayload>) => {
    console.log('📊 Starting Schema Update Worker...')

    let startOffset = 0
    let processedCount = 0
    let skippedCount = 0
    let errorCount = 0
    let alreadyRunning = false

    const progressFile = Bun.file(SCHEMA_UPDATE_PROGRESS_FILE)
    const totalAnime = await getAnimeCount()

    if (await progressFile.exists()) {
      try {
        const state = await progressFile.json()
        if (typeof state.lastOffset === 'number') {
          startOffset = state.lastOffset
          processedCount = state.processedCount || 0
          alreadyRunning = state.inProgress || false
          console.log(`🔄 Resuming from offset ${startOffset}`)
          console.log(`   Processed so far: ${processedCount}/${totalAnime}`)
        }
      } catch (_err) {
        console.warn('⚠️ Error reading progress file, starting from scratch.')
      }
    }

    if (alreadyRunning) {
      console.warn('⚠️ Schema update already in progress, aborting.')
      return { status: 'already_running' }
    }

    await Bun.write(
      SCHEMA_UPDATE_PROGRESS_FILE,
      JSON.stringify(
        {
          startedAt: new Date().toISOString(),
          inProgress: true,
          lastOffset: startOffset,
          processedCount,
          totalAnime,
        },
        null,
        2,
      ),
    )

    const BATCH_SIZE = 50
    let currentOffset = startOffset

    console.log(`📋 Total anime to process: ${totalAnime}`)

    while (currentOffset < totalAnime) {
      const animeRows = await getAllInfoRows({
        limit: BATCH_SIZE,
        offset: currentOffset,
      })

      if (animeRows.length === 0) break

      console.log(
        `\n📦 Processing batch: ${currentOffset + 1}-${Math.min(currentOffset + BATCH_SIZE, totalAnime)}/${totalAnime}`,
      )

      for (const row of animeRows) {
        const { id: infoId, anilistId } = row

        // Skip if no anilist ID
        if (!anilistId) {
          console.log(`   ⏭️  Skipping ${infoId} (no anilist ID)`)
          skippedCount++
          continue
        }

        try {
          job.log(`Processing ${infoId} (${processedCount + 1}/${totalAnime})`)
          console.log(
            `   [${processedCount + 1}/${totalAnime}] Processing ${infoId}`,
          )

          const fribbAnime = await getSingleFribbAnime(anilistId)

          if (!fribbAnime) {
            console.warn(
              `   ⚠️  Anime ${anilistId} not found in fribb list, skipping.`,
            )
            skippedCount++
            processedCount++
            continue
          }

          const freshInfo = await getMap(fribbAnime)

          if (!freshInfo) {
            console.warn(`   ⚠️  Failed to get fresh info for ${infoId}`)
            skippedCount++
            processedCount++
            continue
          }

          // Update with all schema fields including tagline and trailers
          await updateInfo(infoId, {
            slug: freshInfo.slug,
            titles: freshInfo.titles,
            synonyms: freshInfo.synonyms,
            description: freshInfo.description,
            coverImage: freshInfo.coverImage,
            bannerImage: freshInfo.bannerImage,
            logoImage: freshInfo.logoImage,
            color: freshInfo.color,
            coverColor: freshInfo.coverColor,
            status: freshInfo.status,
            format: freshInfo.format,
            season: freshInfo.season,
            tagline: freshInfo.tagline,
            airDate: freshInfo.airDate,
            currentEpisode: freshInfo.currentEpisode,
            totalEpisodes: freshInfo.totalEpisodes,
            countryOfOrigin: freshInfo.countryOfOrigin,
            rating: freshInfo.rating,
            ageRating: freshInfo.ageRating,
            subCount: freshInfo.subCount,
            dubCount: freshInfo.dubCount,
            characters: freshInfo.characters,
            relations: freshInfo.relations,
            trailers: freshInfo.trailers,
            artwork: freshInfo.artwork,
            externalIds: freshInfo.externalIds,
            genres: freshInfo.genres,
            tags: freshInfo.tags,
            studios: freshInfo.studio,
          })

          processedCount++
          console.log(`   ✅ Updated ${infoId}`)
        } catch (error) {
          errorCount++
          console.error(
            `   ❌ Error processing ${infoId}:`,
            error instanceof Error ? error.message : error,
          )
        }

        // Sleep for a bit to avoid overwhelming the system
        console.log('   💤 Sleeping 2s...')
        await Bun.sleep(2000)
      }

      currentOffset += BATCH_SIZE

      // Update progress file
      await Bun.write(
        SCHEMA_UPDATE_PROGRESS_FILE,
        JSON.stringify(
          {
            startedAt: new Date().toISOString(),
            inProgress: true,
            lastOffset: currentOffset,
            processedCount,
            totalAnime,
            skippedCount,
            errorCount,
          },
          null,
          2,
        ),
      )

      // Sleep between batches
      console.log('⏸️ Sleeping 5s between batches...')
      await Bun.sleep(5000)
    }

    // Mark as complete
    await Bun.write(
      SCHEMA_UPDATE_PROGRESS_FILE,
      JSON.stringify(
        {
          completedAt: new Date().toISOString(),
          inProgress: false,
          processedCount,
          totalAnime,
          skippedCount,
          errorCount,
        },
        null,
        2,
      ),
    )

    console.log('\n🎉 Schema Update Complete!')
    console.log(`   ✅ Processed: ${processedCount}`)
    console.log(`   ⏭️  Skipped: ${skippedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)

    job.log(
      `Schema update complete. Processed: ${processedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
    )

    return {
      status: 'completed',
      processedCount,
      skippedCount,
      errorCount,
      totalAnime,
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Only one job at a time
  },
)

schemaUpdateWorker.on('completed', (job) => {
  console.log(`[schema-update-worker] Job ${job.id} completed`)
})

schemaUpdateWorker.on('failed', (job, err) => {
  console.error(`[schema-update-worker] Job ${job?.id} failed:`, err?.message)
})

export { schemaUpdateWorker }
