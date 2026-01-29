import type { CrysolineProviderEpisode } from '../types/provider'

export function getSubAndDubCount(
  providerType: ('H-SUB' | 'SUB' | 'DUB')[],
  episodes: CrysolineProviderEpisode[],
): { subCount: number; dubCount: number } {
  let subCount = 0
  let dubCount = 0

  const hasSubType = providerType.some(
    (type) => type === 'H-SUB' || type === 'SUB',
  )
  const hasDubType = providerType.includes('DUB')

  if (hasSubType) {
    subCount = episodes.length
  }

  if (hasDubType) {
    dubCount = episodes.filter((episode) => episode.hasDub === true).length
  }

  return { subCount, dubCount }
}
