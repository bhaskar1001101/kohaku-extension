import React, { useContext, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import ControlOption from '@common/components/ControlOption'
import Select from '@common/components/Select'
import Text from '@common/components/Text'
import SettingsIcon from '@common/assets/svg/SettingsIcon'
import spacings from '@common/styles/spacings'
import SettingsPageHeader from '@web/modules/settings/components/SettingsPageHeader'
import { SettingsRoutesContext } from '@web/modules/settings/contexts/SettingsRoutesContext'
import useBackgroundService from '@web/hooks/useBackgroundService'
import { storage } from '@web/extension-services/background/webapi/storage'

import TorCircuitDetails from './components/TorCircuitDetails'

type PrivacyMode = 'direct' | 'tor' | 'nym'
type TorConnectionStatus = {
  connected: boolean
  circuitEstablished: boolean
  lastChecked: number
  error?: string
  entryNode?: string
  middleNode?: string
  exitNode?: string
  country?: string
}

const PrivacySettingsScreen = () => {
  const { t } = useTranslation()
  const { setCurrentSettingsPage } = useContext(SettingsRoutesContext)
  const { dispatch } = useBackgroundService()
  const [currentMode, setCurrentMode] = useState<PrivacyMode>('direct')
  const [torStatus, setTorStatus] = useState<TorConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setCurrentSettingsPage('privacy')

    const loadPrivacyStatus = async () => {
      try {
        console.log('[PrivacySettings] Loading privacy status from storage...')
        // Read mode directly from storage
        const savedMode = await storage.get('privacyMode', 'direct' as PrivacyMode)
        console.log('[PrivacySettings] Mode loaded from storage:', savedMode)
        setCurrentMode(savedMode)

        // If mode is tor, check Tor connection status via chrome.storage
        if (savedMode === 'tor') {
          const checkTorStatus = async () => {
            // Read Tor status from storage (written by TorConnectionMonitor)
            const status = await storage.get('torConnectionStatus', null as TorConnectionStatus | null)
            console.log('[PrivacySettings] Tor status from storage:', status)
            setTorStatus(status)
          }

          await checkTorStatus()
        }
      } catch (error) {
        console.error('[PrivacySettings] Error loading status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPrivacyStatus()
  }, [setCurrentSettingsPage])

  useEffect(() => {
    if (currentMode === 'tor' && !isLoading) {
      const checkTorStatus = async () => {
        try {
          // Read Tor status from storage (written by TorConnectionMonitor)
          const status = await storage.get('torConnectionStatus', null as TorConnectionStatus | null)
          console.log('[PrivacySettings] Tor status update from storage:', status)
          setTorStatus(status)
        } catch (error) {
          console.error('[PrivacySettings] Error checking Tor status:', error)
        }
      }

      // Poll storage every 5 seconds to get updated status
      const interval = setInterval(checkTorStatus, 5000)
      return () => clearInterval(interval)
    } else if (currentMode !== 'tor') {
      // Clear tor status when switching away from tor
      setTorStatus(null)
    }
  }, [currentMode, isLoading])

  const PRIVACY_MODE_OPTIONS = useMemo(
    () => [
      {
        value: 'direct',
        label: t('Direct (No Privacy)')
      },
      {
        value: 'tor',
        label: t('Tor')
      },
      {
        value: 'nym',
        label: t('Nym Mixnet')
      }
    ],
    [t]
  )

  const selectedOption = useMemo(
    () =>
      PRIVACY_MODE_OPTIONS.find((opt) => opt.value === currentMode) ||
      PRIVACY_MODE_OPTIONS[0],
    [PRIVACY_MODE_OPTIONS, currentMode]
  )

  const handleModeChange = async (option: { value: string; label: string }) => {
    const newMode = option.value as PrivacyMode
    console.log('[PrivacySettings] Mode changed to:', newMode)
    setCurrentMode(newMode)

    try {
      // Save to storage directly
      await storage.set('privacyMode', newMode)
      console.log('[PrivacySettings] Mode saved to storage:', newMode)

      // Notify background service to start/stop monitoring
      dispatch({
        type: 'SET_PRIVACY_MODE',
        params: { mode: newMode }
      })

      // Immediately check Tor status if switching to Tor
      if (newMode === 'tor') {
        // Wait a moment for monitoring to start
        await new Promise(resolve => setTimeout(resolve, 1000))
        const status = await storage.get('torConnectionStatus', null as TorConnectionStatus | null)
        console.log('[PrivacySettings] Initial Tor status after mode change:', status)
        setTorStatus(status)
      }
    } catch (error) {
      console.error('[PrivacySettings] Error changing mode:', error)
    }
  }

  return (
    <>
      <SettingsPageHeader title="Privacy Mode" />
      <View style={spacings.mb2Xl}>
        <ControlOption
          title={t('Network Privacy')}
          description={t('Choose how to route network requests. Tor and Nym hide your IP address from RPC providers.')}
          renderIcon={<SettingsIcon />}
        >
          <Select
            setValue={handleModeChange}
            withSearch={false}
            options={PRIVACY_MODE_OPTIONS}
            value={selectedOption}
            containerStyle={{ width: 150, ...spacings.mb0 }}
            size="sm"
          />
        </ControlOption>

        {currentMode === 'tor' && (
          <View style={spacings.px2Xl}>
            {torStatus ? (
              <TorCircuitDetails status={torStatus} />
            ) : (
              <View style={[spacings.mt1Xl, spacings.p1Xl]}>
                <Text fontSize={14} appearance="secondaryText">
                  Checking Tor connection...
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </>
  )
}

export default PrivacySettingsScreen
