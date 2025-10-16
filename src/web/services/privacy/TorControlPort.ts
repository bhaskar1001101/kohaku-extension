/**
 * TorControlPort - Communicates with Tor control port (9051) to get circuit details
 *
 * This uses native messaging to a helper script since browser extensions
 * can't directly connect to TCP sockets.
 */

export type TorCircuitNode = {
  fingerprint: string
  nickname: string
  ipAddress?: string
  country?: string
  flags?: string[]
}

export type TorCircuit = {
  id: string
  status: string
  path: TorCircuitNode[]
  buildFlags: string[]
  purpose: string
  timeCreated: number
}

export type TorCircuitDetails = {
  entryNode: TorCircuitNode | null
  middleNode: TorCircuitNode | null
  exitNode: TorCircuitNode | null
  circuitId: string
  buildTime?: number
}

class TorControlPort {
  private host = '127.0.0.1'
  private port = 9051
  private isAuthenticated = false

  /**
   * Connect to Tor control port via WebSocket proxy
   * Since browser extensions can't use raw TCP, we need a local WebSocket server
   * or use native messaging to a helper script.
   *
   * For now, we'll use fetch with a local HTTP proxy that talks to Tor control port.
   */
  async connect(): Promise<boolean> {
    try {
      console.log('[TorControlPort] Attempting to connect to control port...')

      // Try to authenticate (assuming CookieAuthentication 0 as per user's torrc)
      const authResult = await this.sendCommand('AUTHENTICATE')

      if (authResult.includes('250 OK')) {
        this.isAuthenticated = true
        console.log('[TorControlPort] Successfully authenticated')
        return true
      }

      console.error('[TorControlPort] Authentication failed:', authResult)
      return false
    } catch (error) {
      console.error('[TorControlPort] Failed to connect:', error)
      return false
    }
  }

  /**
   * Send a command to Tor control port via native messaging
   */
  private async sendCommand(command: string): Promise<string> {
    try {
      console.log('[TorControlPort] Sending command via native messaging:', command)

      // Use native messaging to communicate with Python bridge
      return new Promise((resolve, reject) => {
        const port = chrome.runtime.connectNative('com.ambire.tor_control')

        port.onMessage.addListener((response: any) => {
          if (response.success) {
            resolve(response.response)
          } else {
            reject(new Error(response.error || 'Unknown error'))
          }
          port.disconnect()
        })

        port.onDisconnect.addListener(() => {
          const error = chrome.runtime.lastError
          if (error) {
            console.error('[TorControlPort] Native messaging disconnected:', error)
            reject(new Error(error.message))
          }
        })

        // Send the command
        port.postMessage({ command })
      })
    } catch (error) {
      console.error('[TorControlPort] Native messaging failed:', error)
      // Fallback to mock data for development
      console.warn('[TorControlPort] Using mock data (native messaging not available)')

      if (command === 'AUTHENTICATE') {
        return '250 OK'
      }
      if (command === 'GETINFO status/circuit-established') {
        return '250-status/circuit-established=1\n250 OK'
      }
      if (command === 'GETINFO circuit-status') {
        // Mock circuit data
        return `250+circuit-status=
123 BUILT $AAAA1111~GuardNode1,$BBBB2222~MiddleNode1,$CCCC3333~ExitNode1 BUILD_FLAGS=NEED_CAPACITY PURPOSE=GENERAL TIME_CREATED=2024-01-01T00:00:00
.
250 OK`
      }
      return '250 OK'
    }
  }

  /**
   * Check if a circuit is established
   */
  async isCircuitEstablished(): Promise<boolean> {
    try {
      if (!this.isAuthenticated) {
        await this.connect()
      }

      const result = await this.sendCommand('GETINFO status/circuit-established')
      return result.includes('circuit-established=1')
    } catch (error) {
      console.error('[TorControlPort] Failed to check circuit status:', error)
      return false
    }
  }

  /**
   * Get list of active circuits
   */
  async getCircuits(): Promise<TorCircuit[]> {
    try {
      if (!this.isAuthenticated) {
        await this.connect()
      }

      // GETINFO circuit-status returns:
      // 250+circuit-status=
      // 123 BUILT $AAA~Node1,$BBB~Node2,$CCC~Node3 BUILD_FLAGS=NEED_CAPACITY PURPOSE=GENERAL TIME_CREATED=2024-01-01T00:00:00
      const result = await this.sendCommand('GETINFO circuit-status')
      // console.log('[TorControlPort] Raw circuit-status response:', result)
      const circuits = this.parseCircuits(result)
      // console.log('[TorControlPort] Parsed circuits:', circuits.length, circuits.map(c => ({ id: c.id, status: c.status, purpose: c.purpose, nodes: c.path.length })))

      return circuits
    } catch (error) {
      console.error('[TorControlPort] Failed to get circuits:', error)
      return []
    }
  }

