// code from https://www.npmjs.com/package/simple-proxy-scraper

import request from 'request-promise'

const apiRoot = 'https://api.proxyscrape.com/'
const proxyTypes = ['http', 'socks4', 'socks5', 'all']
const anonimityTypes = ['elite', 'anonymous', 'transparent', 'all']
const sslTypes = ['yes', 'no', 'all']

interface OptionType {
  proxytype?: 'http' | 'socks4' | 'socks5' | 'all'
  timeout?: number
  anonimity?: 'elite' | 'anonymous' | 'transparent' | 'all'
  country?: string
  ssl?: 'yes' | 'no' | 'all'
  limit?: number
  averagetimeout?: number
}

/**
 * Parse options into a string of parameters for the api request.
 * @param options The options object.
 * @returns String of parameters parsed from the options
 */
function returnParamString (options: OptionType) {
  let paramString = ''
  if (options.proxytype && proxyTypes.includes(options.proxytype.toLowerCase())) {
    paramString += `&proxytype=${options.proxytype.toLowerCase()}`
  }
  if (options.timeout) {
    paramString += `&timeout=${options.timeout}`
  }
  if (options.anonimity && anonimityTypes.includes(options.anonimity.toLowerCase())) {
    paramString += `&anonimity=${options.anonimity}`
  }
  if (options.country) {
    paramString += `&country=${options.country}`
  }
  if (options.ssl && sslTypes.includes(options.ssl.toLowerCase())) {
    paramString += `&ssl=${options.ssl}`
  }
  if (options.limit) {
    paramString += `&limit=${options.limit}`
  }
  if (options.averagetimeout) {
    paramString += `&averagetimeout=${options.averagetimeout}`
  }
  return paramString
}

class ProxyScrapeAPI {
  /**
     * It does exactly what you think it does.
     * @param options The options object.
     * @returns {string[]} Array of proxies
     */
  async getProxies (options: OptionType) {
    const reqUrl = `${apiRoot}?request=displayproxies${returnParamString(options)}`
    const response = await request.get(reqUrl, {
      resolveWithFullResponse: true
    })
    /** @type {string} */
    const { body } = await response
    const proxies = body
      .split('\n')
      .map(line => {
        if (line.length > 5) {
          return line.replace('\r', '')
        }
      })
    return proxies.filter(Boolean)
  }

  async getAmountProxies (options) {
    const reqUrl = `${apiRoot}?request=amountproxies${returnParamString(options)}`
    const res = await request.get(reqUrl, {
      resolveWithFullResponse: true
    })
    const { body } = await res
    return body
  }
}

export = new ProxyScrapeAPI()
