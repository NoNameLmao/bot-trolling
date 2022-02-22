const wt = require('worker_threads'),
    { createBot } = require('mineflayer'),
    os = require('os'),
    { SocksClient } = require('socks'),
    { sleep, getRandomArbitrary, shuffleArray } = require('emberutils'),
    proxylist = require('proxylist'),
    lightscrape = require('lightscrape'),
    ProxyScraper = require('simple-proxy-scraper');
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
            bots: 10,
        };
        const useProxy = true;
        const useTimeout = false;

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
            const proxies = shuffleArray(await ProxyScraper.ProxyScrape.getProxies({ proxytype: 'socks5' }));
            let proxyI = 0;
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
                proxyI++;
                const worker = new wt.Worker(__filename, { argv: [array, i, proxies] });
                wtArray.push(worker);
                log(`Summoned worker number ${i + 1}... (${amount.workers - i - 1} left)`.green);
                worker.on('message', message => {
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
            let proxyI = 0;
            const
                queueRegex = /(?<=Position in queue: )\d+/gm,
                spaceRegex = /\s{2,}/gm,
                array = process.argv[2].split(','),
                { host, port } = require('../servers/servers.json')['7b7t']
            ;
            shuffleArray(array);
            /** @type {require('mineflayer').Bot} */
            let bot;
            const proxyArray = shuffleArray(process.argv[4].split(','));
            for (const username of array) {
                proxyI++;
                async function createaBot() {
                    if (useTimeout) {
                        const timeout = getRandomArbitrary(5000, 200000);
                        log(`[${username}] Waiting for ${timeout / 1000}s before logging in...`);
                        await sleep(timeout);
                    }
                    if (useProxy) bot = createBot({
                        viewDistance: 'tiny',
                        username: username,
                        host: host,
                        port: port,
                        physicsEnabled: false,
                        connect: (client) => {
                            SocksClient.createConnection({
                                proxy: {
                                    host: proxyArray[proxyI].split(':')[0],
                                    port: parseInt(proxyArray[proxyI].split(':')[1]),
                                    type: 5,
                                },
                                command: 'connect',
                                destination: {
                                    host: host,
                                    port: port,
                                },
                            }, (err, info) => {
                                if (err) {
                                    if (err.toString().includes('ETIMEDOUT') || err.toString().includes('Proxy connection timed out')) {
                                        log(`[${username}] Proxy timed out`.bgRed);
                                    } else if (err.toString().includes('Socket closed')) {
                                        log(`[${username}] Proxy socket closed`.bgRed);
                                    } else if (err.toString().includes('ECONNRESET')) {
                                        log(`[${username}] Proxy connection reset`.bgRed);
                                    } else if (err.toString().includes('ECONNREFUSED') || err.toString().includes('ConnectionRefused')) {
                                        log(`[${username}] Proxy connection refused`.bgRed);
                                    } else if (err.toString().includes('Authentication failed')) {
                                        log(`[${username}] Proxy authentication failed`.bgRed);
                                    } else if (err.toString().includes('Received invalid Socks5 initial handshake')) {
                                        log(`[${username}] Received invalid Socks5 initial handshake`.bgRed);
                                    } else if (err.toString().includes('HostUnreachable')) {
                                        log(`[${username}] Host unreachable`.bgRed);
                                    } else if (err.toString().includes('Failure')) {
                                        log(`[${username}] Failure`.bgRed);
                                    } else console.log(err);
                                    return;
                                }
                                client.setSocket(info.socket);
                                client.emit('connect');
                            });
                        },
                        loadInternalPlugins: false
                    });
                    else if (!useProxy) bot = createBot({
                        viewDistance: 'tiny',
                        username: username,
                        host: host,
                        port: port,
                        physicsEnabled: false,
                    });
                }
                i++;
                log(`[${i}/${array.length}] Creating bot ${username}... (${array.length - i} left)`.green);
                await createaBot();
                function botThing() {
                    log(`[${username}] Logged in`.green);
                    bot.once('messagestr', async function botThing2(message) {
                        if (message === '' || message === ' ' || message === '\u200b' || !message || spaceRegex.test(message)) return;
                        log(`[${username}] ${message}`.yellow);
                        if (message.includes('7b7t')) {
                            log(`[${username}] Reached the end of the queue, ending the connection and reconnecting...`.green);
                            bot.end();
                            await createaBot();
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
                        createaBot();
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