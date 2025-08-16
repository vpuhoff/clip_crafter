import React from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Sun, Moon, Settings, Save, Download, Loader2, Clock, CheckCircle2, Zap, Cpu } from 'lucide-react'
import { Scene, ProjectSettings, GlobalSettings } from '../types'
import { getTotalDuration, getCompletionStats } from '../utils/helpers'
import { getTTSModeDisplay } from '../utils/tts'
import { ScenesList } from './ScenesList'
import { SceneEditor } from './SceneEditor'
import { MediaPanel } from './MediaPanel'
import { SettingsDialog } from './SettingsDialog'
import { MediaPreviewDialog } from './MediaPreviewDialog'
import { TTSErrorNotification } from './TTSErrorNotification'

interface EditorViewProps {
  isDarkMode: boolean
  toggleDarkMode: () => void
  projectTitle: string
  setProjectTitle: (title: string) => void
  scenes: Scene[]
  selectedScene: Scene | undefined
  projectSettings: ProjectSettings
  setProjectSettings: (settings: ProjectSettings) => void
  isLoading: boolean
  isTTSLoading: boolean
  isExporting: boolean
  saveProject: () => void
  exportProject: () => void
  onBackToStart: () => void
  // Scene management
  selectedSceneId: string | null
  setSelectedSceneId: (id: string | null) => void
  addNewScene: () => void
  deleteScene: (id: string) => void
  updateSceneText: (id: string, text: string) => void
  updateSceneTitle: (id: string, title: string) => void
  updateSceneDescription: (id: string, description: string) => void
  updateSceneNarratorDescription: (id: string, description: string) => void
  updateSceneSpeed: (id: string, speed: number) => void
  toggleSceneCompleted: (id: string) => void
  reorderScenes: (draggedIndex: number, dropIndex: number) => void
  // Media management
  uploadMedia: (sceneId: string, file: File) => void
  removeMedia: (sceneId: string, fileName: string) => void
  generateTTS: (sceneId: string) => void
  // TTS Error handling
  ttsError: string | null
  clearTtsError: () => void
  playAudio: (audioUrl: string) => void
  // Global settings
  globalSettings?: GlobalSettings
  updateGlobalSettings?: (settings: Partial<GlobalSettings>) => void
}

export const EditorView: React.FC<EditorViewProps> = ({
  isDarkMode,
  toggleDarkMode,
  projectTitle,
  setProjectTitle,
  scenes,
  selectedScene,
  projectSettings,
  setProjectSettings,
  isLoading,
  isTTSLoading,
  isExporting,
  saveProject,
  exportProject,
  onBackToStart,
  selectedSceneId,
  setSelectedSceneId,
  addNewScene,
  deleteScene,
  updateSceneText,
  updateSceneTitle,
  updateSceneDescription,
  updateSceneNarratorDescription,
  updateSceneSpeed,
  toggleSceneCompleted,
  reorderScenes,
  uploadMedia,
  removeMedia,
  generateTTS,
  ttsError,
  clearTtsError,
  playAudio,
  globalSettings,
  updateGlobalSettings
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
  const [previewMedia, setPreviewMedia] = React.useState<any>(null)
  const [isMediaPreviewOpen, setIsMediaPreviewOpen] = React.useState(false)

  const completionStats = getCompletionStats(scenes)



  const openMediaPreview = (media: any) => {
    setPreviewMedia(media)
    setIsMediaPreviewOpen(true)
  }

  const closeMediaPreview = () => {
    setPreviewMedia(null)
    setIsMediaPreviewOpen(false)
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={onBackToStart}
            >
              ← Назад
            </Button>
            <div>
              <Input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="text-lg font-semibold border-none shadow-none p-0 h-auto bg-transparent"
              />
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{scenes.length} сцен</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{getTotalDuration(scenes)}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{completionStats.completed}/{completionStats.total} готово</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {projectSettings.ttsSettings.useElevenLabs ? (
                    <Zap className="h-3 w-3 text-blue-500" />
                  ) : (
                    <Cpu className="h-3 w-3 text-yellow-500" />
                  )}
                  <span>{getTTSModeDisplay(projectSettings.ttsSettings)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Theme Toggle */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleDarkMode}
              className="transition-all duration-300"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Settings Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Настройки
                </Button>
              </DialogTrigger>
              <SettingsDialog 
                projectSettings={projectSettings}
                setProjectSettings={setProjectSettings}
                globalSettings={globalSettings}
                updateGlobalSettings={updateGlobalSettings}
              />
            </Dialog>

            <Button onClick={saveProject} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Сохранить
            </Button>
            <Button onClick={exportProject} variant="outline" disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Экспорт...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Scenes List */}
        <ScenesList
          scenes={scenes}
          selectedSceneId={selectedSceneId}
          setSelectedSceneId={setSelectedSceneId}
          addNewScene={addNewScene}
          deleteScene={deleteScene}
          reorderScenes={reorderScenes}
        />

        {/* Main Editor */}
        <div className="flex-1 flex">
          {/* Scene Editor */}
          <SceneEditor
            selectedScene={selectedScene}
            updateSceneText={updateSceneText}
            updateSceneTitle={updateSceneTitle}
            updateSceneDescription={updateSceneDescription}
            updateSceneNarratorDescription={updateSceneNarratorDescription}
            updateSceneSpeed={updateSceneSpeed}
            toggleSceneCompleted={toggleSceneCompleted}
            generateTTS={generateTTS}
            projectSettings={projectSettings}
            isTTSLoading={isTTSLoading}
            playAudio={playAudio}
          />

          {/* Media Panel */}
          <MediaPanel
            selectedScene={selectedScene}
            uploadMedia={uploadMedia}
            removeMedia={removeMedia}
            openMediaPreview={openMediaPreview}
          />
        </div>
      </div>

      {/* Media Preview Dialog */}
      <MediaPreviewDialog
        isOpen={isMediaPreviewOpen}
        onClose={closeMediaPreview}
        media={previewMedia}
      />

      {/* TTS Error Notification */}
      <TTSErrorNotification
        isVisible={!!ttsError}
        error={ttsError}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDismiss={clearTtsError}
      />
    </div>
  )
}