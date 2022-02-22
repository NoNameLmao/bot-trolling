import 'colors'
import { Bot, createBot } from 'mineflayer'

let bot: Bot
process.on('uncaughtException', exception => {
    if (exception.message.includes('ECONNRESET')) {
        log('ECONNRESET'.red)
        // end connection properly
        bot.end()
        // attempt to fix memory leaks
        bot.removeAllListeners()
        bot = undefined
        // reconnect
        troll()
    }
})
log('Started'.green)
troll()

function troll() {
    log('[Bot] Logging in...'.yellow)
    // create the bot
    bot = createBot({
        host: '8b8t.me',
        username: 'BobTheBuilder229'
    })
    // parse kick reason if kicked
    bot.once('kicked', async reason => {
        if (reason.includes('You are already connected to this proxy!')) {
            // player is online
            log('[Bot] Kicked - target is online.'.red)
            bot.end()
            bot.removeAllListeners()
            bot = undefined
            troll()
        } else if (reason.includes('You took to long to login or register')) {
            // auth timeout
            log('[Bot] Kicked - authentication timeout.'.red)
            bot.end()
            bot.removeAllListeners()
            bot = undefined
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
function log(text: string) {
    // fancy logging
    console.log(`[${new Date().toISOString()}] ${text}`)
}
