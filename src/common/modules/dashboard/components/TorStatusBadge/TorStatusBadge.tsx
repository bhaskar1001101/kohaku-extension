import React, { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'

import Text from '@common/components/Text'
import useTheme from '@common/hooks/useTheme'
import spacings from '@common/styles/spacings'
import flexbox from '@common/styles/utils/flexbox'
import { storage } from '@web/extension-services/background/webapi/storage'
import useNavigation from '@common/hooks/useNavigation'
import { ROUTES } from '@common/modules/router/constants/common'

type TorConnectionStatus = {
  connected: boolean
  circuitEstablished: boolean
  entryNode?: string
  middleNode?: string
  exitNode?: string
  lastChecked: number
  error?: string
}

const TorStatusBadge: React.FC = () => {
  const { theme } = useTheme()
  const { navigate } = useNavigation()
  const [privacyMode, setPrivacyMode] = useState<'direct' | 'tor' | 'nym'>('direct')
  const [torStatus, setTorStatus] = useState<TorConnectionStatus | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      const mode = await storage.get('privacyMode', 'direct')
      setPrivacyMode(mode)

      if (mode === 'tor') {
        const status = await storage.get('torConnectionStatus', null as TorConnectionStatus | null)
        setTorStatus(status)
      } else {
        setTorStatus(null)
      }
    }

    checkStatus()

    // Poll every 5 seconds
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  if (privacyMode === 'direct' || !torStatus) {
    return null
  }

  const handlePress = () => {
    navigate(ROUTES.privacySettings)
  }

  const getStatusColor = () => {
    if (!torStatus.connected) return theme.errorText
    if (!torStatus.circuitEstablished) return theme.warningText
    return theme.successText
  }

  const getStatusText = () => {
    if (!torStatus.connected) return 'Tor: Disconnected'
    if (!torStatus.circuitEstablished) return 'Tor: Connecting...'
    return 'Tor: Active'
  }

  const hasCircuitDetails = torStatus.entryNode || torStatus.middleNode || torStatus.exitNode

  return (
    <Pressable onPress={handlePress} style={[spacings.mSm, {marginBottom: 48}]}>
      <View
        style={[
          flexbox.directionRow,
          flexbox.alignCenter,
          {
            backgroundColor: theme.tertiaryBackground,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: getStatusColor()
          }
        ]}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: getStatusColor(),
            marginRight: 6
          }}
        />
        <Text fontSize={11} weight="medium" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </Text>
        {torStatus.circuitEstablished && hasCircuitDetails && (
          <Text fontSize={10} appearance="tertiaryText" style={spacings.mlXs}>
            • {torStatus.entryNode?.split(' ')[0] || 'Guard'} → {torStatus.exitNode?.split(' ')[0] || 'Exit'}
          </Text>
        )}
      </View>
    </Pressable>
  )
}

export default React.memo(TorStatusBadge)
