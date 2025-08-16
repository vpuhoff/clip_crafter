import React from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Checkbox } from './ui/checkbox'
import { Slider } from './ui/slider'
import { Badge } from './ui/badge'
import { Settings, Clock, Volume2, Loader2, PlayCircle, MessageSquare, Gauge, TrendingUp } from 'lucide-react'
import { Scene, ProjectSettings } from '../types'
import { calculateSceneDuration, formatDuration, getVideoSpeedLabel, getVideoSpeedMultiplier } from '../utils/helpers'
import { getTTSModeDisplay } from '../utils/tts'

interface SceneEditorProps {
  selectedScene: Scene | undefined
  updateSceneText: (id: string, text: string) => void
  updateSceneTitle: (id: string, title: string) => void
  updateSceneDescription: (id: string, description: string) => void
  updateSceneNarratorDescription: (id: string, description: string) => void
  updateSceneSpeed: (id: string, speed: number) => void
  toggleSceneCompleted: (id: string) => void
  generateTTS: (id: string) => void
  projectSettings: ProjectSettings
  isTTSLoading: boolean
  playAudio: (audioUrl: string) => void
}

export const SceneEditor: React.FC<SceneEditorProps> = ({
  selectedScene,
  updateSceneText,
  updateSceneTitle,
  updateSceneDescription,
  updateSceneNarratorDescription,
  updateSceneSpeed,
  toggleSceneCompleted,
  generateTTS,
  projectSettings,
  isTTSLoading,
  playAudio
}) => {

  if (!selectedScene) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Settings className="h-12 w-12 mx-auto mb-4" />
            <p>Выберите сцену для редактирования</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 bg-background">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              Название сцены
            </label>
            <Input
              value={selectedScene.title}
              onChange={(e) => updateSceneTitle(selectedScene.id, e.target.value)}
              className="text-lg"
            />
          </div>
          <div className="ml-4 flex flex-col items-end gap-4">
            <div className="text-right">
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Длительность
              </label>
              <div className="flex items-center gap-2 text-lg font-medium">
                <Clock className="h-4 w-4" />
                <span className={selectedScene.audioDuration !== null ? 'text-green-600' : 'text-primary'}>
                  {calculateSceneDuration(selectedScene)}
                </span>
              </div>
              {selectedScene.audioDuration !== null && (
                <p className="text-xs text-green-600 mt-1">
                  Реальная длительность озвучки
                </p>
              )}
              {selectedScene.audioDuration === null && selectedScene.text && (
                <p className="text-xs text-muted-foreground mt-1">
                  Расчетная длительность
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`complete-${selectedScene.id}`}
                checked={selectedScene.isCompleted}
                onCheckedChange={() => toggleSceneCompleted(selectedScene.id)}
              />
              <label 
                htmlFor={`complete-${selectedScene.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Сцена готова
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Описание сцены
          </label>
          <Input
            value={selectedScene.description}
            onChange={(e) => updateSceneDescription(selectedScene.id, e.target.value)}
            placeholder="Краткое описание происходящего в сцене"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Текст озвучки
          </label>
          <Textarea
            value={selectedScene.text}
            onChange={(e) => updateSceneText(selectedScene.id, e.target.value)}
            rows={8}
            className="resize-none"
            placeholder="Введите текст для озвучки этой сцены..."
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>
              Слов: {selectedScene.text.trim().split(/\s+/).filter(word => word.length > 0).length}
            </span>
            {selectedScene.audioDuration === null && (
              <span>
                Расчетное время: {calculateSceneDuration(selectedScene)}
              </span>
            )}
          </div>
        </div>

        {/* Narrator Description for Scene */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-orange-500" />
            <label className="text-sm font-medium">
              Описание диктора для этой сцены (опционально)
            </label>
          </div>
          <Textarea
            value={selectedScene.narratorDescription}
            onChange={(e) => updateSceneNarratorDescription(selectedScene.id, e.target.value)}
            rows={2}
            placeholder="Например: говорить быстрее и взволнованно, как будто что-то случилось"
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            💡 Если не указано, будут использованы глобальные настройки озвучки проекта
          </p>
        </div>

        {/* Video Speed Control Section */}
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/50">
            <label className="block text-sm font-medium mb-3">
              Скорость видео
            </label>
            
            {/* Recommended Speed Display */}
            {selectedScene.recommendedSpeed && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 dark:bg-green-950/30 rounded text-sm text-green-700 dark:text-green-300">
                <TrendingUp className="h-4 w-4" />
                <span>
                  Рекомендуемая скорость: {getVideoSpeedMultiplier(selectedScene.recommendedSpeed).toFixed(1)}x 
                  ({getVideoSpeedLabel(selectedScene.recommendedSpeed)})
                </span>
              </div>
            )}

            {/* Speed Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Текущая скорость видео:</span>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{getVideoSpeedMultiplier(selectedScene.speed).toFixed(1)}x</span>
                  <span className="text-sm text-muted-foreground">({getVideoSpeedLabel(selectedScene.speed)})</span>
                </div>
              </div>
              
              <Slider
                value={[selectedScene.speed]}
                onValueChange={(value) => updateSceneSpeed(selectedScene.id, value[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 - Замедленное (0.5x)</span>
                <span>5 - Нормальная (1x)</span>
                <span>10 - Ускоренное (2x)</span>
              </div>
              
              <p className="text-xs text-muted-foreground">
                💡 Эта настройка влияет на скорость воспроизведения видео в итоговом ролике
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium">
                Озвучка
              </label>
              <Badge variant="outline" className="text-xs">
                {getTTSModeDisplay(projectSettings.ttsSettings)}
              </Badge>
            </div>
            <Button
              onClick={() => generateTTS(selectedScene.id)}
              disabled={isTTSLoading || !selectedScene.text.trim()}
              size="sm"
            >
              {isTTSLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Сгенерировать озвучку
                </>
              )}
            </Button>
          </div>
          
          {selectedScene.audioUrl ? (
            <div className={`p-4 rounded-lg ${selectedScene.isAudioDemo ? 'bg-yellow-50 dark:bg-yellow-950/30' : 'bg-green-50 dark:bg-green-950/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className={`h-4 w-4 ${selectedScene.isAudioDemo ? 'text-yellow-600' : 'text-green-600'}`} />
                  <span className={`text-sm ${selectedScene.isAudioDemo ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-700 dark:text-green-300'}`}>
                    {selectedScene.isAudioDemo ? 'Демо озвучка готова' : 'Озвучка готова (ElevenLabs)'}
                  </span>
                  {selectedScene.audioDuration && (
                    <span className={`text-sm ${selectedScene.isAudioDemo ? 'text-yellow-600' : 'text-green-600'}`}>
                      ({formatDuration(selectedScene.audioDuration)})
                    </span>
                  )}
                  {selectedScene.isAudioDemo && (
                    <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                      ДЕМО
                    </Badge>
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => selectedScene.audioUrl && playAudio(selectedScene.audioUrl)}
                  disabled={!selectedScene.audioUrl}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Прослушать
                </Button>
              </div>
              {selectedScene.isAudioDemo && (
                <p className="text-xs text-yellow-600 mt-2">
                  ⚠️ Используется демонстрационный звук. Включите ElevenLabs в настройках для AI озвучки.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Озвучка не создана. Добавьте текст и нажмите "Сгенерировать озвучку".
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Откройте консоль браузера (F12) для детального логирования процесса TTS
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}