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

export const SEASON_QUERY = `
query($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int, $sort: [MediaSort], $isAdult: Boolean = false) {
  Page(page: $page, perPage: $perPage) {
    media(season: $season, seasonYear: $seasonYear, sort: $sort, isAdult: $isAdult, type: ANIME) {
      id
    }
  }
}
`

export const RECENTLY_AIRED_QUERY = `
query($page: Int, $perPage: Int, $sort: [MediaSort], $statusIn: [MediaStatus], $isAdult: Boolean = false) {
  Page(page: $page, perPage: $perPage) {
    media(status_in: $statusIn, sort: $sort, isAdult: $isAdult, type: ANIME) {
      id
    }
  }
}
`

interface PaginationParams {
  limit?: number
  offset?: number
}

// Helper function to calculate current season and year
const getCurrentSeason = (): {
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'
  year: number
} => {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()

  if (month >= 1 && month <= 3) return { season: 'WINTER', year }
  if (month >= 4 && month <= 6) return { season: 'SPRING', year }
  if (month >= 7 && month <= 9) return { season: 'SUMMER', year }
  return { season: 'FALL', year }
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

export const getRecentlyAired = async ({
  limit = 50,
  offset = 0,
}: PaginationParams = {}) => {
  try {
    const page = Math.floor(offset / limit) + 1
    const perPage = limit

    const res = await ky
      .post('https://graphql.anilist.co', {
        json: {
          query: RECENTLY_AIRED_QUERY,
          variables: {
            page,
            perPage,
            statusIn: ['RELEASING', 'FINISHED'],
            sort: ['END_DATE_DESC', 'POPULARITY_DESC'],
          },
        },
      })
      .json<{ data: { Page: { media: { id: number }[] } } }>()

    return res.data.Page.media.map((grr) => grr.id)
  } catch (_error) {
    return []
  }
}

export const getPopularMovies = async ({
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
            type: 'MOVIE',
            sort: ['POPULARITY_DESC', 'SCORE_DESC'],
          },
        },
      })
      .json<{ data: { Page: { media: { id: number }[] } } }>()

    return res.data.Page.media.map((grr) => grr.id)
  } catch (_error) {
    return []
  }
}

export const getPopularThisSeason = async ({
  limit = 50,
  offset = 0,
}: PaginationParams = {}) => {
  try {
    const page = Math.floor(offset / limit) + 1
    const perPage = limit
    const { season, year } = getCurrentSeason()

    const res = await ky
      .post('https://graphql.anilist.co', {
        json: {
          query: SEASON_QUERY,
          variables: {
            page,
            perPage,
            season,
            seasonYear: year,
            sort: ['POPULARITY_DESC', 'SCORE_DESC'],
          },
        },
      })
      .json<{ data: { Page: { media: { id: number }[] } } }>()

    return res.data.Page.media.map((grr) => grr.id)
  } catch (_error) {
    return []
  }
}

export const getUpcomingAnime = async ({
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
            type: 'ANIME',
            sort: ['START_DATE_ASC', 'POPULARITY_DESC'],
          },
        },
      })
      .json<{ data: { Page: { media: { id: number }[] } } }>()

    return res.data.Page.media.map((grr) => grr.id)
  } catch (_error) {
    return []
  }
}
