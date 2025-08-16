export interface CustomVoice {
  id: string
  name: string
  gender: 'male' | 'female'
  description?: string
  libraryUrl?: string
}

export interface VoiceSettings {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  gender: 'male' | 'female'
  narratorDescription: string
  steerability: string
  customVoiceId?: string // ID кастомного голоса ElevenLabs
}

export interface TTSSettings {
  useElevenLabs: boolean
  forceDemo: boolean
}

export interface GlobalSettings {
  customVoices: CustomVoice[]
}

export interface ProjectSettings {
  voiceSettings: VoiceSettings
  ttsSettings: TTSSettings
}

export interface MediaFile {
  fileName: string
  url: string
  type: 'image' | 'video' | 'audio'
  originalName?: string
}

export interface Scene {
  id: string
  title: string
  text: string
  description: string
  narratorDescription: string
  media: MediaFile[]
  audioUrl: string | null
  audioDuration: number | null
  isCompleted: boolean
  recommendedSpeed?: number
  speed: number
  isAudioDemo?: boolean
}

export interface Project {
  id: string
  title: string
  scenes: Scene[]
  settings: ProjectSettings
  createdAt: string
  updatedAt: string
}