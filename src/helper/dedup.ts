import {
  getAllInfoRows,
  deleteEpisodesByInfoIds,
  deleteInfosByIds,
} from '../database/functions'

export interface InfoRow {
  id: string
  anilistId?: string | null
  malId?: string | null
  kitsuId?: string | null
  createdAt?: Date | string
}

interface DedupOptions {
  batchSize?: number
  offset?: number
}
function pickWinner(group: InfoRow[]): { winner: InfoRow; losers: InfoRow[] } {
  const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id))
  const [winner, ...losers] = sorted
  return { winner: winner as InfoRow, losers }
}

export async function removeDuplicates(options: DedupOptions = {}) {
  const { batchSize = 500, offset = 0 } = options

  console.log('🔍 Starting duplicate removal...')

  const groups = new Map<string, InfoRow[]>()

  let page = 0
  let totalLoaded = 0
  let hasMore = true

  while (hasMore) {
    const currentOffset = offset + page * batchSize

    console.log(
      `   📦 Loading rows ${currentOffset} – ${currentOffset + batchSize - 1}...`,
    )

    const rows: InfoRow[] = await getAllInfoRows({
      limit: batchSize,
      offset: currentOffset,
    })

    if (rows.length === 0) {
      hasMore = false
      break
    }

    for (const row of rows) {
      const keys: string[] = []
      if (row.anilistId) keys.push(`anilist:${row.anilistId}`)
      if (row.malId) keys.push(`mal:${row.malId}`)
      if (row.kitsuId) keys.push(`kitsu:${row.kitsuId}`)

      if (keys.length === 0) continue

      const canonicalKey = keys[0]

      const existing = groups.get(canonicalKey as string) ?? []
      existing.push(row)
      groups.set(canonicalKey as string, existing)
    }

    totalLoaded += rows.length
    page++

    if (rows.length < batchSize) hasMore = false
  }

  console.log(
    `   ✅ Loaded ${totalLoaded} total rows across ${groups.size} unique identifiers.`,
  )

  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1)

  if (duplicateGroups.length === 0) {
    console.log('🎉 No duplicates found. Database is clean!')
    return
  }

  const totalDuplicates = duplicateGroups.reduce(
    (acc, g) => acc + g.length - 1,
    0,
  )
  console.log(
    `🗑️  Found ${duplicateGroups.length} duplicate groups → ${totalDuplicates} rows to delete.`,
  )

  let loserIds: string[] = []

  for (const group of duplicateGroups) {
    const { winner, losers } = pickWinner(group)
    console.log(
      `   🏆 Keeping id=${winner.id} | Removing ids=[${losers.map((l) => l.id).join(', ')}]`,
    )
    loserIds.push(...losers.map((l) => String(l.id)))

    if (loserIds.length >= batchSize) {
      await flushLosers(loserIds)
      loserIds = []
    }
  }

  if (loserIds.length > 0) {
    await flushLosers(loserIds)
  }

  console.log(`✅ Duplicate removal complete. Deleted ${totalDuplicates} rows.`)
}

async function flushLosers(ids: string[]) {
  console.log(`   🗑️  Deleting ${ids.length} duplicate entries...`)

  await deleteEpisodesByInfoIds(ids)
  await deleteInfosByIds(ids)
}
