import React from 'react'
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ProjectSettings, VoiceSettings, TTSSettings, GlobalSettings } from '../types'
import { TTSSettingsTab } from './settings/TTSSettingsTab'
import { VoiceSettingsTab } from './settings/VoiceSettingsTab'
import { GeneralSettingsTab } from './settings/GeneralSettingsTab'

interface SettingsDialogProps {
  projectSettings: ProjectSettings
  setProjectSettings: (settings: ProjectSettings) => void
  globalSettings?: GlobalSettings
  updateGlobalSettings?: (settings: Partial<GlobalSettings>) => void
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  projectSettings,
  setProjectSettings,
  globalSettings,
  updateGlobalSettings
}) => {
  const updateVoiceSettings = (newVoiceSettings: Partial<VoiceSettings>) => {
    setProjectSettings({
      ...projectSettings,
      voiceSettings: {
        ...projectSettings.voiceSettings,
        ...newVoiceSettings
      }
    })
  }

  const updateTTSSettings = (newTTSSettings: Partial<TTSSettings>) => {
    setProjectSettings({
      ...projectSettings,
      ttsSettings: {
        ...projectSettings.ttsSettings,
        ...newTTSSettings
      }
    })
  }

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Настройки проекта</DialogTitle>
        <DialogDescription>
          Настройте параметры озвучки и другие опции проекта
        </DialogDescription>
      </DialogHeader>
      
      <Tabs defaultValue="tts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tts">TTS Движок</TabsTrigger>
          <TabsTrigger value="voice">Голос</TabsTrigger>
          <TabsTrigger value="general">Общие</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tts">
          <TTSSettingsTab
            ttsSettings={projectSettings.ttsSettings}
            updateTTSSettings={updateTTSSettings}
          />
        </TabsContent>
        
        <TabsContent value="voice">
          <VoiceSettingsTab
            voiceSettings={projectSettings.voiceSettings}
            updateVoiceSettings={updateVoiceSettings}
            customVoices={globalSettings?.customVoices || []}
          />
        </TabsContent>

        <TabsContent value="general">
          <GeneralSettingsTab />
        </TabsContent>
      </Tabs>
    </DialogContent>
  )
}