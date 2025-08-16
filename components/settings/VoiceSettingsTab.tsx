import React from 'react'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { ExternalLink, Mic } from 'lucide-react'
import { VoiceSettings, CustomVoice } from '../../types'
import { VOICE_OPTIONS, GENDER_OPTIONS, VOICE_DESCRIPTIONS, PLACEHOLDERS, HELP_MESSAGES } from '../../constants/settings'

interface VoiceSettingsTabProps {
  voiceSettings: VoiceSettings
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void
  customVoices?: CustomVoice[]
}

export const VoiceSettingsTab: React.FC<VoiceSettingsTabProps> = ({
  voiceSettings,
  updateVoiceSettings,
  customVoices = []
}) => {
  const selectedCustomVoice = customVoices.find(v => v.id === voiceSettings.customVoiceId)
  const isUsingCustomVoice = !!voiceSettings.customVoiceId

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Выбор типа голоса */}
        <div className="p-4 bg-accent rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Mic className="h-4 w-4 text-blue-500" />
            Выбор голоса для озвучки
          </h4>
          <p className="text-sm text-muted-foreground">
            Выберите встроенный голос или используйте пользовательский голос ElevenLabs
          </p>
        </div>

        {/* Пользовательские голоса ElevenLabs */}
        {customVoices.length > 0 && (
          <div>
            <Label>Пользовательские голоса ElevenLabs</Label>
            <Select 
              value={voiceSettings.customVoiceId || 'none'} 
              onValueChange={(value) => updateVoiceSettings({ 
                customVoiceId: value === 'none' ? undefined : value,
                // Если выбран пользовательский голос, обновляем пол
                gender: (value && value !== 'none') ? customVoices.find(v => v.id === value)?.gender || voiceSettings.gender : voiceSettings.gender
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите пользовательский голос" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не использовать</SelectItem>
                {customVoices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex items-center gap-2">
                      {voice.name}
                      <Badge variant="secondary" className="text-xs">
                        {voice.gender === 'male' ? 'М' : 'Ж'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomVoice && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedCustomVoice.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: <code>{selectedCustomVoice.id}</code>
                    </p>
                    {selectedCustomVoice.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedCustomVoice.description}
                      </p>
                    )}
                  </div>
                  {selectedCustomVoice.libraryUrl && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(selectedCustomVoice.libraryUrl, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Голоса из вашей библиотеки ElevenLabs. Добавить новые можно в глобальных настройках.
            </p>
          </div>
        )}

        <Separator />

        {/* Встроенные голоса (OpenAI) */}
        <div>
          <Label>Встроенные голоса (OpenAI)</Label>
          <Select 
            value={isUsingCustomVoice ? 'disabled' : voiceSettings.voice} 
            onValueChange={(value: any) => updateVoiceSettings({ 
              voice: value,
              customVoiceId: undefined // Сбрасываем пользовательский голос
            })}
            disabled={isUsingCustomVoice}
          >
            <SelectTrigger className={isUsingCustomVoice ? 'opacity-50' : ''}>
              <SelectValue placeholder={isUsingCustomVoice ? 'Используется пользовательский голос' : 'Выберите встроенный голос'} />
            </SelectTrigger>
            <SelectContent>
              {VOICE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {isUsingCustomVoice ? 'Отключено, пока используется пользовательский голос' : HELP_MESSAGES.elevenlabsVoices}
          </p>
        </div>

        <div>
          <Label>Пол диктора</Label>
          <Select 
            value={voiceSettings.gender} 
            onValueChange={(value: any) => updateVoiceSettings({ gender: value })}
            disabled={isUsingCustomVoice} // Пол определяется автоматически для пользовательских голосов
          >
            <SelectTrigger className={isUsingCustomVoice ? 'opacity-50' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isUsingCustomVoice && (
            <p className="text-xs text-muted-foreground mt-1">
              Пол определяется автоматически для пользовательского голоса
            </p>
          )}
        </div>

        <div>
          <Label>Описание стиля диктора</Label>
          <Textarea
            placeholder={PLACEHOLDERS.narratorDescription}
            value={voiceSettings.narratorDescription}
            onChange={(e) => updateVoiceSettings({ narratorDescription: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {HELP_MESSAGES.voiceDescription}
          </p>
        </div>

        <div>
          <Label>Характер речи</Label>
          <Input
            placeholder={PLACEHOLDERS.steerability}
            value={voiceSettings.steerability}
            onChange={(e) => updateVoiceSettings({ steerability: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {HELP_MESSAGES.steerability}
          </p>
        </div>

        {/* Информация о встроенных голосах */}
        {!isUsingCustomVoice && (
          <div className="p-4 bg-accent rounded-lg">
            <h4 className="font-medium mb-2">О встроенных голосах:</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              {Object.entries(VOICE_DESCRIPTIONS).map(([voice, description]) => (
                <p key={voice}><strong>{voice}:</strong> {description}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}