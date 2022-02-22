const fetch = require('node-fetch');
const fs = require('fs').promises;

(async () => {
    log('Fetching player data...');
    const res = await fetch('https://api.2b2t.dev/stats?username=all');

    log('Parsing fetched player data to json...');
    /** @type {{ id: number, username: string, uuid: string, kills: number, deaths: number, joins: number, leaves: number, adminLevel: number }[]} */
    const players = await res.json();

    log('Reading bots.json...');
    const bots = await fs.readFile('bots.json', { encoding: 'utf8' });

    log('Parsing bots.json into json...');
    /** @type {{ username: string }[]} */
    const json = JSON.parse(bots);

    log('Filtering fetched players...');
    // see the filtering rule function at the end of the file
    players.filter(filterRule);
    for (const player of players) json.push({'username': player.username });

    log('Writing results to bots.json...');
    await fs.writeFile('bots.json', JSON.stringify(json, null, 4));
    log('Finished');

    function filterRule(player) {
        return player.username !== 'NoNameLmao' &&
        player.username !== 'Qbasty' &&
        player.username !== 'Pistonmaster' &&
        !json.some(bot => bot.username === player.username);
    }
})();

function log(string) {
    console.log(`[${new Date().toISOString()}] ${string}`);
}
