import ky from 'ky'
import type { FribbAnime } from '../types/provider'

const FRIBB_URL =
  'https://raw.githubusercontent.com/Fribb/anime-lists/refs/heads/master/anime-list-full.json'

export const getSingleFribbAnime = async (
  anilistId: string,
): Promise<FribbAnime | undefined> => {
  try {
    const list = await ky.get(FRIBB_URL).json<FribbAnime[]>()

    const targetId = Number(anilistId)

    return list.find((anime) => anime.anilist_id === targetId)
  } catch (error) {
    console.error('Failed to fetch Fribb anime list:', error)
    return undefined
  }
}

export const getFribbList = async () => {
  try {
    const list = await ky.get(FRIBB_URL).json<FribbAnime[]>()

    return list
  } catch (error) {
    console.error('Failed to fetch Fribb anime list:', error)
    return undefined
  }
}
