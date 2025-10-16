export type PrivacyMode = 'direct' | 'tor' | 'nym'

export type RequestSensitivity = 'low' | 'medium' | 'high'

export interface TorConnectionStatus {
  connected: boolean
  circuitEstablished: boolean
  entryNode?: string
  middleNode?: string
  exitNode?: string
  country?: string
  lastChecked: number
  error?: string
}

export interface PrivacyProxyConfig {
  mode: PrivacyMode
  torSocksHost: string
  torSocksPort: number
  nymSocksHost: string
  nymSocksPort: number
}

export const  DEFAULT_PRIVACY_CONFIG: PrivacyProxyConfig = {
  mode: 'direct',
  torSocksHost: '127.0.0.1',
  torSocksPort: 9050,
  nymSocksHost: '127.0.0.1',
  nymSocksPort: 1080
}
