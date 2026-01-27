import cors from '@elysiajs/cors'
import Elysia from 'elysia'

new Elysia()
  .use(cors())
  .get('/', () => ({
    message: 'Elo! Fuck you<3',
  }))
  .listen(3000)
