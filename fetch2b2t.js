const fetch = require('node-fetch');
const fs = require('fs').promises;

(async () => {
    console.log('fetching...');
    const res = await fetch('https://api.2b2t.dev/stats?username=all');
    console.log('converting into json...');
    const players = await res.json();
    console.log('reading bots.json...');
    const bots = await fs.readFile('bots.json', { encoding: 'utf8' });
    console.log('converting into json...');
    let json = JSON.parse(bots);
    console.log('starting hell...');
    for (const player of players) {
        if (player.username === 'NoNameLmao') continue;
        json.push({'username': player.username });
    }
    console.log('finished hell... writing to bots.json');
    await fs.writeFile('bots.json', JSON.stringify(json, null, 4));
    console.log('fuck yes im done fuck off');
})();