  /**
   * Parse circuit-status response
   */
  private parseCircuits(response: string): TorCircuit[] {
    const circuits: TorCircuit[] = []
    const lines = response.split('\n')

    for (let line of lines) {
      line = line.trim() // Remove \r\n and whitespace
      if (!line || line.startsWith('250') || line === '.') continue

      // Parse: ID STATUS $FP1~Nick1,$FP2~Nick2,$FP3~Nick3 BUILD_FLAGS=... PURPOSE=... TIME_CREATED=...
      const match = line.match(/^(\d+)\s+(\w+)\s+([\$\w,~]+)(?:\s+(.*))?$/)
      if (!match) {
        console.log('[TorControlPort] Failed to parse line:', line)
        continue
      }

      const [, id, status, pathStr, rest] = match

      const path = pathStr.split(',').map(node => {
        const [fp, nick] = node.split('~')
        return {
          fingerprint: fp.replace('$', ''),
          nickname: nick || 'Unknown',
        }
      })

      // Extract PURPOSE from the rest of the line
      let purpose = 'GENERAL'
      if (rest) {
        const purposeMatch = rest.match(/PURPOSE=(\S+)/)
        if (purposeMatch) {
          purpose = purposeMatch[1]
        }
      }

      circuits.push({
        id,
        status,
        path,
        buildFlags: [],
        purpose,
        timeCreated: Date.now()
      })
    }

    return circuits
  }

  /**
   * Get details of the current active circuit
   */
  async getCurrentCircuitDetails(): Promise<TorCircuitDetails | null> {
    try {
      const circuits = await this.getCircuits()
      const streamStatus = await this.sendCommand('GETINFO stream-status')
    
      // console.log('[TorControlPort] Retrieved circuits:', circuits)
      console.log('[TorControlPort] Stream status:', streamStatus)

      // Parse stream-status to find attached circuit
      // Format: StreamID SP StreamStatus SP CircuitID SP Target
      const streamLines = streamStatus.split('\n').filter(l => l.match(/^\d+\s+\w+\s+\d+\s+/))
    
      if (streamLines.length === 0) {
        console.warn('[TorControlPort] No active streams found')
        return null
      }
  
      // Get the first SUCCEEDED stream's circuit ID
      let attachedCircuitId: string | null = null
      for (const line of streamLines) {
        const match = line.match(/^\d+\s+SUCCEEDED\s+(\d+)\s+/)
        if (match) {
          attachedCircuitId = match[1]
          break
        }
      }
  
      if (!attachedCircuitId) {
        console.warn('[TorControlPort] No SUCCEEDED streams found')
        return null
      }
  
      // Find the circuit with matching ID
      const activeCircuit = circuits.find(c => c.id === attachedCircuitId && c.status === 'BUILT')
  
      if (!activeCircuit || activeCircuit.path.length < 3) {
        console.warn('[TorControlPort] Circuit not found or invalid hop count')
        return null
      }

      if (!activeCircuit || activeCircuit.path.length < 3) {
        console.warn('[TorControlPort] No active 3-hop circuit found')
        return null
      }

      return {
        entryNode: activeCircuit.path[0],
        middleNode: activeCircuit.path[1],
        exitNode: activeCircuit.path[2],
        circuitId: activeCircuit.id,
        buildTime: Date.now() - activeCircuit.timeCreated
      }
    } catch (error) {
      console.error('[TorControlPort] Failed to get circuit details:', error)
      return null
    }
  }

  /**
   * Create a new circuit (circuit rotation)
   */
  async createNewCircuit(): Promise<string | null> {
    try {
      if (!this.isAuthenticated) {
        await this.connect()
      }

      const result = await this.sendCommand('SIGNAL NEWNYM')

      if (result.includes('250 OK')) {
        console.log('[TorControlPort] New circuit requested')
        return 'OK'
      }

      return null
    } catch (error) {
      console.error('[TorControlPort] Failed to create new circuit:', error)
      return null
    }
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    if (this.isAuthenticated) {
      await this.sendCommand('QUIT')
      this.isAuthenticated = false
    }
  }
}

export const torControlPort = new TorControlPort()
