import Elysia from 'elysia'
import { animeRoutes } from './anime.routes'

export const apiRoutes = new Elysia({ prefix: '/api' }).use(animeRoutes)
