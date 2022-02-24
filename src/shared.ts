import { Bot, createBot as createMinecraftBot } from 'mineflayer'
import { SocksClient } from 'socks'
import { parentPort, isMainThread } from 'worker_threads'

export function createAttackBot ({ username, host, port, proxy }:
{
  username: string
  host: string
  port: number
  proxy?: {
    proxyHost: string
    proxyPort: number
  }
}): Bot {
  return createMinecraftBot({
    // minimise render distance for less ram usage
    viewDistance: 'tiny',
    username: username,
    host: host,
    port: port,
    plugins: {
      conversions: false,
      furnace: false,
      math: false,
      painting: false,
      scoreboard: false,
      villager: false,
      bed: false,
      book: false,
      boss_bar: false,
      chest: false,
      command_block: false,
      craft: false,
      digging: false,
      dispenser: false,
      enchantment_table: false,
      experience: false,
      rain: false,
      ray_trace: false,
      sound: false,
      tablist: false,
      time: false,
      title: false,
      physics: false,
      blocks: false
    },
    // disable physics
    physicsEnabled: false,
    connect: (proxy != null) ? (client) => {
      SocksClient.createConnection({
        proxy: {
          host: proxy.proxyHost,
          port: proxy.proxyPort,
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
    loadInternalPlugins: false
  })
}

export function log (text: string) {
  if (isMainThread) {
    console.log(`[${'M0'.green}] [${new Date().toLocaleString()}] ${text}`)
  } else {
    parentPort!.postMessage({
      date: new Date().getTime(),
      displayDate: new Date().toLocaleString(),
      id: process.argv[3], // TODO
      log: { message: text }
    })
  }
}

export function shuffle (a: any[]) {
  let j, x, i
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = a[i]
    a[i] = a[j]
    a[j] = x
  }
  return a
}
