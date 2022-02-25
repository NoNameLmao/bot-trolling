/*
   This bot registers accounts and puts them into the database.
 */
import { parentPort, workerData as anyWorkerData } from 'worker_threads'
import { AttackOptions } from '../../utils/types'
import 'colors'
import { getRandomArbitrary, sleep } from 'emberutils'
import { Client, createClient } from 'minecraft-protocol'
import { SocksClient as socks } from 'socks'
import { awaitReady, chat, generatePassword, kickHandler, log, randomOf, shuffle } from '../shared'
import prismarineChat from 'prismarine-chat'
import ProxyAgent from 'proxy-agent'

const chatInstance = prismarineChat('1.12')
const { fromNotch } = chatInstance

// const queueRegex = /(?<=Position in queue: )\d+/gm
const spaceRegex = /\s{2,}/gm

const workerOptions: AttackOptions = anyWorkerData

async function main () {
  await awaitReady()

  const usernames = workerOptions.usernames

  shuffle(usernames)
  if (workerOptions.proxies != null) { shuffle(workerOptions.proxies) }

  const useProxies: boolean = !(workerOptions.proxies == null)

  let i = 0
  for (const username of usernames) {
    const proxy = useProxies ? randomOf(workerOptions.proxies!) : null
    log((proxy != null) ? `Using proxy ${proxy}` : 'Not using proxy')

    async function createBot (): Promise<Client> {
      if (workerOptions.useTimeout) {
        const timeout = getRandomArbitrary(500, 5000)
        log(`[${username}] Waiting for ${timeout / 1000}s before logging in...`)
        await sleep(timeout)
        log(`[${username}] Waiting done...`)
      }

      if (useProxies && (proxy == null)) { throw new Error('Proxy not found') }

      return createClient({
        username: username,
        host: workerOptions.host,
        port: workerOptions.port,
        version: '1.12.2',
        agent: useProxies ? new ProxyAgent(`socks://${proxy!.host}:${proxy!.port}`) : undefined,
        hideErrors: true,
        connect: useProxies
          ? (client) => {
              socks.createConnection({
                proxy: {
                  host: proxy!.host,
                  port: proxy!.port,
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

    log(`[${i + 1}/${usernames.length}] Creating bot ${username}... (${usernames.length - i - 1} left)`.green)
    let bot = await createBot()
    const password = generatePassword()
    registerListeners()

    function registerListeners () {
      bot.once('login', botLoginHandler)
      bot.once('disconnect', packet => kickHandler(packet.reason, username))
    }

    function botLoginHandler () {
      log(`[${username}] Logged in`.green)
      bot.on('chat', async packet => {
        const object = fromNotch(packet.message)
        const message = object.toString()

        if (message === '' || message === ' ' || message === '\u200b' || !message || spaceRegex.test(message)) return

        chat(username, message)
        if (message.startsWith('[8b8t] Please register to play 7b7t /register <password>')) {
          bot.write('chat', { message: `/register ${password}` })
        }

        if (message.startsWith('Successfully registered!')) {
          log(`[${username}] Registered!`.green)
          parentPort!.postMessage({
            channel: 'register',
            username,
            password
          })
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
