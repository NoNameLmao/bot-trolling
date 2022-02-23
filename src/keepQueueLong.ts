import 'colors'
import {Worker} from 'worker_threads'
import os from 'os'
import {log, shuffle} from './shared'
import {QueueLongProcessArgs} from "./queue/types";
import {host, port} from '../config.json'

const amount = {
  workers: 2,
  bots: 2
}

const file = './src/queue/workerRewrite.ts'
const useProxy = false
const useTimeout = false

const highPriority = false

log('Starting...'.green)
log(`Amount of workers: ${amount.workers}`.green)
log('Importing usernames...'.green)
const bots: { username: string }[] = require('../bots.json')

log(`Amount of usernames: ${bots.length}, will use ${amount.bots * amount.workers} of them`.green)
log('Shuffling bots array...'.green)
shuffle(bots)

log('Changing the process priority...'.green)
os.setPriority(highPriority ? -10 : 19)

log('Starting worker spawning loop...'.green)
const wtArray: Worker[] = []
for (let i = 0; i < amount.workers; i++) {
  const nicknames: string[] = []
  let nickname: string
  for (let j = 0; j < amount.bots; j++) {
    if (j === 0) nickname = bots[0].username
    else {
      bots.shift()
      shuffle(bots)
      nickname = bots[0].username
    }
    nicknames.push(nickname)
    log(`Username ${nickname} ready`.green)
  }

  const workerData: QueueLongProcessArgs = {
    useProxy: useProxy,
    useTimeout: useTimeout,
    botNumber: i,
    usernames: nicknames,
    host,
    port
  }

  const worker = new Worker(file, {argv: [JSON.stringify(workerData), i]})
  wtArray.push(worker)
  log(`Summoned worker number ${i + 1}... (${amount.workers - i - 1} left)`.green)
  worker.on('message', message => {
    const delay = (new Date().getTime() - message.date) / 1000

    let delayString: string
    if (delay > 1 && delay < 5) delayString = `${delay}s ago`.yellow
    else if (delay > 5) delayString = `${delay}s ago`.red
    else if (delay === 0.000) delayString = `${delay}s ago`.bgGreen
    else delayString = `${delay}s ago`.green

    if (message.log) {
      console.log(`[${`W${message.id}`.yellow}] [${message.displayDate} (${delayString})] ${message.log.message}`)
    }
  })
}

wtArray.forEach(worker => worker.postMessage({ready: true}))
