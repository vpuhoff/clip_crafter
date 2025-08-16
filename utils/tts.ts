import { TTSSettings } from '../types'

export const getTTSModeDisplay = (ttsSettings: TTSSettings): string => {
  if (ttsSettings.forceDemo) {
    return 'Демо режим (принудительно)'
  }
  if (ttsSettings.useElevenLabs) {
    return 'ElevenLabs AI'
  }
  return 'Демо режим'
}

export const isAutoMode = (ttsSettings: TTSSettings): boolean => {
  return !ttsSettings.useElevenLabs && !ttsSettings.forceDemo
}

export const shouldShowAutoModeInfo = (ttsSettings: TTSSettings): boolean => {
  return isAutoMode(ttsSettings)
}