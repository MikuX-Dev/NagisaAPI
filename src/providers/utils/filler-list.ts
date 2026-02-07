import ky from 'ky'

export const getFillerList = async () => {
  const res = await ky
    .get(
      'https://raw.githubusercontent.com/ThaUnknown/filler-scrape/refs/heads/main/filler-readable.json',
    )
    .json<Record<string, number[]>>()

  return res
}

export const getAnimeFiller = async (anilistId: string) => {
  const list = await getFillerList()
  const fillers = list[anilistId.toString()]

  return fillers ?? []
}
