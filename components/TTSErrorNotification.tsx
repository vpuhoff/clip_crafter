import React from 'react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Settings, AlertTriangle, Zap, Info } from 'lucide-react'

interface TTSErrorNotificationProps {
  isVisible: boolean
  error?: string | null
  onOpenSettings: () => void
  onDismiss: () => void
}

export const TTSErrorNotification: React.FC<TTSErrorNotificationProps> = ({
  isVisible,
  error,
  onOpenSettings,
  onDismiss
}) => {
  if (!isVisible || !error) return null

  const getErrorInfo = (errorMessage: string) => {
    if (errorMessage.includes('quota_exceeded') || errorMessage.includes('Квота')) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        title: 'Квота ElevenLabs исчерпана',
        description: 'У вас недостаточно кредитов ElevenLabs для генерации озвучки. Система автоматически переключилась на демо режим.',
        variant: 'default' as const,
        showSettings: true,
        badge: 'КВОТА'
      }
    }

    if (errorMessage.includes('API ключ') || errorMessage.includes('API key')) {
      return {
        icon: <Settings className="h-4 w-4" />,
        title: 'API ключ не настроен',
        description: 'Для использования ElevenLabs необходимо настроить API ключ в настройках проекта.',
        variant: 'default' as const,
        showSettings: true,
        badge: 'НАСТРОЙКА'
      }
    }

    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        title: 'Ошибка авторизации ElevenLabs',
        description: 'Проверьте правильность API ключа ElevenLabs в настройках.',
        variant: 'destructive' as const,
        showSettings: true,
        badge: 'АВТОРИЗАЦИЯ'
      }
    }

    return {
      icon: <Info className="h-4 w-4" />,
      title: 'Ошибка генерации озвучки',
      description: 'Произошла ошибка при генерации озвучки. Система автоматически переключилась на демо режим.',
      variant: 'default' as const,
      showSettings: false,
      badge: 'ОШИБКА'
    }
  }

  const errorInfo = getErrorInfo(error)

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert variant={errorInfo.variant} className="shadow-lg">
        <div className="flex items-start gap-3">
          {errorInfo.icon}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTitle className="text-sm">{errorInfo.title}</AlertTitle>
              <Badge variant="secondary" className="text-xs">
                {errorInfo.badge}
              </Badge>
            </div>
            <AlertDescription className="text-sm">
              {errorInfo.description}
            </AlertDescription>
            <div className="flex items-center gap-2 mt-3">
              {errorInfo.showSettings && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onOpenSettings}
                  className="h-7 text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Настройки
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onDismiss}
                className="h-7 text-xs"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    </div>
  )
}