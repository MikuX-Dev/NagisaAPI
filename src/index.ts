import cors from '@elysiajs/cors'
import chalk from 'chalk'
import Elysia from 'elysia'

const pastelPink = chalk.hex('#ffb7c5')
const pastelBlue = chalk.hex('#b5e8ff')
const pastelPurple = chalk.hex('#d7b5ff')
const pastelGray = chalk.hex('#e0e0e0')

const PORT = 3000
const HOST = 'localhost'

new Elysia()
  .use(cors())
  .get('/', () => ({
    message: 'Elo! Fuck uu<3 uwu',
  }))
  .listen(PORT)

console.log(
  pastelGray('─'.repeat(40)) + '\n' +
  pastelPink('♡ Server started successfully~ ♡\n') +
  pastelBlue(`→ Host : ${HOST}\n`) +
  pastelPurple(`→ Name  : Nagisa API\n`) +
  pastelBlue(`→ Full : http://${HOST}:${PORT}/\n`) +
  pastelGray('─'.repeat(40))
)
