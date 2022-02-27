import 'colors'
import { Worker } from 'worker_threads'
import os from 'os'
import { log, shuffle } from './shared'
import { ProxyType, AttackOptions, ProxySource, BotConfig } from '../utils/types'
import { host, port } from '../config.json'
import * as ProxyScrapeAPI from '../utils/proxy-scrape'
import fs from 'fs'
import { sleep } from 'emberutils'

const amount = {
  workers: 40,
  bots: 100
}

const moduleFile = './src/register/worker.ts'
const useProxy = true
const proxySource: ProxySource = 'proxyscrape'
const useTimeout = true

const highPriority = false

log('Starting...'.green)
log(`Amount of workers: ${amount.workers}`.green)
log('Importing usernames...'.green)
const bots: BotConfig[] = require('../bots.json')

log('Importing spam messages...')
const spamMessages: string[] = require('../messages.json')

log(`Amount of usernames: ${bots.length}, will use ${amount.bots * amount.workers} of them`.green)
log('Shuffling bots array...'.green)
shuffle(bots)

log('Changing the process priority...'.green)
os.setPriority(highPriority ? -10 : 19)

log('Asyncing program...'.green)
void main()

async function main () {
  let messagesQueued: any[] = []

  setInterval(() => {
    if (messagesQueued.length > 0) {
      for (const message of messagesQueued) {
        logTimedOfWorker(message)
        messagesQueued = []
      }
    }
  }, 0.5 * 1000)

  const proxies: ProxyType[] = []
  if (useProxy) {
    log('Collecting proxies...'.green)
    switch (proxySource) {
      case 'txt':
        fs.readFileSync('./proxies.txt').toString().split('\n').forEach(proxy => {
          if (proxy.length > 0) {
            const split = proxy.split(':')
            proxies.push({
              host: split[0],
              port: parseInt(split[1])
            })
          }
        })
        break
      case 'proxyscrape':
        const temp = await ProxyScrapeAPI.getProxies({ protocol: 'socks5', anonymity: 'elite' })
        for (const proxy of temp) {
          const slice = proxy.split(':')
          proxies.push({
            host: slice[0],
            port: parseInt(slice[1])
          })
        }
        break
      default:
        throw new Error('Invalid proxy type')
    }

    shuffle(proxies)
    log(`Amount of proxies: ${proxies.length}`.green)
  }

  log('Starting worker spawning loop...'.green)
  const workerArray: Worker[] = []
  for (let i = 0; i < amount.workers; i++) {
    const nicknames: string[] = []
    for (let j = 0; j < amount.bots; j++) {
      bots.shift()
      const nickname = bots[0].username
      nicknames.push(nickname)
      log(`Username ${nickname} ready`.green)
    }

    const workerData: AttackOptions = {
      proxies: proxies,
      useTimeout: useTimeout,
      workerNumber: i,
      usernames: nicknames,
      host,
      port
    }

    const worker = new Worker(moduleFile, {
      workerData: workerData
    })

    worker.on('error', error => {
      console.log(error)
    })
    worker.on('exit', (code) => {
      if (code !== 0) { console.log(`Worker stopped with exit code ${code}`.red) }
    })

    workerArray.push(worker)

    log(`Summoned worker number ${i + 1}... (${amount.workers - i - 1} left)`.green)
    worker.on('message', message => {
      if (message.channel !== 'log') return

      if (message.log) {
        logTimedOfWorker(message)
      }
    })

    worker.on('message', message => {
      if (message.channel !== 'chat') return

      if (message.log) {
        if (!messagesQueued.map(message => message.log.message).includes(message.log.message)) { messagesQueued.push(message) }
      }
    })

    worker.on('message', message => {
      if (message.channel !== 'register') return

      log(message.password)
    })
  }

  for (const worker in workerArray) {
    log(`Worker ${worker} is readying with ${amount.bots} bots`.magenta)
    workerArray[worker].postMessage({ channel: 'ready' })
    await sleep(4 * 1000)
  }

  setInterval(() => {
    const spamMessage = spamMessages[Math.floor(Math.random() * spamMessages.length)]
    log(`Sending spam message to all workers ("${spamMessage}")`.yellow)
    for (const worker in workerArray) {
      workerArray[worker].postMessage({ channel: 'say', message: spamMessage })
    }
  }, 5 * 1000)
}

function logTimedOfWorker (message: any) {
  console.log(`[${`W${message.id}`.yellow}] [${message.displayDate} (${formatTime(message)})] ${message.log.message}`)
}

function formatTime (message: any): string {
  const delay = (new Date().getTime() - message.date) / 1000

  if (delay > 1 && delay < 5) return `${delay}s ago`.yellow
  else if (delay > 5) return `${delay}s ago`.red
  else if (delay === 0.000) return `${delay}s ago`.green
  else return `${delay}s ago`.green
}
