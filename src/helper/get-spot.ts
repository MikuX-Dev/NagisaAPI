import ky from 'ky'
import { getAnimeFromAnilistIds } from '../database/functions'

export const SPOT_QUERY = `
query($perPage: Int, $sort: [MediaSort]) {
  Page(perPage: $perPage) {
    media(sort: $sort) {
      id
    }
  }
}
`

export const getTrending = async () => {
  try {
    const res = await ky
      .post('https://graphql.anilist.co', {
        json: {
          query: SPOT_QUERY,
          variables: {
            perPage: 50,
            sort: ['TRENDING_DESC', 'POPULARITY_DESC'],
          },
        },
      })
      .json<{ data: { Page: { media: { id: number }[] } } }>()

    return res.data.Page.media.map((grr) => grr.id)
  } catch (error) {
    return []
  }
}

export const getPopular = async () => {
  try {
    const res = await ky
      .post('https://graphql.anilist.co', {
        json: {
          query: SPOT_QUERY,
          variables: {
            perPage: 50,
            sort: ['POPULARITY_DESC'],
          },
        },
      })
      .json<{ data: { Page: { media: { id: number }[] } } }>()

    return res.data.Page.media.map((grr) => grr.id)
  } catch (error) {
    return []
  }
}

export const getBestScore = async () => {
  try {
    const res = await ky
      .post('https://graphql.anilist.co', {
        json: {
          query: SPOT_QUERY,
          variables: {
            perPage: 50,
            sort: ['SCORE_DESC', 'POPULARITY_DESC'],
          },
        },
      })
      .json<{ data: { Page: { media: { id: number }[] } } }>()

    return res.data.Page.media.map((grr) => grr.id)
  } catch (error) {
    return []
  }
}
