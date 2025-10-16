import React from 'react'
import { View } from 'react-native'

import Text from '@common/components/Text'
import spacings from '@common/styles/spacings'
import useTheme from '@common/hooks/useTheme'

interface TorCircuitDetailsProps {
  status: {
    connected: boolean
    circuitEstablished: boolean
    entryNode?: string
    middleNode?: string
    exitNode?: string
    country?: string
    lastChecked: number
    error?: string
  }
}

const TorCircuitDetails: React.FC<TorCircuitDetailsProps> = ({ status }) => {
  const { theme } = useTheme()

  if (!status.connected) {
    return (
      <View style={[spacings.mt1Xl, spacings.p1Xl, { backgroundColor: theme.tertiaryBackground, borderRadius: 8 }]}>
        <Text fontSize={14} weight="medium" appearance="errorText">
          Not Connected to Tor
        </Text>
        <Text fontSize={12} appearance="secondaryText" style={spacings.mt0Sm}>
          {status.error || 'Unable to connect to Tor daemon on localhost:9050'}
        </Text>
        <Text fontSize={12} appearance="tertiaryText" style={spacings.mt1Sm}>
          Make sure Tor is running on your system. Visit torproject.org to download and install Tor.
        </Text>
      </View>
    )
  }

  if (!status.circuitEstablished) {
    return (
      <View style={[spacings.mt1Xl, spacings.p1Xl, { backgroundColor: theme.tertiaryBackground, borderRadius: 8 }]}>
        <Text fontSize={14} weight="medium" appearance="warningText">
          Establishing Circuit...
        </Text>
        <Text fontSize={12} appearance="secondaryText" style={spacings.mt0Sm}>
          Connected to Tor daemon, waiting for circuit to establish.
        </Text>
      </View>
    )
  }

  const hasCircuitDetails = status.entryNode || status.middleNode || status.exitNode

  return (
    <View style={[spacings.mt1Xl, spacings.p1Xl, { backgroundColor: theme.tertiaryBackground, borderRadius: 8 }]}>
      <Text fontSize={14} weight="medium" appearance="successText" style={spacings.mbSm}>
        Tor Circuit Active
      </Text>

      {hasCircuitDetails ? (
        <View style={spacings.mt1Sm}>
          <Text fontSize={12} weight="medium" appearance="secondaryText" style={spacings.mb0Xs}>
            Circuit Path:
          </Text>

          <View style={spacings.mt0Sm}>
            <Text fontSize={11} appearance="tertiaryText">
              Your Device
            </Text>
            <Text fontSize={11} appearance="tertiaryText" style={spacings.ml0Sm}>
              ↓
            </Text>
            <Text fontSize={11} appearance="primaryText" style={spacings.ml0Sm}>
              Entry: {status.entryNode || 'Unknown'}
            </Text>
            <Text fontSize={11} appearance="tertiaryText" style={spacings.ml0Sm}>
              ↓
            </Text>
            <Text fontSize={11} appearance="primaryText" style={spacings.ml0Sm}>
              Middle: {status.middleNode || 'Unknown'}
            </Text>
            <Text fontSize={11} appearance="tertiaryText" style={spacings.ml0Sm}>
              ↓
            </Text>
            <Text fontSize={11} appearance="primaryText" style={spacings.ml0Sm}>
              Exit: {status.exitNode || 'Unknown'}
            </Text>
            {status.country && (
              <>
                <Text fontSize={11} appearance="tertiaryText" style={spacings.ml0Sm}>
                  ↓
                </Text>
                <Text fontSize={11} appearance="primaryText" style={spacings.ml0Sm}>
                  Exit Country: {status.country}
                </Text>
              </>
            )}
            <Text fontSize={11} appearance="tertiaryText" style={spacings.ml0Sm}>
              ↓
            </Text>
            <Text fontSize={11} appearance="tertiaryText">
              Destination (RPC Provider)
            </Text>
          </View>
        </View>
      ) : (
        <View style={spacings.mt1Sm}>
          <Text fontSize={12} appearance="secondaryText">
            Circuit established successfully. Requests are being routed through Tor.
          </Text>
          <Text fontSize={11} appearance="tertiaryText" style={spacings.mt0Sm}>
            Circuit details require Tor control port access (port 9051) which is not yet configured.
          </Text>
        </View>
      )}

      <Text fontSize={11} appearance="tertiaryText" style={spacings.mt1Sm}>
        Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
      </Text>
    </View>
  )
}

export default React.memo(TorCircuitDetails)
