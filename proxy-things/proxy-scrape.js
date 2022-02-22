// code from https://www.npmjs.com/package/simple-proxy-scraper

const request = require('request-promise');

const apiRoot = 'https://api.proxyscrape.com/';
const proxyTypes = ['http', 'socks4', 'socks5', 'all'];
const anonimityTypes = ['elite', 'anonymous', 'transparent', 'all'];
const sslTypes = ['yes', 'no', 'all'];

/**
 * Parse options into a string of parameters for the api request.
 * @param {{
 *     proxytype: 'http' | 'socks4' | 'socks5' | 'all',
 *     timeout: number,
 *     anonimity: 'elite' | 'anonymous' | 'transparent' | 'all',
 *     country: string,
 *     ssl: 'yes' | 'no' | 'all',
 *     limit: number
 * }} options The options object.
 * @returns String of parameters parsed from the options
 */
function returnParamString(options) {
    let paramString = '';
    if (options.proxytype && proxyTypes.includes(options.proxytype.toLowerCase())) {
        paramString += `&proxytype=${options.proxytype.toLowerCase()}`;
    }
    if (options.timeout) {
        paramString += `&timeout=${options.timeout}`;
    }
    if (options.anonimity && anonimityTypes.includes(options.anonimity.toLowerCase())) {
        paramString += `&anonimity=${options.anonimity}`;
    }
    if (options.country) {
        paramString += `&country=${options.country}`;
    }
    if (options.ssl && sslTypes.includes(options.ssl.toLowerCase())) {
        paramString += `&ssl=${options.ssl}`;
    }
    if (options.limit) {
        paramString += `&limit=${options.limit}`;
    }
    if (options.averagetimeout) {
        paramString += `&averagetimeout=${options.averagetimeout}`;
    }
    return paramString;
}
class ProxyScrapeAPI {
    constructor() {
        this.proxies = [];
    }
    /**
     * It does exactly what you think it does.
     * @param {{
     *     proxytype: 'http' | 'socks4' | 'socks5' | 'all',
     *     timeout: number,
     *     anonimity: 'elite' | 'anonymous' | 'transparent' | 'all',
     *     country: string,
     *     ssl: 'yes' | 'no' | 'all',
     *     limit: number
     * }} options The options object.
     * @returns {string[]} Array of proxies
     */
    async getProxies(options) {
        const reqUrl = `${apiRoot}?request=displayproxies${returnParamString(options)}`;
        const res = await request.get(reqUrl, {
            resolveWithFullResponse: true
        });
        /** @type {string} */
        const { body } = await res;
        const proxies = body
        .split('\n')
        .map(line => {
            if (line.length > 5 && line !== undefined) {
                return line.replace('\r', '');
            }
        });
        return proxies.filter(Boolean);
    }
    async getAmountProxies(options) {
        const reqUrl = `${apiRoot}?request=amountproxies${returnParamString(options)}`;
        const res = await request.get(reqUrl, {
            resolveWithFullResponse: true
        });
        const { body } = await res;
        return body;
    }
}
module.exports = new ProxyScrapeAPI();