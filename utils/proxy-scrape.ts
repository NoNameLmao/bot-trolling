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

function returnParamString (options: OptionType): string {
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
  async getProxies (options: OptionType): Promise<string[]> {
    const reqUrl = `${apiRoot}?request=displayproxies${returnParamString(options)}`
    const response = await request.get(reqUrl, {
      resolveWithFullResponse: true
    })
    /** @type {string} */
    const { body }: {body: string} = await response
    const proxies: string[] = body
      .split('\n')
      .map((line: string) => {
        if (line.length > 5) {
          return line.replace('\r', '')
        } else {
          return line
        }
      })
    return proxies.filter(Boolean)
  }

  async getAmountProxies (options: OptionType): Promise<number> {
    const reqUrl = `${apiRoot}?request=amountproxies${returnParamString(options)}`
    const res = await request.get(reqUrl, {
      resolveWithFullResponse: true
    })
    const { body }: {body: string} = await res
    return parseInt(body)
  }
}

export = new ProxyScrapeAPI()
