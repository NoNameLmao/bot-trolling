export interface QueueLongProcessArgs {
  useProxy: boolean
  useTimeout: boolean
  workerNumber: number
  usernames: string[]
  host: string
  port: number
}
