import { VoiceSettings, TTSSettings } from '../types'

export const VOICE_NAMES = {
  alloy: 'Rachel (натуральный женский)',
  echo: 'Drew (мужской amerykanski)',
  fable: 'Callum (мужской британский)',
  onyx: 'Arnold (глубокий мужской)',
  nova: 'Sarah (женский американский)',
  shimmer: 'Elli (мягкий женский)'
} as const

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voice: 'nova',
  gender: 'female',
  narratorDescription: 'Профессиональный диктор с теплым и дружелюбным тоном',
  steerability: 'доброжелательно, спокойно'
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  useElevenLabs: false,
  forceDemo: false
}

export const WORDS_PER_MINUTE = 180
export const DEFAULT_SCENE_SPEED = 5
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB