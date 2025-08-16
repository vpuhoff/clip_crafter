import React from 'react'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Zap, Cpu } from 'lucide-react'
import { TTSSettings } from '../../types'
import { TTS_HELP_TEXT } from '../../constants/settings'
import { shouldShowAutoModeInfo } from '../../utils/tts'

interface TTSSettingsTabProps {
  ttsSettings: TTSSettings
  updateTTSSettings: (settings: Partial<TTSSettings>) => void
}

export const TTSSettingsTab: React.FC<TTSSettingsTabProps> = ({
  ttsSettings,
  updateTTSSettings
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 bg-accent rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            Настройки TTS движка
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Выберите способ генерации озвучки для проекта
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-blue-500" />
                <Label>Использовать ElevenLabs AI</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Профессиональная AI озвучка с высоким качеством
              </p>
            </div>
            <Switch
              checked={ttsSettings.useElevenLabs}
              onCheckedChange={(checked) => updateTTSSettings({ useElevenLabs: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-4 w-4 text-yellow-500" />
                <Label>Принудительный демо режим</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Всегда использовать демонстрационный звук
              </p>
            </div>
            <Switch
              checked={ttsSettings.forceDemo}
              onCheckedChange={(checked) => updateTTSSettings({ forceDemo: checked })}
            />
          </div>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
          <h4 className="font-medium mb-2 text-yellow-800 dark:text-yellow-200">
            {TTS_HELP_TEXT.howItWorks.title}
          </h4>
          <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p><strong>ElevenLabs AI:</strong> {TTS_HELP_TEXT.howItWorks.elevenlabs}</p>
            <p><strong>Демо режим:</strong> {TTS_HELP_TEXT.howItWorks.demo}</p>
            <p><strong>Принудительный демо:</strong> {TTS_HELP_TEXT.howItWorks.forceDemo}</p>
          </div>
        </div>

        {shouldShowAutoModeInfo(ttsSettings) && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">
              {TTS_HELP_TEXT.autoMode.title}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {TTS_HELP_TEXT.autoMode.description}
            </p>
          </div>
        )}

        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
          <h4 className="font-medium mb-2 text-red-800 dark:text-red-200">
            {TTS_HELP_TEXT.elevenlabsSetup.title}
          </h4>
          <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
            <p>{TTS_HELP_TEXT.elevenlabsSetup.description}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              {TTS_HELP_TEXT.elevenlabsSetup.requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
            <p>API ключ: {TTS_HELP_TEXT.elevenlabsSetup.apiKey}</p>
          </div>
        </div>
      </div>
    </div>
  )
}