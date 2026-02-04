import ky from 'ky'

export const SPOT_QUERY = `
query($perPage: Int, $sort: [MediaSort], $type: MediaType, $isAdult: Boolean = false) {
  Page(perPage: $perPage) {
    media(sort: $sort, isAdult: $isAdult, type: $type) {
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
            type: 'ANIME',
            sort: ['TRENDING_DESC', 'POPULARITY_DESC'],
          },
        },
      })
      .json<{ data: { Page: { media: { id: number }[] } } }>()

    return res.data.Page.media.map((grr) => grr.id)
  } catch (_error) {
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
  } catch (_error) {
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
  } catch (_error) {
    return []
  }
}
