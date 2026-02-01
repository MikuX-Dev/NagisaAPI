import { addInfo, addEpisodes } from '../database/functions'
import { getMap, getEpisodes } from '../mapping/create-full-anime'
import { getFribbList } from './fribb'

const PROGRESS_FILE = 'crawl-progress.json'

let isShuttingDown = false

export const stopCrawl = () => {
  isShuttingDown = true
}

export const startCrawl = async () => {
  isShuttingDown = false

  console.log('🚀 Starting Anime Crawler...')

  const list = await getFribbList()

  if (!list || list.length === 0) {
    console.error('❌ Failed to fetch Fribb list or list is empty.')
    return
  }

  let startIndex = 0
  const file = Bun.file(PROGRESS_FILE)

  const totalToProcess = list.length - startIndex
  const crawlStartTime = Date.now()

  if (await file.exists()) {
    try {
      const state = await file.json()
      if (typeof state.lastIndex === 'number') {
        startIndex = state.lastIndex + 1
        console.log(
          `🔄 Resuming crawl from index ${startIndex} (Last processed: ${state.lastAnilistId})`,
        )
      }
    } catch (err) {
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
        ...restInfo
      } = mapData

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
    }

    console.log('   💤 Sleeping for 5s...')
    await Bun.sleep(5000)
  }

  if (isShuttingDown) {
    console.log('👋 Crawler paused gracefully. Progress saved.')
  } else {
    console.log('🎉 Crawl Finished!')
  }
}
