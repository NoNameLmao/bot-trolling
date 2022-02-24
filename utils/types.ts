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
