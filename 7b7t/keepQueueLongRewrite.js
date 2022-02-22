const wt = require('worker_threads');
const { createClient } = require('minecraft-protocol');
const { fromNotch } = require('prismarine-chat')('1.12.2');
const os = require('os');
const { SocksClient } = require('socks');
const { sleep, getRandomArbitrary } = require('emberutils');
require('colors');

(async() => {
        function log(text) {
            if (wt.isMainThread) {
                console.log(`[${'M0'.green}] [${new Date().toLocaleString()}] ${text}`);
            } else {
                wt.parentPort.postMessage({
                    date: new Date().getTime(),
                    displayDate: new Date().toLocaleString(),
                    id: process.argv[3],
                    log: {
                        message: text,
                    },
                });
            }
        }
        const amount = {
            workers: 10,
            bots: 5,
        };
        const useProxy = false;
        const useTimeout = false;

        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const
                    j = Math.floor(Math.random() * (i + 1)),
                    temp = array[i];

                array[i] = array[j];
                array[j] = temp;
            }
        }

        if (wt.isMainThread) {
            log('Starting...'.green);
            log(`Amount of workers: ${amount.workers}`.green);
            log('Importing usernames...'.green);
            const bots = require('../bots.json');
            log(`Amount of usernames: ${bots.length}, will use ${amount.bots * amount.workers} of them`.green);
            log('Shuffling bots array...'.green);
            shuffleArray(bots);
            log('Decreasing the process priority...'.green);
            os.setPriority(19);
            log('Starting worker spawning loop...'.green);
            const array = [];
            const wtArray = [];
            for (let i = 0; i < amount.workers; i++) {
                let nickname;
                for (let j = 0; j < amount.bots; j++) {
                    if (j === 0) nickname = bots[0].username;
                    else {
                        bots.shift();
                        shuffleArray(bots);
                        nickname = bots[0].username;
                    }
                    array.push(nickname);
                    log(`Username ${nickname} ready`.green);
                }
                const worker = new wt.Worker(__filename, { argv: [array, i] });
                wtArray.push(worker);
                log(`Summoned worker number ${i + 1}... (${amount.workers - i - 1} left)`.green);
                worker.on('message', message => { // jshint ignore:line
                            const delay = parseInt(((new Date().getTime() - message.date) / 1000));
                            let delayString = delay;
                            if (delay > 1 && delay < 5) delayString = `${delay}s ago`.yellow;
                            else if (delay > 5) delayString = `${delay}s ago`.red;
                            else if (delay === 0.000) delayString = `${delay}s ago`.bgGreen;
                            else delayString = `${delay}s ago`.green;
                            if (message.log) {
                                console.log(`[${`W${message.id}`.yellow}] [${message.displayDate} (${delayString})] ${message.log.message}`);
                }
            });
        }
        wtArray.forEach(worker => worker.postMessage({ ready: true }));
    } else {
        (async () => {
            function awaitReady() {
                return new Promise(resolve => {
                    wt.parentPort.once('message', async message => {
                        if (message.ready) resolve();
                        else await awaitReady();
                    });
                });
            }
            await awaitReady();
            let i = 0;
            const
                queueRegex = /(?<=Position in queue: )\d+/gm,
                spaceRegex = /\s{2,}/gm,
                array = process.argv[2].split(','),
                { host, port } = require('../servers/servers.json')['7b7t']
            ;
            shuffleArray(array);
            let bot;
            for (const username of array) {
                async function createBot() {
                    if (useTimeout) {
                        const timeout = getRandomArbitrary(5000, 200000);
                        log(`[${username}] Waiting for ${timeout / 1000}s before logging in...`);
                        await sleep(timeout);
                    }
                    if (useProxy) bot = createClient({
                        username,
                        host: host,
                        port: port,
                        version: '1.12.2',
                        connect: (client) => {
                            SocksClient.createConnection({
                                proxy: {
                                    host: '94.231.144.114',
                                    port: 1080,
                                    type: 5,
                                },
                                command: 'connect',
                                destination: {
                                    host: host,
                                    port: port,
                                },
                            }, (err, info) => {
                                if (err) {
                                    if (err.toString().includes('ETIMEDOUT')) {
                                        log(`[${username}] Proxy timed out`.red);
                                    } else if (err.toString().includes('Socket closed')) {
                                        log(`[${username}] Proxy socket closed`.red);
                                    } else console.log(err);
                                    return;
                                }
                                client.setSocket(info.socket);
                                client.emit('connect');
                            });
                        }
                    });
                    else if (!useProxy) bot = createClient({
                        username,
                        host,
                        port,
                        version: '1.12.2'
                    });
                }
                i++;
                log(`[${i}/${array.length}] Creating bot ${username}... (${array.length - i} left)`.green);
                await createBot();
                function botThing() {
                    log(`[${username}] Logged in`.green);
                    bot.on('chat', async function botThing2(packet) {
                        if (message === '' || message === ' ' || message === '\u200b' || !message || spaceRegex.test(message)) return;
                        log(`[${username}] ${message}`.yellow);
                        if (message.includes('7b7t')) {
                            log(`[${username}] Reached the end of the queue, ending the connection and reconnecting...`.green);
                            bot.end();
                            await createBot();
                            bot.once('login', () => {
                                bot.removeAllListeners('messagestr');
                                botThing();
                            });
                        } else bot.once('messagestr', botThing2);
                    });
                    bot.once('kicked', reason => {
                        reason = JSON.parse(reason).text.toString();
                        log(`[${username}] ${reason.red}`.yellow + ', recreating the bot...');
                        log(`[${username}] Recreating the bot...`.green);
                        bot.end();
                        createBot();
                        bot.once('login', () => {
                            bot.removeAllListeners();
                            botThing();
                        });
                    });
                }
                bot.once('login', botThing);
                bot.once('kicked', reason => {
                    const jsonReason = JSON.parse(reason);
                    try {
                        if (jsonReason.extra[0].extra[1].text.includes('BotSentry') && jsonReason.extra[0].extra[5].text.includes('IP is blacklisted')) {
                            log(`[${username}] IP blacklist by BotSentry`.red);
                        } else if (jsonReason.extra[0].extra[3].text.includes('Bot Attack')) {
                            log(`[${username}] BotSentry AntiBot mode is on for ${jsonReason.extra[0].extra[7]}s`.red);
                        } else if (jsonReason.extra[0].extra[3].text.includes('limit of accounts')) {
                            log(`[${username}] IP blacklist for per-IP account limit by BotSentry`.red);
                        } else if (jsonReason.extra[0].extra[5].text.includes('dangerous activity')) {
                            log(`[${username}] BotSentry is analyzing the connection`.red);
                        } else {
                            console.log(jsonReason.extra[0]);
                        }
                    } catch (err) {
                        console.log(err);
                        console.log(reason);
                        console.log(jsonReason);
                    }
                });
            }
        })();
    }
})();