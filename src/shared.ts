import { Bot, createBot as createMinecraftBot } from 'mineflayer'
import { SocksClient } from 'socks'
import { parentPort, isMainThread, workerData } from 'worker_threads'
import { AttackOptions } from '../utils/types'
import ProxyAgent from "proxy-agent";
import prismarineChat from "prismarine-chat";
const chatInstance = prismarineChat('1.12')
const { fromNotch } = chatInstance

export function createAttackBot ({ username, host, port, proxy, noFeatures }:
{
  username: string
  host: string
  port: number
  proxy?: {
    host: string
    port: number
  },
  noFeatures: boolean
}): Bot {
  return createMinecraftBot({
    // minimise render distance for less ram usage
    viewDistance: 'tiny',
    username: username,
    host: host,
    port: port,
    agent: (proxy != null) ? new ProxyAgent(`socks://${proxy.host}:${proxy.port}`) : undefined,
    connect: (proxy != null) ? (client) => {
      SocksClient.createConnection({
        proxy: {
          host: proxy.host,
          port: proxy.port,
          type: 5
        },
        command: 'connect',
        destination: {
          host: host,
          port: port
        }
      }).then((info) => {
        client.setSocket(info.socket)
        client.emit('connect')
      }).catch(err => {
        // connection times out
        if (err.toString().includes('ETIMEDOUT') || err.toString().includes('Proxy connection timed out')) log(`[${username}] Proxy timed out`.bgRed)
        // closed socket
        else if (err.toString().includes('Socket closed')) log(`[${username}] Proxy socket closed`.bgRed)
        // reset connection
        else if (err.toString().includes('ECONNRESET')) log(`[${username}] Proxy connection reset`.bgRed)
        // connection refused
        else if (err.toString().includes('ECONNREFUSED') || err.toString().includes('ConnectionRefused')) log(`[${username}] Proxy connection refused`.bgRed)
        // proxy auth failed (if proxy is protected by username:password)
        else if (err.toString().includes('Authentication failed')) log(`[${username}] Proxy authentication failed`.bgRed)
        // not socks5
        else if (err.toString().includes('Received invalid Socks5 initial handshake')) log(`[${username}] Received invalid Socks5 initial handshake`.bgRed)
        // 7b7t issue
        else if (err.toString().includes('HostUnreachable')) log(`[${username}] Host unreachable`.bgRed)
        // I forgot when this happens 💀
        else if (err.toString().includes('Failure')) log(`[${username}] Failure`.bgRed)
        // unknown error
        else console.log(err)
      })
    } : undefined,
    physicsEnabled: !noFeatures,
    loadInternalPlugins: !noFeatures
  })
}

export function kickHandler(reason: string, username: string) {
    const normal = fromNotch(reason).toString()
    try {
      // blacklisted ip
      if (normal.includes('BotSentry') && normal.includes('IP is blacklisted')) log(`[${username}] IP blacklist by BotSentry`.red)
      // antibot mode on
      else if (normal.includes('Bot Attack')) log(`[${username}] BotSentry AntiBot mode is on for ${normal}s`.red) // TODO: Extract time
      // blacklisted for too many online players from single ip
      else if (normal.includes('limit of accounts')) log(`[${username}] IP blacklist for per-IP account limit by BotSentry`.red)
      // first time joining
      else if (normal.includes('dangerous activity')) log(`[${username}] BotSentry is analyzing the connection`.red)
      // something else
      else console.log(normal)
    } catch (err) {
      console.log(err)
      console.log(reason)
      console.log(normal)
    }
}

export async function awaitReady () {
  return await new Promise<void>(resolve => {
    parentPort!.once('message', async message => {
      if (message.ready) resolve()
      else await awaitReady()
    })
  })
}

export function log (text: string) {
  if (isMainThread) {
    console.log(`[${'M0'.green}] [${new Date().toLocaleString()}] ${text}`)
  } else {
    const data: AttackOptions = workerData
    const date = new Date()
    parentPort!.postMessage({
      date: date.getTime(),
      displayDate: date.toLocaleString(),
      id: data.workerNumber,
      log: { message: text }
    })
  }
}

export function shuffle <T> (a: T[]): T[] {
  let j, x, i
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = a[i]
    a[i] = a[j]
    a[j] = x
  }
  return a
}
