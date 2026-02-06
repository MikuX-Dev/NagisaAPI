import ky from 'ky'

export const SPOT_QUERY = `
query($page: Int, $perPage: Int, $sort: [MediaSort], $type: MediaType, $isAdult: Boolean = false) {
  Page(page: $page, perPage: $perPage) {
    media(sort: $sort, isAdult: $isAdult, type: $type) {
      id
    }
  }
}
`

interface PaginationParams {
  limit?: number
  offset?: number
}

export const getTrending = async ({
  limit = 50,
  offset = 0,
}: PaginationParams = {}) => {
  try {
    // Convert offset/limit to page/perPage
    const page = Math.floor(offset / limit) + 1
    const perPage = limit

    const res = await ky
      .post('https://graphql.anilist.co', {
        json: {
          query: SPOT_QUERY,
          variables: {
            page,
            perPage,
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

export const getPopular = async ({
  limit = 50,
  offset = 0,
}: PaginationParams = {}) => {
  try {
    const page = Math.floor(offset / limit) + 1
    const perPage = limit

    const res = await ky
      .post('https://graphql.anilist.co', {
        json: {
          query: SPOT_QUERY,
          variables: {
            page,
            perPage,
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

export const getBestScore = async ({
  limit = 50,
  offset = 0,
}: PaginationParams = {}) => {
  try {
    const page = Math.floor(offset / limit) + 1
    const perPage = limit

    const res = await ky
      .post('https://graphql.anilist.co', {
        json: {
          query: SPOT_QUERY,
          variables: {
            page,
            perPage,
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
