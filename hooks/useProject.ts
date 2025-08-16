import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Scene, Project, ProjectSettings, MediaFile } from '../types'
import { DEFAULT_SCENE_SPEED } from '../constants'

export const useProject = (apiUrl: string, publicAnonKey: string) => {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTTSLoading, setIsTTSLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [ttsError, setTtsError] = useState<string | null>(null)

  const selectedScene = scenes.find(scene => scene.id === selectedSceneId)

  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/projects`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      })
      const data = await response.json()
      if (data.projects) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }, [apiUrl, publicAnonKey])

  const createProject = useCallback(async (scenarioText: string, projectTitle: string) => {
    if (!scenarioText.trim()) {
      toast.error('Пожалуйста, введите текст сценария')
      return null
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/parse-scenario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ text: scenarioText })
      })

      const data = await response.json()
      if (data.scenes) {
        const scenesWithDefaults = data.scenes.map((scene: any) => ({
          id: scene.id || `scene-${Date.now()}-${Math.random()}`,
          title: scene.title || 'Новая сцена',
          text: scene.text || '',
          description: scene.description || '',
          narratorDescription: scene.narratorDescription || '',
          media: scene.media || [],
          audioUrl: scene.audioUrl || null,
          audioDuration: scene.audioDuration ?? null,
          isCompleted: scene.isCompleted ?? false,
          speed: scene.speed ?? DEFAULT_SCENE_SPEED,
          recommendedSpeed: scene.recommendedSpeed ?? undefined,
          isAudioDemo: scene.isAudioDemo ?? false
        }))
        setScenes(scenesWithDefaults)
        setSelectedSceneId(scenesWithDefaults[0]?.id || null)
        setCurrentProjectId(`project-${Date.now()}`)
        toast.success(`Создано ${data.scenes.length} сцен`)
        return scenesWithDefaults
      } else {
        toast.error('Ошибка при разборе сценария')
        return null
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Ошибка при создании проекта')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [apiUrl, publicAnonKey])

  const saveProject = useCallback(async (projectTitle: string, projectSettings: ProjectSettings) => {
    if (!currentProjectId) return

    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/save-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          title: projectTitle,
          scenes,
          settings: projectSettings
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Проект сохранен')
        loadProjects()
      } else {
        toast.error('Ошибка при сохранении')
      }
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error('Ошибка при сохранении проекта')
    } finally {
      setIsLoading(false)
    }
  }, [apiUrl, publicAnonKey, currentProjectId, scenes, loadProjects])

  const loadProject = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`${apiUrl}/load-project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      })
      const data = await response.json()
      if (data.project) {
        const project = data.project
        const loadedScenes = project.scenes.map((scene: any) => ({
          id: scene.id || `scene-${Date.now()}-${Math.random()}`,
          title: scene.title || 'Сцена',
          text: scene.text || '',
          description: scene.description || '',
          narratorDescription: scene.narratorDescription ?? '',
          media: Array.isArray(scene.media) ? scene.media : [],
          audioUrl: scene.audioUrl || null,
          audioDuration: scene.audioDuration ?? null,
          isCompleted: scene.isCompleted ?? false,
          speed: scene.speed ?? DEFAULT_SCENE_SPEED,
          recommendedSpeed: scene.recommendedSpeed ?? undefined,
          isAudioDemo: scene.isAudioDemo ?? false
        }))
        setScenes(loadedScenes)
        setSelectedSceneId(project.scenes[0]?.id || null)
        setCurrentProjectId(project.id)
        toast.success('Проект загружен')
        return { project: { ...project, scenes: loadedScenes } }
      }
    } catch (error) {
      console.error('Error loading project:', error)
      toast.error('Ошибка при загрузке проекта')
    }
    return null
  }, [apiUrl, publicAnonKey])

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`${apiUrl}/delete-project/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      })
      
      if (response.ok) {
        toast.success('Проект удален')
        loadProjects()
      } else {
        toast.error('Ошибка при удалении')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Ошибка при удалении проекта')
    }
  }, [apiUrl, publicAnonKey, loadProjects])

  const exportProject = useCallback(async () => {
    if (!currentProjectId) return

    setIsExporting(true)
    try {
      const response = await fetch(`${apiUrl}/export-project/${currentProjectId}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      })
      
      const data = await response.json()
      if (data.success) {
        const link = document.createElement('a')
        link.href = data.downloadUrl
        link.download = data.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.success('Проект экспортирован')
      } else {
        toast.error('Ошибка при экспорте')
      }
    } catch (error) {
      console.error('Error exporting project:', error)
      toast.error('Ошибка при экспорте проекта')
    } finally {
      setIsExporting(false)
    }
  }, [apiUrl, publicAnonKey, currentProjectId])

  // Scene management functions
  const updateSceneText = useCallback((sceneId: string, newText: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, text: newText } : scene
    ))
  }, [])

  const updateSceneTitle = useCallback((sceneId: string, newTitle: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, title: newTitle } : scene
    ))
  }, [])

  const updateSceneDescription = useCallback((sceneId: string, newDescription: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, description: newDescription } : scene
    ))
  }, [])

  const updateSceneNarratorDescription = useCallback((sceneId: string, newNarratorDescription: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, narratorDescription: newNarratorDescription } : scene
    ))
  }, [])

  const updateSceneSpeed = useCallback((sceneId: string, newSpeed: number) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, speed: newSpeed } : scene
    ))
  }, [])

  const toggleSceneCompleted = useCallback((sceneId: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, isCompleted: !scene.isCompleted } : scene
    ))
  }, [])

  const addNewScene = useCallback(() => {
    const selectedIndex = selectedSceneId ? scenes.findIndex(scene => scene.id === selectedSceneId) : -1
    const insertIndex = selectedIndex !== -1 ? selectedIndex : scenes.length
    const sceneNumber = insertIndex + 1
    
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      title: `Новая сцена ${sceneNumber}`,
      text: '',
      description: '',
      narratorDescription: '',
      media: [],
      audioUrl: null,
      audioDuration: null,
      isCompleted: false,
      speed: DEFAULT_SCENE_SPEED,
      isAudioDemo: false
    }
    
    setScenes(prev => {
      const newScenes = [...prev]
      newScenes.splice(insertIndex, 0, newScene)
      return newScenes
    })
    
    setSelectedSceneId(newScene.id)
    
    if (selectedIndex !== -1) {
      toast.success(`Новая сцена добавлена перед сценой ${insertIndex + 1}`)
    } else {
      toast.success('Новая сцена добавлена в конец')
    }
  }, [selectedSceneId, scenes])

  const deleteScene = useCallback((sceneId: string) => {
    setScenes(prev => prev.filter(scene => scene.id !== sceneId))
    if (selectedSceneId === sceneId) {
      const remainingScenes = scenes.filter(scene => scene.id !== sceneId)
      setSelectedSceneId(remainingScenes[0]?.id || null)
    }
  }, [selectedSceneId, scenes])

  const reorderScenes = useCallback((draggedIndex: number, dropIndex: number) => {
    const newScenes = [...scenes]
    const draggedScene = newScenes[draggedIndex]
    newScenes.splice(draggedIndex, 1)
    newScenes.splice(dropIndex, 0, draggedScene)
    setScenes(newScenes)
    toast.success('Порядок сцен изменен')
  }, [scenes])

  // Media functions
  const uploadMedia = useCallback(async (sceneId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sceneId', sceneId)

    try {
      const response = await fetch(`${apiUrl}/upload-media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        body: formData
      })

      const data = await response.json()
      if (data.fileName) {
        const mediaFile: MediaFile = {
          fileName: data.fileName,
          url: data.url,
          type: data.type,
          originalName: data.originalName || file.name
        }

        setScenes(prev => prev.map(scene => 
          scene.id === sceneId 
            ? { ...scene, media: [...scene.media, mediaFile] }
            : scene
        ))
        toast.success('Файл загружен')
      }
    } catch (error) {
      console.error('Error uploading media:', error)
      toast.error('Ошибка при загрузке файла')
    }
  }, [apiUrl, publicAnonKey])

  const removeMedia = useCallback((sceneId: string, fileName: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId 
        ? { ...scene, media: scene.media.filter(m => m.fileName !== fileName) }
        : scene
    ))
  }, [])

  // TTS function
  const generateTTS = useCallback(async (sceneId: string, projectSettings: ProjectSettings) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene || !scene.text.trim()) {
      toast.error('Добавьте текст для генерации озвучки')
      return
    }

    console.log('🎤 TTS Generation started for scene:', sceneId)
    console.log('📝 Text length:', scene.text.length, 'characters')
    console.log('⚙️ TTS Settings:', projectSettings.ttsSettings)
    console.log('🎭 Voice Settings:', projectSettings.voiceSettings)

    const ttsMode = projectSettings.ttsSettings.forceDemo 
      ? 'Force Demo' 
      : projectSettings.ttsSettings.useElevenLabs 
        ? 'ElevenLabs' 
        : 'Auto Demo'
    
    console.log('🔧 TTS Mode:', ttsMode)

    setIsTTSLoading(true)
    try {
      const requestBody = {
        text: scene.text,
        sceneId: sceneId,
        voiceSettings: projectSettings.voiceSettings,
        sceneNarratorDescription: scene.narratorDescription,
        ttsSettings: projectSettings.ttsSettings
      }

      console.log('📤 Sending TTS request:', requestBody)

      const response = await fetch(`${apiUrl}/generate-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📥 TTS Response status:', response.status)

      const data = await response.json()
      console.log('📋 TTS Response data:', data)

      if (data.error) {
        console.error('❌ TTS generation error:', data.error)
        setTtsError(data.error)
        toast.error(`Ошибка генерации озвучки: ${data.error}`)
        return
      }

      if (data.audioUrl) {
        console.log('✅ TTS generation successful!')
        console.log('🔊 Audio URL:', data.audioUrl.substring(0, 50) + '...')
        console.log('⏱️ Duration:', data.duration, 'seconds')
        console.log('🎭 Is Demo:', data.isDemo)

        setScenes(prev => prev.map(s => {
          if (s.id === sceneId) {
            const updatedScene = { 
              ...s, 
              audioUrl: data.audioUrl,
              audioDuration: data.duration || null,
              isAudioDemo: data.isDemo || false
            }
            
            // Автоматически добавляем аудио файл в медиафайлы
            const audioFileName = `audio_${sceneId}_${Date.now()}.mp3`
            const audioMediaFile: MediaFile = {
              fileName: audioFileName,
              url: data.audioUrl,
              type: 'audio',
              originalName: `Озвучка ${updatedScene.title}.mp3`
            }
            
            // Проверяем, нет ли уже аудио файла с таким именем
            const hasExistingAudio = updatedScene.media.some(media => 
              media.type === 'audio' && media.originalName?.includes('Озвучка'))
            
            if (!hasExistingAudio) {
              updatedScene.media = [...updatedScene.media, audioMediaFile]
            }
            
            return updatedScene
          }
          return s
        }))
        
        if (data.isDemo) {
          // Если озвучка в демо режиме из-за ошибки, показываем уведомление об ошибке
          if (data.reason && (data.reason.includes('Квота') || data.reason.includes('API ключ') || data.reason.includes('401'))) {
            setTtsError(data.reason)
          }
          toast.success('Озвучка создана (демо режим)', {
            description: data.reason || 'Используется демонстрационный звук'
          })
        } else {
          // Успешное использование ElevenLabs - сбрасываем ошибку
          setTtsError(null)
          toast.success('Озвучка сгенерирована через ElevenLabs AI', {
            description: `Длительность: ${data.duration}с`
          })
        }
      } else {
        console.error('❌ Empty response from server')
        toast.error('Получен пустой ответ от сервера')
      }
    } catch (error) {
      console.error('💥 Error generating TTS:', error)
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      setTtsError(errorMessage)
      toast.error('Ошибка при генерации озвучки')
    } finally {
      setIsTTSLoading(false)
      console.log('🏁 TTS generation completed')
    }
  }, [apiUrl, publicAnonKey, scenes])

  // Функция для сброса ошибки TTS
  const clearTtsError = useCallback(() => {
    setTtsError(null)
  }, [])

  // Функция для воспроизведения аудио
  const playAudio = useCallback((audioUrl: string) => {
    try {
      const audio = new Audio(audioUrl)
      audio.play().catch(error => {
        console.error('Error playing audio:', error)
        toast.error('Ошибка при воспроизведении аудио')
      })
    } catch (error) {
      console.error('Error creating audio element:', error)
      toast.error('Ошибка при создании аудио элемента')
    }
  }, [])

  return {
    // State
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
    
    // Functions
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
  }
}