export interface QueueAttackOptions {
  proxy?: ProxyType[]
  useTimeout: boolean
  workerNumber: number
  usernames: string[]
  host: string
  port: number
}

export interface ProxyType {
  host: string
  port: number
}
