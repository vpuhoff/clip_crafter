import React, { useState, useEffect } from 'react'
import { DEFAULT_VOICE_SETTINGS, DEFAULT_TTS_SETTINGS } from './constants'
import { ProjectSettings } from './types'
import { useDarkMode } from './hooks/useDarkMode'
import { useProject } from './hooks/useProject'
import { useGlobalSettings } from './hooks/useGlobalSettings'
import { StartView } from './components/StartView'
import { EditorView } from './components/EditorView'
import { projectId, publicAnonKey } from './utils/supabase/info'

export default function App() {
  const [currentView, setCurrentView] = useState<'start' | 'editor'>('start')
  const [scenarioText, setScenarioText] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  
  // Dark mode
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  
  // Global settings
  const { globalSettings, updateGlobalSettings } = useGlobalSettings()
  
  // Project management
  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-766e6542`
  const {
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    currentProjectId,
    setCurrentProjectId,
    projects,
    isLoading,
    isTTSLoading,
    isExporting,
    ttsError,
    loadProjects,
    createProject,
    saveProject,
    loadProject,
    deleteProject,
    exportProject,
    updateSceneText,
    updateSceneTitle,
    updateSceneDescription,
    updateSceneNarratorDescription,
    updateSceneSpeed,
    toggleSceneCompleted,
    addNewScene,
    deleteScene,
    reorderScenes,
    uploadMedia,
    removeMedia,
    generateTTS,
    clearTtsError,
    playAudio
  } = useProject(apiUrl, publicAnonKey)
  
  // Project settings state
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    voiceSettings: DEFAULT_VOICE_SETTINGS,
    ttsSettings: DEFAULT_TTS_SETTINGS
  })

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Wrapped functions to handle state transitions
  const handleCreateProject = async () => {
    const result = await createProject(scenarioText, projectTitle)
    if (result) {
      setCurrentView('editor')
      if (!projectTitle) {
        setProjectTitle(`Проект ${new Date().toLocaleDateString()}`)
      }
    }
  }

  const handleLoadProject = async (projectId: string) => {
    const result = await loadProject(projectId)
    if (result) {
      setProjectTitle(result.project.title)
      if (result.project.settings) {
        setProjectSettings({
          ...result.project.settings,
          ttsSettings: {
            useElevenLabs: result.project.settings.ttsSettings?.useElevenLabs ?? false,
            forceDemo: result.project.settings.ttsSettings?.forceDemo ?? false
          }
        })
      }
      setCurrentView('editor')
    }
  }

  const handleSaveProject = () => {
    saveProject(projectTitle, projectSettings)
  }

  const handleGenerateTTS = (sceneId: string) => {
    generateTTS(sceneId, projectSettings)
  }

  if (currentView === 'start') {
    return (
      <StartView
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        scenarioText={scenarioText}
        setScenarioText={setScenarioText}
        projectTitle={projectTitle}
        setProjectTitle={setProjectTitle}
        projects={projects}
        isLoading={isLoading}
        loadProjects={loadProjects}
        createProject={handleCreateProject}
        loadProject={handleLoadProject}
        deleteProject={deleteProject}
        globalSettings={globalSettings}
        updateGlobalSettings={updateGlobalSettings}
      />
    )
  }

  return (
    <EditorView
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      projectTitle={projectTitle}
      setProjectTitle={setProjectTitle}
      scenes={scenes}
      selectedScene={selectedScene}
      projectSettings={projectSettings}
      setProjectSettings={setProjectSettings}
      isLoading={isLoading}
      isTTSLoading={isTTSLoading}
      isExporting={isExporting}
      saveProject={handleSaveProject}
      exportProject={exportProject}
      onBackToStart={() => setCurrentView('start')}
      selectedSceneId={selectedSceneId}
      setSelectedSceneId={setSelectedSceneId}
      addNewScene={addNewScene}
      deleteScene={deleteScene}
      updateSceneText={updateSceneText}
      updateSceneTitle={updateSceneTitle}
      updateSceneDescription={updateSceneDescription}
      updateSceneNarratorDescription={updateSceneNarratorDescription}
      updateSceneSpeed={updateSceneSpeed}
      toggleSceneCompleted={toggleSceneCompleted}
      reorderScenes={reorderScenes}
      uploadMedia={uploadMedia}
      removeMedia={removeMedia}
      generateTTS={handleGenerateTTS}
      ttsError={ttsError}
      clearTtsError={clearTtsError}
      playAudio={playAudio}
      globalSettings={globalSettings}
      updateGlobalSettings={updateGlobalSettings}
    />
  )
}