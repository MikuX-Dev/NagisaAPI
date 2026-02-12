import Elysia from 'elysia'

import { animeRoutes } from './anime.routes'
import { picksRoutes } from './picks.routes'
import { searchRoutes } from './search.routes'
import { utilsRoutes } from './utils.routes'

export const apiRoutes = new Elysia({ prefix: '/api' })
  .use(animeRoutes)
  .use(searchRoutes)
  .use(picksRoutes)
  .use(utilsRoutes)
