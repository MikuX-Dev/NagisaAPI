import Elysia from 'elysia'
import { animeRoutes } from './anime.routes'
import { searchRoutes } from './search.routes'
import { trendingRoutes } from './trending.routes'

export const apiRoutes = new Elysia({ prefix: '/api' })
  .use(animeRoutes)
  .use(searchRoutes)
  .use(trendingRoutes)
