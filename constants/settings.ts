export const VOICE_OPTIONS = [
  { value: 'nova', label: 'Sarah (женский американский)' },
  { value: 'shimmer', label: 'Elli (мягкий женский)' },
  { value: 'alloy', label: 'Rachel (натуральный женский)' },
  { value: 'echo', label: 'Drew (мужской американский)' },
  { value: 'onyx', label: 'Arnold (глубокий мужской)' },
  { value: 'fable', label: 'Callum (мужской британский)' }
] as const

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' }
] as const

export const VOICE_DESCRIPTIONS = {
  'Sarah': 'Естественный женский американский голос, отлично подходит для профессиональной озвучки',
  'Elli': 'Мягкий женский голос с теплым звучанием',
  'Drew': 'Четкий мужской американский голос для деловых презентаций',
  'Arnold': 'Глубокий мужской голос с авторитетным звучанием'
} as const

export const TTS_HELP_TEXT = {
  howItWorks: {
    title: '💡 Как это работает:',
    elevenlabs: 'Требует API ключ и кредиты, но дает профессиональное качество',
    demo: 'Создает простые мелодичные тоны для тестирования',
    forceDemo: 'Полезно для разработки без трат на API'
  },
  autoMode: {
    title: 'ℹ️ Автоматический режим',
    description: 'Система попытается использовать ElevenLabs, но автоматически переключится на демо режим при ошибках (например, исчерпание квоты)'
  },
  elevenlabsSetup: {
    title: '⚠️ Настройка ElevenLabs',
    description: 'Для использования ElevenLabs AI требуется:',
    requirements: [
      'API ключ ElevenLabs',
      'Достаточный баланс кредитов',
      'Добавление ключа в секреты Supabase'
    ],

  }
} as const

export const PLACEHOLDERS = {
  narratorDescription: 'Например: Профессиональный диктор с теплым и дружелюбным тоном',
  steerability: 'Например: доброжелательно, спокойно, как документальный рассказчик'
} as const

export const HELP_MESSAGES = {
  voiceDescription: 'Описание общего характера и стиля диктора для проекта',
  steerability: 'Краткое описание тона и характера речи',
  elevenlabsVoices: 'Используются профессиональные голоса ElevenLabs AI'
} as const