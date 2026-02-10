import { addInfo, addEpisodes, getAllAnilistIds } from '../database/functions'
import { getMap, getEpisodes } from '../mapping/create-full-anime'
import type { FribbAnime } from '../types/provider'
import { getFribbList } from './fribb'

const PROGRESS_FILE = 'crawl-progress.json'

let isShuttingDown = false
let isCrawlInProgress = false

export const stopCrawl = () => {
  isShuttingDown = true
}

export const startCrawl = async () => {
  if (isCrawlInProgress) return
  isCrawlInProgress = true

  isShuttingDown = false

  console.log('🚀 Starting Anime Crawler...')

  const list = await getFribbList()

  if (!list || list.length === 0) {
    console.error('❌ Failed to fetch Fribb list or list is empty.')
    return
  }

  let startIndex = 0
  const file = Bun.file(PROGRESS_FILE)

  const crawlStartTime = Date.now()

  let manualRequestCount = 0
  const MAX_MANUAL_LIMIT = 30

  if (await file.exists()) {
    try {
      const state = await file.json()
      if (typeof state.lastIndex === 'number') {
        startIndex = state.lastIndex + 1
        console.log(
          `🔄 Resuming crawl from index ${startIndex} (Last processed: ${state.lastAnilistId})`,
        )
      }
    } catch (_err) {
      console.error('⚠️ Error reading progress file, starting from scratch.')
    }
  }

  console.log(`📋 Total items to process: ${list.length - startIndex}`)

  for (let i = startIndex; i < list.length; i++) {
    if (isShuttingDown) {
      console.log('🛑 Interruption signal received. Stopping crawl loop...')
      break
    }

    const anime = list[i]
    const currentItemCount = i - startIndex + 1

    const elapsedMs = Date.now() - crawlStartTime
    const avgMsPerItem = elapsedMs / currentItemCount
    const itemsRemaining = list.length - (i + 1)
    const etrMs = itemsRemaining * avgMsPerItem

    const etrMinutes = Math.floor(etrMs / 60000)
    const etrSeconds = Math.floor((etrMs % 60000) / 1000)

    console.log(
      `\n[${i + 1}/${list.length}] Processing: ${anime?.anilist_id} 
       ⏱️ Elapsed: ${Math.floor(elapsedMs / 60000)}m | ETR: ${etrMinutes}m ${etrSeconds}s`,
    )

    if (!anime) continue
    console.log(
      `\n[${i + 1}/${list.length}] Processing Anime. Anilist: ${anime?.anilist_id}`,
    )

    let sleepDuration = 5000

    try {
      const mapData = await getMap(anime)

      if (!mapData) {
        console.warn(
          `   ⚠️ No metadata found for ${anime.anilist_id}. Skipping.`,
        )
        continue
      }

      const {
        id: _ignoreInfoId,
        createdAt: _ignoreInfoCreated,
        updatedAt: _ignoreInfoUpdated,
        studio,
        ratelimit,
        ...restInfo
      } = mapData

      if (ratelimit && typeof ratelimit.remaining === 'number') {
        manualRequestCount = 0

        if (ratelimit.remaining <= 3) {
          const retrySeconds = ratelimit.retryAfter || 60
          console.warn(
            `   ⚠️ Rate Limit Approaching (Remaining: ${ratelimit.remaining}). Cooling down for ${retrySeconds}s...`,
          )
          sleepDuration = retrySeconds * 1000
        }
      } else {
        manualRequestCount++

        if (manualRequestCount >= MAX_MANUAL_LIMIT) {
          console.warn(
            `   ⚠️ Manual Rate Limit Reached (${manualRequestCount}/${MAX_MANUAL_LIMIT}). Cooling down for 60s...`,
          )
          sleepDuration = 60000
          manualRequestCount = 0
        }
      }

      const savedInfo = await addInfo({
        ...restInfo,
        studios:
          studio?.map((s) => ({
            id: 0,
            name: s.name,
          })) ?? [],
        genres:
          restInfo.genres?.map((g) => ({
            id: 0,
            name: g.name,
          })) ?? [],
        tags:
          restInfo.tags?.map((t) => ({
            id: 0,
            name: t.name,
          })) ?? [],
      })

      const fetchedEpisodes = await getEpisodes(anime)

      if (fetchedEpisodes && fetchedEpisodes.length > 0) {
        if (!savedInfo?.id) continue
        const episodesToInsert = fetchedEpisodes.map((ep) => {
          const {
            id: _epId,
            createdAt: _epCreated,
            updatedAt: _epUpdated,
            ...epRest
          } = ep

          return {
            ...epRest,
            infoId: savedInfo.id,
          }
        })

        if (!episodesToInsert) continue

        await addEpisodes(episodesToInsert)
        console.log(
          `   ✅ Success: Saved Info (id: ${savedInfo?.id}; slug: ${savedInfo?.slug}) & ${episodesToInsert.length} Episodes.`,
        )
      } else {
        console.log(`   ✅ Success: Saved Info (No episodes found).`)
      }

      await Bun.write(
        PROGRESS_FILE,
        JSON.stringify(
          {
            lastIndex: i,
            lastAnilistId: anime.anilist_id,
            updatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      )
    } catch (error) {
      console.error(
        `   ❌ CRITICAL ERROR processing ${anime.anilist_id}:`,
        error,
      )
    } finally {
      if (i === list.length - 1) {
        isCrawlInProgress = false
      }
    }

    console.log(`   💤 Sleeping for ${sleepDuration / 1000}s...`)
    await Bun.sleep(sleepDuration)
  }

  isCrawlInProgress = false

  if (isShuttingDown) {
    console.log('👋 Crawler paused gracefully. Progress saved.')
  } else {
    console.log('🎉 Crawl Finished!')
  }
}

async function processSingleAnime(anime: FribbAnime) {
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
    ratelimit: _ignoredRateLimit,
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
}

export const checkForUpdates = async () => {
  if (isCrawlInProgress) {
    console.log('⏳ Big crawl is in progress. Skipping daily update check.')
    return
  }

  console.log('🔍 Checking for new anime updates...')

  const fullList = await getFribbList()
  if (!fullList) return

  const existingIds = await getAllAnilistIds()
  const existingSet = new Set(existingIds)

  const missingAnime = fullList.filter(
    (anime) => !existingSet.has(Number(anime.anilist_id)),
  )

  if (missingAnime.length === 0) {
    console.log('✅ Database is already up to date.')
    return
  }

  console.log(`✨ Found ${missingAnime.length} new titles to add.`)

  for (let i = 0; i < missingAnime.length; i++) {
    if (isShuttingDown) break

    const anime = missingAnime[i]
    console.log(
      `[Update ${i + 1}/${missingAnime.length}] Syncing: ${anime?.anilist_id}`,
    )

    if (!anime) continue

    try {
      await processSingleAnime(anime)
    } catch (err) {
      console.error(`❌ Failed to sync ${anime?.anilist_id}:`, err)
    }

    await Bun.sleep(1000)
  }
}
