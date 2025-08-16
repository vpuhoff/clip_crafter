import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Image, Video, Headphones } from 'lucide-react'
import { MediaFile } from '../types'
import { toast } from 'sonner'

interface MediaPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  media: MediaFile | null
}

export const MediaPreviewDialog: React.FC<MediaPreviewDialogProps> = ({
  isOpen,
  onClose,
  media
}) => {
  if (!media) return null

  const getMediaTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return 'Изображение'
      case 'video': return 'Видео'
      case 'audio': return 'Аудио'
      default: return 'Файл'
    }
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': 
        return <Image className="h-5 w-5 text-blue-500" />
      case 'video': 
        return <Video className="h-5 w-5 text-purple-500" />
      case 'audio': 
        return <Headphones className="h-5 w-5 text-green-500" />
      default: 
        return <Image className="h-5 w-5 text-gray-500" />
    }
  }

  const getPreviewDescription = (type: string) => {
    switch (type) {
      case 'image': return 'Предварительный просмотр изображения'
      case 'video': return 'Предварительный просмотр видео'
      case 'audio': return 'Предварительный просмотр аудио'
      default: return 'Предварительный просмотр файла'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getMediaIcon(media.type)}
            Просмотр: {media.originalName || media.fileName}
          </DialogTitle>
          <DialogDescription>
            {getPreviewDescription(media.type)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4">
          {media.type === 'image' ? (
            <img 
              src={media.url} 
              alt={media.originalName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              onError={(e) => {
                console.error('Error loading image:', e)
                toast.error('Ошибка при загрузке изображения')
              }}
            />
          ) : media.type === 'video' ? (
            <video 
              src={media.url} 
              controls 
              className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
              onError={(e) => {
                console.error('Error loading video:', e)
                toast.error('Ошибка при загрузке видео')
              }}
            >
              Ваш браузер не поддерживает воспроизведение видео.
            </video>
          ) : media.type === 'audio' ? (
            <div className="flex flex-col items-center gap-4 p-8">
              <div className="w-32 h-32 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Headphones className="h-16 w-16 text-green-500" />
              </div>
              <audio 
                src={media.url} 
                controls 
                className="w-full max-w-md"
                onError={(e) => {
                  console.error('Error loading audio:', e)
                  toast.error('Ошибка при загрузке аудио')
                }}
              >
                Ваш браузер не поддерживает воспроизведение аудио.
              </audio>
              <p className="text-sm text-muted-foreground text-center">
                {media.originalName || media.fileName}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <p>Предварительный просмотр недоступен для данного типа файла</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Тип: {getMediaTypeLabel(media.type)}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (media.url) {
                  window.open(media.url, '_blank')
                }
              }}
            >
              Открыть в новой вкладке
            </Button>
            <Button onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}