import { TorConnectionStatus } from './types'
import { storage } from '@web/extension-services/background/webapi/storage'
import { torControlPort } from './TorControlPort'

class TorConnectionMonitor {
  private status: TorConnectionStatus = {
    connected: false,
    circuitEstablished: false,
    lastChecked: 0
  }

  private checkInterval: NodeJS.Timeout | null = null
  private useControlPort = true // Try to use control port for circuit details

  /**
   * Check if Tor daemon is accessible by attempting SOCKS connection
   * We do this by making a test request through the proxy
   */
  async checkConnection(): Promise<TorConnectionStatus> {
    const now = Date.now()

    console.log('[TorConnectionMonitor] Checking connection...')

    try {
      // First, check if we can connect to control port and get circuit details
      let circuitDetails = null
      if (this.useControlPort) {
        try {
          circuitDetails = await torControlPort.getCurrentCircuitDetails()
          console.log('[TorConnectionMonitor] Got circuit details from control port:', circuitDetails)
        } catch (error) {
          console.warn('[TorConnectionMonitor] Control port unavailable, continuing with basic check:', error)
        }
      }

      // Then verify connectivity through check.torproject.org
      const response = await fetch('https://check.torproject.org/api/ip', {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      })

      console.log('[TorConnectionMonitor] Response received:', response.status)

      if (response.ok) {
        const data = await response.json()
        const isTor = data.IsTor === true

        console.log('[TorConnectionMonitor] Response data:', data)

        // Build status with circuit details if available
        this.status = {
          connected: true,
          circuitEstablished: isTor,
          lastChecked: now,
          entryNode: circuitDetails?.entryNode
            ? `${circuitDetails.entryNode.nickname} (${circuitDetails.entryNode.fingerprint.substring(0, 8)}...)`
            : undefined,
          middleNode: circuitDetails?.middleNode
            ? `${circuitDetails.middleNode.nickname} (${circuitDetails.middleNode.fingerprint.substring(0, 8)}...)`
            : undefined,
          exitNode: circuitDetails?.exitNode
            ? `${circuitDetails.exitNode.nickname} (${circuitDetails.exitNode.fingerprint.substring(0, 8)}...)`
            : undefined,
          country: data.IP ? 'Unknown' : undefined
        }

        console.log('[TorConnectionMonitor] Status updated:', this.status)
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error: any) {
      console.error('[TorConnectionMonitor] Connection check failed:', error)
      this.status = {
        connected: false,
        circuitEstablished: false,
        lastChecked: now,
        error: error.message || 'Connection failed'
      }
    }

    // Write status to storage so UI can read it
    await storage.set('torConnectionStatus', this.status)
    console.log('[TorConnectionMonitor] Status written to storage')

    return { ...this.status }
  }

  /**
   * Start periodic connection checks
   */
  startMonitoring(intervalMs: number = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    // Initial check
    this.checkConnection()

    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkConnection()
    }, intervalMs)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Get current status without making a new check
   */
  getStatus(): TorConnectionStatus {
    return { ...this.status }
  }

  /**
   * Get circuit details from Tor control port (9051)
   * This requires establishing a connection to Tor control port
   * For now, returning placeholder - implement later if needed
   */
  async getCircuitDetails(): Promise<{
    entryNode: string
    middleNode: string
    exitNode: string
    country: string
  } | null> {
    // TODO: Implement Tor control port connection
    // For now, return null
    // This would require:
    // 1. Connect to localhost:9051
    // 2. Send "AUTHENTICATE" command
    // 3. Send "GETINFO circuit-status" command
    // 4. Parse response to get circuit details
    return null
  }
}

export const torConnectionMonitor = new TorConnectionMonitor()
