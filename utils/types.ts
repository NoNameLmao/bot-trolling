export interface Config {
  host: string
  port: number
  username: string
}

export interface LogMessage {
  date: number
  displayDate: string
  id: string
  log: { message: string }
}

export interface AttackOptions {
  proxies?: ProxyType[]
  useTimeout: boolean
  workerNumber: number
  usernames: string[]
  host: string
  port: number
}

export interface ProxyType {
  host: string,
  port: number,
}

export type ProxySource = 'proxyscrape' | 'txt'
