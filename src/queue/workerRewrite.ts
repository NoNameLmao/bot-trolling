import { parentPort, workerData } from 'worker_threads'
import { QueueLongProcessArgs } from './types'
import 'colors'
import { getRandomArbitrary, sleep } from 'emberutils'
import { Client, createClient } from 'minecraft-protocol'
import { SocksClient } from 'socks'
import { log, shuffle } from '../shared'

const queueRegex = /(?<=Position in queue: )\d+/gm
const spaceRegex = /\s{2,}/gm

const workerOptions: QueueLongProcessArgs = workerData

async function awaitReady () {
  return await new Promise<void>(resolve => {
    parentPort!.once('message', async message => {
      if (message.ready) resolve()
      else await awaitReady()
    })
  })
}

async function main () {
  await awaitReady()

  const usernames = workerOptions.usernames
  log(usernames.toString())

  shuffle(usernames)

  let i = 0
  for (const username of usernames) {
    async function createBot (): Promise<Client> {
      if (workerData.useTimeout) {
        const timeout = getRandomArbitrary(5000, 200000)
        log(`[${username}] Waiting for ${timeout / 1000}s before logging in...`)
        await sleep(timeout)
      }

      if (workerData.useProxy) {
        return createClient({
          username: username,
          host: workerData.host,
          port: workerData.port,
          version: '1.12.2',
          connect: (client) => {
            SocksClient.createConnection({
              proxy: {
                host: '94.231.144.114',
                port: 1080,
                type: 5
              },
              command: 'connect',
              destination: {
                host: workerData.host,
                port: workerData.port
              }
            }).then((info) => {
              client.setSocket(info.socket)
              client.emit('connect')
            }).catch((err) => {
              if (err.toString().includes('ETIMEDOUT')) {
                log(`[${username}] Proxy timed out`.red)
              } else if (err.toString().includes('Socket closed')) {
                log(`[${username}] Proxy socket closed`.red)
              } else console.log(err)
            })
          }
        })
      } else {
        return createClient({
          username: username,
          host: workerData.host,
          port: workerData.port,
          version: '1.12.2'
        })
      }
    }

    i++
    log(`[${i}/${usernames.length}] Creating bot ${username}... (${usernames.length - i} left)`.green)

    let bot = await createBot()

    function botLoginHandler () {
      log(`[${username}] Logged in`.green)
      bot.on('chat', async function messageHandler (message: string) {
        if (message === '' || message === ' ' || message === '\u200b' || !message || spaceRegex.test(message)) return
        log(`[${username}] ${message}`.yellow)
        if (message.includes('7b7t')) {
          log(`[${username}] Reached the end of the queue, ending the connection and reconnecting...`.green)
          bot.end()
          bot = await createBot()
          bot.once('login', () => {
            bot.removeAllListeners('messagestr')
            botLoginHandler()
          })
        } else bot.once('messagestr', messageHandler)
      })
      bot.once('kicked', reason => {
        reason = JSON.parse(reason).text.toString()
        log(`[${username}] ${reason.red}`.yellow + ', recreating the bot...')
        log(`[${username}] Recreating the bot...`.green)
        bot.end()
        createBot()
        bot.once('login', () => {
          bot.removeAllListeners()
          botLoginHandler()
        })
      })
    }

    bot.once('login', botLoginHandler)
    bot.once('kicked', reason => {
      const jsonReason = JSON.parse(reason)
      try {
        if (jsonReason.extra[0].extra[1].text.includes('BotSentry') && jsonReason.extra[0].extra[5].text.includes('IP is blacklisted')) {
          log(`[${username}] IP blacklist by BotSentry`.red)
        } else if (jsonReason.extra[0].extra[3].text.includes('Bot Attack')) {
          log(`[${username}] BotSentry AntiBot mode is on for ${jsonReason.extra[0].extra[7]}s`.red)
        } else if (jsonReason.extra[0].extra[3].text.includes('limit of accounts')) {
          log(`[${username}] IP blacklist for per-IP account limit by BotSentry`.red)
        } else if (jsonReason.extra[0].extra[5].text.includes('dangerous activity')) {
          log(`[${username}] BotSentry is analyzing the connection`.red)
        } else {
          console.log(jsonReason.extra[0])
        }
      } catch (err: any) {
        log(err)
        log(reason)
        log(jsonReason)
      }
    })
  }
}

main().catch(error => {
  log(error)
})
