import { parentPort, workerData } from 'worker_threads'
import { getRandomArbitrary, shuffleArray, sleep } from 'emberutils'
import { Bot } from 'mineflayer'
import { createAttackBot, log } from '../shared'
import { QueueLongProcessArgs } from './types'
import 'colors'

(async () => {
  // function to wait until all workers are ready and main thread sends the message to start
  async function awaitReady () {
    return await new Promise<void>(resolve => {
      parentPort!.once('message', async message => {
        // if message object's ready property is "true", resolve
        if (message.ready) resolve()
        // otherwise, keep waiting
        else await awaitReady()
      })
    })
  }

  await awaitReady()

  let proxyI = 0
  const spaceRegex = /\s{2,}/gm
  const queueOptions: QueueLongProcessArgs = workerData
  const usernames = queueOptions.usernames
  let i = queueOptions.workerNumber
  shuffleArray(usernames)

  const proxyArray = shuffleArray(process.argv[4].split(','))
  for (const username of usernames) {
    proxyI++

    async function createBot (): Promise<Bot> {
      // join with random delay
      if (queueOptions.useTimeout) {
        // random time in range from 5s to 200s
        const timeout = getRandomArbitrary(5000, 200000)
        log(`[${username}] Waiting for ${timeout / 1000}s before logging in...`)
        // Don't continue until timeout ends
        await sleep(timeout)
      }

      return createAttackBot({
        username: username,
        host: queueOptions.host,
        port: queueOptions.port,
        proxy: queueOptions.useProxy
          ? {
              proxyHost: proxyArray[proxyI].split(':')[0],
              proxyPort: parseInt(proxyArray[proxyI].split(':')[1])
            }
          : undefined
      })
    }

    i++
    log(`[${i}/${usernames.length}] Creating bot ${username}... (${usernames.length - i} left)`.green)
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
