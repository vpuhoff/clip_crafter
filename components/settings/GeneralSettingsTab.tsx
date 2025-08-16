import React from 'react'
import { Settings } from 'lucide-react'

export const GeneralSettingsTab: React.FC = () => {
  return (
    <div className="text-center text-muted-foreground py-8">
      <Settings className="h-12 w-12 mx-auto mb-4" />
      <p>Дополнительные настройки будут добавлены в будущих версиях</p>
    </div>
  )
}