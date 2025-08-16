import React from 'react'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Upload, Eye, Trash2, Image, Video, Headphones } from 'lucide-react'
import { Scene, MediaFile } from '../types'
import { MAX_FILE_SIZE } from '../constants'
import { toast } from 'sonner'

interface MediaPanelProps {
  selectedScene: Scene | undefined
  uploadMedia: (sceneId: string, file: File) => void
  removeMedia: (sceneId: string, fileName: string) => void
  openMediaPreview: (media: MediaFile) => void
}

export const MediaPanel: React.FC<MediaPanelProps> = ({
  selectedScene,
  uploadMedia,
  removeMedia,
  openMediaPreview
}) => {
  const handleFileUpload = (sceneId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Размер файла не должен превышать 10МБ')
        return
      }
      uploadMedia(sceneId, file)
    }
  }

  const getMediaTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return 'Изображение'
      case 'video': return 'Видео'
      case 'audio': return 'Аудио'
      default: return 'Файл'
    }
  }

  const renderMediaIcon = (media: MediaFile) => {
    switch (media.type) {
      case 'image':
        return (
          <div className="relative w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded overflow-hidden">
            <img 
              src={media.url} 
              alt={media.originalName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none'
              }}
            />
            <Image className="absolute inset-0 m-auto h-6 w-6 text-blue-500" />
          </div>
        )
      case 'video':
        return (
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center">
            <Video className="h-6 w-6 text-purple-500" />
          </div>
        )
      case 'audio':
        return (
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center">
            <Headphones className="h-6 w-6 text-green-500" />
          </div>
        )
      default:
        return (
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900/30 rounded flex items-center justify-center">
            <Upload className="h-6 w-6 text-gray-500" />
          </div>
        )
    }
  }

  return (
    <div className="w-80 bg-card border-l">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Медиафайлы</h2>
      </div>
      
      {selectedScene ? (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Загрузить файлы
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => handleFileUpload(selectedScene.id, e)}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className="flex items-center justify-center w-full p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-foreground">
                  Нажмите для загрузки
                </p>
                <p className="text-xs text-muted-foreground">
                  Изображения или видео (макс. 10МБ)
                </p>
              </div>
            </label>
          </div>

          {selectedScene.media.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Загруженные файлы ({selectedScene.media.length})
              </label>
              <div className="space-y-2">
                {selectedScene.media.map((media) => (
                  <div
                    key={media.fileName}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    {/* Media Preview Thumbnail */}
                    <div className="flex-shrink-0">
                      {renderMediaIcon(media)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={media.originalName}>
                        {media.originalName || media.fileName.split('-').slice(2).join('-')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getMediaTypeLabel(media.type)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openMediaPreview(media)}
                        className="p-1.5 h-auto"
                      >
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMedia(selectedScene.id, media.fileName)}
                        className="p-1.5 h-auto"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 Советы:</p>
            <p>• Откройте консоль браузера (F12) для детального логирования TTS</p>
            <p>• Переключите TTS режим в настройках: ElevenLabs AI или Демо</p>
            <p>• Новая сцена добавляется перед выбранной</p>
            <p>• Перетащите сцены в списке для изменения порядка</p>
            <p>• Зеленый цвет времени - реальная длительность озвучки</p>
            <p>• Желтый цвет озвучки - демо режим</p>
            <p>• Используйте чекбокс "Сцена готова" для отслеживания прогресса</p>
            <p>• Иконки показывают статус: 🎵 озвучка, 💬 описание диктора, 🖼 фото, 📹 видео, 📊 скорость</p>
            <p>• Настройте скорость видео для каждой сцены (0.5x - 2x)</p>
            <p>• Используйте настройки проекта для глобальных параметров озвучки</p>
            <p>• Добавляйте индивидуальные описания диктора для отдельных сцен</p>
            <p>• Нажмите на иконку глаза для просмотра медиафайлов</p>
            <p>• ElevenLabs обеспечивает профессиональное качество озвучки</p>
            <p>• Поддерживаемые форматы: JPG, PNG, MP4, MOV, AVI</p>
            <p>• Максимальный размер файла: 10МБ</p>
            <p>• Аудио файлы озвучки автоматически добавляются в медиафайлы</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p className="text-sm">Выберите сцену</p>
        </div>
      )}
    </div>
  )
}