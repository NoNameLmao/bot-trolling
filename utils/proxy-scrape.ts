import request from 'request-promise'

const apiRoot = 'https://api.proxyscrape.com/v2/'
export type proxyTypes = 'http'|'socks4'|'socks5'|'all'
export type anonymityTypes = 'elite'|'anonymous'|'transparent'|'all'
export type sslTypes = 'yes'|'no'|'all'

export interface OptionType {
  protocol?: proxyTypes
  timeout?: number
  anonymity?: anonymityTypes
  country?: string
  ssl?: sslTypes
}

function returnParamString (options: OptionType): string {
  let paramString = ''
  if (options.protocol !== undefined) {
    paramString += `&protocol=${options.protocol}`
  }
  if (options.timeout !== undefined) {
    paramString += `&timeout=${options.timeout}`
  }
  if (options.country !== undefined) {
    paramString += `&country=${options.country}`
  }
  if (options.ssl !== undefined) {
    paramString += `&ssl=${options.ssl}`
  }
  if (options.anonymity !== undefined) {
    paramString += `&anonymity=${options.anonymity}`
  }
  return paramString
}

export async function getProxies (options: OptionType): Promise<string[]> {
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

export async function getAmountProxies (options: OptionType): Promise<number> {
  const reqUrl = `${apiRoot}?request=amountproxies${returnParamString(options)}`
  const res = await request.get(reqUrl, {
    resolveWithFullResponse: true
  })
  const { body }: {body: string} = await res
  return parseInt(body)
}
