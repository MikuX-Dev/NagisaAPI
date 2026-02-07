import ky from 'ky'

const URL =
  'https://cdn.jsdelivr.net/gh/ThaUnknown/filler-scrape@main/filler-readable.json'

let fillerMap = new Map<string, Set<number>>()
let lastUpdated = 0
const ONE_HOUR = 60 * 60 * 1000

async function ensureFresh() {
  if (Date.now() - lastUpdated < ONE_HOUR) return

  const json = await ky.get(URL).json<Record<string, number[]>>()
  const next = new Map<string, Set<number>>()

  for (const [id, eps] of Object.entries(json)) {
    next.set(id, new Set(eps))
  }

  fillerMap = next
  lastUpdated = Date.now()
}

export async function getFillerEpisodes(anilistId: string) {
  await ensureFresh()
  const episodes = fillerMap.get(anilistId)
  return episodes ? Array.from(episodes) : []
}
