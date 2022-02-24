import 'colors'
import { Worker } from 'worker_threads'
import os from 'os'
import { log, shuffle } from './shared'
import {ProxyType, AttackOptions, ProxySource} from '../utils/types'
import { host, port } from '../config.json'
import { ProxyScrapeAPI } from '../utils/proxy-scrape'
import fs from 'fs'
import ProxyAgent from "proxy-agent";

const amount = {
  workers: 2,
  bots: 5
}

const moduleFile = './src/queue/worker.ts'
const useProxy = true
const proxySource: ProxySource = 'txt'
const useTimeout = false

const highPriority = false

log('Starting...'.green)
log(`Amount of workers: ${amount.workers}`.green)
log('Importing usernames...'.green)
const bots: Array<{ username: string }> = require('../bots.json')

log(`Amount of usernames: ${bots.length}, will use ${amount.bots * amount.workers} of them`.green)
log('Shuffling bots array...'.green)
shuffle(bots)

log('Changing the process priority...'.green)
os.setPriority(highPriority ? -10 : 19)

log('Asyncing program...'.green)
main()

async function main () {
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
        const temp = await ProxyScrapeAPI.getProxies({ proxytype: 'socks5' })
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
    log(JSON.stringify(proxies))

    if (proxies.length < (amount.bots * amount.workers)) {
      log('Not enough proxies, exiting...'.red)
      log(`Required: ${amount.bots * amount.workers} Actual: ${proxies.length}`.red)
      process.exit(1)
    }
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
      if (code !== 0) { console.log(new Error(`Worker stopped with exit code ${code}`)) }
    })

    workerArray.push(worker)

    log(`Summoned worker number ${i + 1}... (${amount.workers - i - 1} left)`.green)
    worker.on('message', message => {
      const delay = (new Date().getTime() - message.date) / 1000

      let delayString: string
      if (delay > 1 && delay < 5) delayString = `${delay}s ago`.yellow
      else if (delay > 5) delayString = `${delay}s ago`.red
      else if (delay === 0.000) delayString = `${delay}s ago`.green
      else delayString = `${delay}s ago`.green

      if (message.log) {
        console.log(`[${`W${message.id}`.yellow}] [${message.displayDate} (${delayString})] ${message.log.message}`)
      }
    })
  }

  workerArray.forEach(worker => worker.postMessage({ ready: true }))
}
