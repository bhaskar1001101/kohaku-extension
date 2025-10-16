import { browser, platform } from '@web/constants/browserapi'
import { storage } from '@web/extension-services/background/webapi/storage'

import {
  DEFAULT_PRIVACY_CONFIG,
  PrivacyMode,
  PrivacyProxyConfig,
  RequestSensitivity
} from './types'

class PrivacyProxyService {
  private config: PrivacyProxyConfig = DEFAULT_PRIVACY_CONFIG

  private isInitialized = false

  async init() {
    if (this.isInitialized) {
      console.log('[PrivacyProxyService] Already initialized')
      return
    }

    console.log('[PrivacyProxyService] Initializing...')

    // Load config from storage
    const savedMode = await storage.get('privacyMode', 'direct' as PrivacyMode)
    this.config.mode = savedMode
    console.log('[PrivacyProxyService] Loaded mode from storage:', savedMode)

    // Firefox: Use browser.proxy.onRequest for per-request proxying
    if (platform === 'browser-gecko') {
      console.log('[PrivacyProxy] Firefox detected: Setting up browser.proxy.onRequest with mode:', this.config.mode)
      this.setupGeckoProxy(this.config.mode)
    }

    // Webkit (Chrome): browser.proxy API is different, need to set proxy.settings
    // But this affects the entire browser, not just extension
    // For now, we'll rely on fetch interception only for Webkit
    if (platform === 'browser-webkit') {
      console.log(
        '[PrivacyProxy] Webkit detected: Using fetch-level interception (browser.proxy.settings would affect entire browser)'
      )
    }

    this.isInitialized = true
    console.log('[PrivacyProxyService] Initialized successfully, mode:', this.config.mode)
  }

  handleProxyRequest(requestInfo: any, mode: string = this.config.mode) {
    // console.log('[PrivacyProxy] Request intercepted:', {
    //   url: requestInfo.url,
    //   originUrl: requestInfo.originUrl,
    //   documentUrl: requestInfo.documentUrl,
    //   type: requestInfo.type,
    //   tabId: requestInfo.tabId,
    //   mode: mode
    // })

    // Only proxy requests originating from our extension
    // Background service worker requests may not have originUrl, so check multiple conditions
    const extensionUrl = browser.runtime.getURL('')
    // console.log(extensionUrl)
    const isExtensionRequest =
      (requestInfo.originUrl && requestInfo.originUrl.startsWith(extensionUrl) && requestInfo.tabId === -1) // Background service worker (tab ID -1 in Firefox)
    // const isExtensionRequest = requestInfo.tabId === -1; // For now, proxy all requests for testing

    if (!isExtensionRequest) {
      console.log('[PrivacyProxy] Not an extension request, using direct:', requestInfo.originUrl)
      return { type: 'direct' }
    }

    // Route based on current mode
    if (this.config.mode === 'tor') {
      console.log('[PrivacyProxy] Routing request through Tor:', requestInfo.url)
      return {
        type: 'socks',
        host: this.config.torSocksHost,
        port: this.config.torSocksPort
      }
    }

    if (this.config.mode === 'nym') {
      console.log('[PrivacyProxy] Routing request through Nym:', requestInfo.url)
      return {
        type: 'socks',
        host: this.config.nymSocksHost,
        port: this.config.nymSocksPort
      }
    }
    
    // console.log('[PrivacyProxy] Direct connection for request:', requestInfo.url)
    return { type: 'direct' }
  }
    

  setupGeckoProxy(mode: string) {
    console.log('[PrivacyProxy] Setting up Firefox proxy listener')
    // Firefox: intercept requests and route through proxy
    browser.proxy.onRequest.addListener(
      this.handleProxyRequest.bind(this),
      { urls: ['<all_urls>'] }
    )
    console.log('[PrivacyProxy] Firefox proxy listener registered')
  }

  async setMode(mode: PrivacyMode): Promise<void> {
    console.log('[PrivacyProxyService] Setting mode to:', mode)
    this.config.mode = mode
    await storage.set('privacyMode', mode)
    console.log('[PrivacyProxyService] Mode saved to storage:', mode)

    // Mode change takes effect immediately for new requests
    // Firefox: browser.proxy.onRequest will use new mode
    // Webkit: fetch-level interception will use new mode
  }

  getMode(): PrivacyMode {
    return this.config.mode
  }

  getConfig(): PrivacyProxyConfig {
    return { ...this.config }
  }

  /**
   * Determine request sensitivity based on URL and method
   * This is used for circuit isolation decisions in Tor
   */
  determineRequestSensitivity(url: string): RequestSensitivity {
    const urlLower = url.toLowerCase()

    // High sensitivity: transactions, broadcasts, account-revealing queries
    if (
      urlLower.includes('/broadcast') ||
      urlLower.includes('sendusero peration') ||
      urlLower.includes('sendrawtransaction') ||
      urlLower.includes('/multi-hints') ||
      urlLower.includes('/portfolio')
    ) {
      return 'high'
    }

    // Medium sensitivity: RPC queries
    if (
      urlLower.includes('/rpc') ||
      urlLower.includes('infura') ||
      urlLower.includes('alchemy') ||
      urlLower.includes('quicknode')
    ) {
      return 'medium'
    }

    // Low sensitivity: price feeds, public data
    return 'low'
  }

  /**
   * For future use: Tor circuit isolation based on sensitivity
   * This would require Tor control port access (9051)
   */
  shouldIsolateCircuit(sensitivity: RequestSensitivity): boolean {
    return sensitivity === 'high'
  }
}

// Singleton instance
export const privacyProxyService = new PrivacyProxyService()
