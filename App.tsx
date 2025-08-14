import React, { useState, useEffect } from 'react'
import { Button } from './components/ui/button'
import { Textarea } from './components/ui/textarea'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Badge } from './components/ui/badge'
import { Separator } from './components/ui/separator'
import { ScrollArea } from './components/ui/scroll-area'
import { Checkbox } from './components/ui/checkbox'
import { Slider } from './components/ui/slider'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './components/ui/alert-dialog'
import { toast } from 'sonner'
import { 
  PlayCircle, 
  Upload, 
  Download, 
  Save, 
  FileText, 
  Image, 
  Video, 
  Volume2,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  FolderOpen,
  Settings,
  FileDown,
  RefreshCw,
  GripVertical,
  Clock,
  CheckCircle2,
  Circle,
  Gauge,
  TrendingUp
} from 'lucide-react'
import { projectId, publicAnonKey } from './utils/supabase/info'

interface Scene {
  id: string
  title: string
  text: string
  description: string
  media: MediaFile[]
  audioUrl: string | null
  audioDuration: number | null // duration in seconds
  isCompleted: boolean
  recommendedSpeed?: number // рекомендуемая скорость видео от системы (1-10)
  speed: number // пользовательская скорость видео (1-10)
}

interface MediaFile {
  fileName: string
  url: string
  type: 'image' | 'video'
  originalName?: string // For display purposes
}

interface Project {
  id: string
  title: string
  scenes: Scene[]
  createdAt: string
  updatedAt: string
}

export default function App() {
  const [currentView, setCurrentView] = useState<'start' | 'editor'>('start')
  const [scenarioText, setScenarioText] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [scenes, setScenes] = useState<Scene[]>([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTTSLoading, setIsTTSLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-766e6542`

  useEffect(() => {
    loadProjects()
  }, [])

  const selectedScene = scenes.find(scene => scene.id === selectedSceneId)

  // Format seconds to MM:SS format
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Calculate scene duration - use actual audio duration if available, otherwise estimate from text
  const calculateSceneDuration = (scene: Scene): string => {
    // If we have actual audio duration, use it
    if (scene.audioDuration !== null && scene.audioDuration !== undefined) {
      return formatDuration(scene.audioDuration)
    }

    // Otherwise, calculate from text
    if (!scene.text || scene.text.trim().length === 0) {
      return '0:00'
    }
    
    // Count words (split by whitespace and filter empty strings)
    const words = scene.text.trim().split(/\s+/).filter(word => word.length > 0)
    const wordCount = words.length
    
    // Average reading speed for voice-over is about 180 words per minute
    const wordsPerMinute = 180
    const durationMinutes = wordCount / wordsPerMinute
    
    // Convert to minutes and seconds
    const minutes = Math.floor(durationMinutes)
    const seconds = Math.round((durationMinutes - minutes) * 60)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Calculate total project duration
  const getTotalDuration = (): string => {
    let totalSeconds = 0
    
    scenes.forEach(scene => {
      // Use actual audio duration if available, otherwise estimate
      if (scene.audioDuration !== null && scene.audioDuration !== undefined) {
        totalSeconds += scene.audioDuration
      } else {
        const duration = calculateSceneDuration(scene)
        const [minutes, seconds] = duration.split(':').map(Number)
        totalSeconds += (minutes * 60) + seconds
      }
    })
    
    const totalMinutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60
    
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60)
      const remainingMinutes = totalMinutes % 60
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    
    return `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get completion stats
  const getCompletionStats = () => {
    const completed = scenes.filter(scene => scene.isCompleted).length
    return { completed, total: scenes.length }
  }

  // Get video speed label
  const getVideoSpeedLabel = (speed: number): string => {
    if (speed <= 2) return '0.5x скорость'
    if (speed <= 4) return '0.8x скорость'
    if (speed <= 6) return '1x скорость'
    if (speed <= 8) return '1.5x скорость'
    return '2x скорость'
  }

  // Get video speed multiplier
  const getVideoSpeedMultiplier = (speed: number): number => {
    // Convert speed 1-10 to multiplier 0.5x-2.0x
    return 0.5 + (speed - 1) * (1.5 / 9)
  }

  const loadProjects = async () => {
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
  }

  const createProject = async () => {
    if (!scenarioText.trim()) {
      toast.error('Пожалуйста, введите текст сценария')
      return
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
        setScenes(data.scenes)
        setSelectedSceneId(data.scenes[0]?.id || null)
        setCurrentView('editor')
        setCurrentProjectId(`project-${Date.now()}`)
        if (!projectTitle) {
          setProjectTitle(`Проект ${new Date().toLocaleDateString()}`)
        }
        toast.success(`Создано ${data.scenes.length} сцен`)
      } else {
        toast.error('Ошибка при разборе сценария')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Ошибка при создании проекта')
    } finally {
      setIsLoading(false)
    }
  }

  const saveProject = async () => {
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
          scenes
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
  }

  const exportProject = async () => {
    if (!currentProjectId) return

    setIsExporting(true)
    try {
      const response = await fetch(`${apiUrl}/export-project/${currentProjectId}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      })
      
      const data = await response.json()
      if (data.success) {
        // Create download link
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
  }

  const loadProject = async (projectId: string) => {
    try {
      const response = await fetch(`${apiUrl}/load-project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      })
      const data = await response.json()
      if (data.project) {
        const project = data.project
        setProjectTitle(project.title)
        setScenes(project.scenes.map((scene: Scene) => ({
          ...scene,
          // Ensure backward compatibility for projects without isCompleted and speed
          isCompleted: scene.isCompleted ?? false,
          speed: scene.speed ?? 5, // default video speed is 5 (1x)
          recommendedSpeed: scene.recommendedSpeed // keep as is, might be undefined
        })))
        setSelectedSceneId(project.scenes[0]?.id || null)
        setCurrentProjectId(project.id)
        setCurrentView('editor')
        toast.success('Проект загружен')
      }
    } catch (error) {
      console.error('Error loading project:', error)
      toast.error('Ошибка при загрузке проекта')
    }
  }

  const deleteProject = async (projectId: string) => {
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
  }

  const updateSceneText = (sceneId: string, newText: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, text: newText } : scene
    ))
  }

  const updateSceneTitle = (sceneId: string, newTitle: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, title: newTitle } : scene
    ))
  }

  const updateSceneDescription = (sceneId: string, newDescription: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, description: newDescription } : scene
    ))
  }

  const updateSceneSpeed = (sceneId: string, newSpeed: number) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, speed: newSpeed } : scene
    ))
  }

  const toggleSceneCompleted = (sceneId: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, isCompleted: !scene.isCompleted } : scene
    ))
  }

  const addNewScene = () => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      title: `Новая сцена ${scenes.length + 1}`,
      text: '',
      description: '',
      media: [],
      audioUrl: null,
      audioDuration: null,
      isCompleted: false,
      speed: 5 // default video speed (1x)
    }
    setScenes(prev => [...prev, newScene])
    setSelectedSceneId(newScene.id)
  }

  const deleteScene = (sceneId: string) => {
    setScenes(prev => prev.filter(scene => scene.id !== sceneId))
    if (selectedSceneId === sceneId) {
      const remainingScenes = scenes.filter(scene => scene.id !== sceneId)
      setSelectedSceneId(remainingScenes[0]?.id || null)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDraggedSceneId(sceneId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', sceneId)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're leaving the container, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null)
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (!draggedSceneId) return

    const draggedIndex = scenes.findIndex(scene => scene.id === draggedSceneId)
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedSceneId(null)
      setDragOverIndex(null)
      return
    }

    const newScenes = [...scenes]
    const draggedScene = newScenes[draggedIndex]
    
    // Remove the dragged scene from its current position
    newScenes.splice(draggedIndex, 1)
    
    // Insert it at the new position
    newScenes.splice(dropIndex, 0, draggedScene)
    
    setScenes(newScenes)
    setDraggedSceneId(null)
    setDragOverIndex(null)
    
    toast.success('Порядок сцен изменен')
  }

  const handleDragEnd = () => {
    setDraggedSceneId(null)
    setDragOverIndex(null)
  }

  const uploadMedia = async (sceneId: string, file: File) => {
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
  }

  const generateTTS = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene || !scene.text.trim()) {
      toast.error('Добавьте текст для генерации озвучки')
      return
    }

    setIsTTSLoading(true)
    try {
      const response = await fetch(`${apiUrl}/generate-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          text: scene.text,
          sceneId: sceneId
        })
      })

      const data = await response.json()
      if (data.audioUrl) {
        setScenes(prev => prev.map(s => 
          s.id === sceneId ? { 
            ...s, 
            audioUrl: data.audioUrl,
            audioDuration: data.duration || null
          } : s
        ))
        toast.success('Озвучка сгенерирована')
      }
    } catch (error) {
      console.error('Error generating TTS:', error)
      toast.error('Ошибка при генерации озвучки')
    } finally {
      setIsTTSLoading(false)
    }
  }

  const removeMedia = (sceneId: string, fileName: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId 
        ? { ...scene, media: scene.media.filter(m => m.fileName !== fileName) }
        : scene
    ))
  }

  const handleFileUpload = (sceneId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 10МБ')
        return
      }
      uploadMedia(sceneId, file)
    }
  }

  if (currentView === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl mb-4 text-gray-800">Сценарный редактор</h1>
            <p className="text-xl text-gray-600">
              Создавайте видеоролики на основе текстовых сценариев
            </p>
          </div>

          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Новый проект</TabsTrigger>
              <TabsTrigger value="existing">Существующие проекты</TabsTrigger>
            </TabsList>
            
            <TabsContent value="new" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Создать новый проект
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Название проекта</label>
                    <Input
                      placeholder="Введите название проекта"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Текст сценария</label>
                    <Textarea
                      placeholder="Вставьте или введите ваш сценарий здесь..."
                      value={scenarioText}
                      onChange={(e) => setScenarioText(e.target.value)}
                      rows={12}
                      className="resize-none"
                    />
                  </div>
                  <Button 
                    onClick={createProject} 
                    className="w-full" 
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Создание проекта...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Создать проект
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="existing" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Существующие проекты
                    </CardTitle>
                    <Button onClick={loadProjects} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Обновить
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Пока нет сохраненных проектов
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((project) => (
                        <div 
                          key={project.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium">{project.title}</h3>
                            <p className="text-sm text-gray-500">
                              {project.scenes.length} сцен • {new Date(project.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => loadProject(project.id)}
                            >
                              Открыть
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Это действие нельзя отменить. Проект "{project.title}" будет удален навсегда.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteProject(project.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  const completionStats = getCompletionStats()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentView('start')}
            >
              ← Назад
            </Button>
            <div>
              <Input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="text-lg font-semibold border-none shadow-none p-0 h-auto"
              />
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{scenes.length} сцен</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{getTotalDuration()}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{completionStats.completed}/{completionStats.total} готово</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
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
        <div className="w-80 bg-white border-r">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Сцены</h2>
              <Button onClick={addNewScene} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Перетащите сцены для изменения порядка
            </p>
          </div>
          <ScrollArea className="h-full">
            <div className="p-2">
              {scenes.map((scene, index) => {
                const hasImages = scene.media.some(m => m.type === 'image')
                const hasVideos = scene.media.some(m => m.type === 'video')
                const hasAudio = !!scene.audioUrl
                
                return (
                  <div
                    key={scene.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, scene.id)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`group relative p-3 rounded-lg cursor-pointer mb-2 transition-all duration-200 ${
                      selectedSceneId === scene.id 
                        ? 'bg-blue-100 border-blue-200 border' 
                        : 'hover:bg-gray-50'
                    } ${
                      draggedSceneId === scene.id 
                        ? 'opacity-50 scale-95 rotate-2' 
                        : ''
                    } ${
                      dragOverIndex === index && draggedSceneId && draggedSceneId !== scene.id
                        ? 'border-t-2 border-t-blue-500'
                        : ''
                    } ${
                      scene.isCompleted ? 'bg-green-50 border-green-200' : ''
                    }`}
                    onClick={() => setSelectedSceneId(scene.id)}
                  >
                    <div className="flex items-start gap-2">
                      {/* Drag Handle */}
                      <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm font-medium text-blue-600 flex-shrink-0">
                              {index + 1}
                            </span>
                            <h3 className="text-sm font-medium truncate">
                              {scene.title}
                            </h3>
                            {scene.isCompleted && (
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs flex-shrink-0 ml-2">
                            <Clock className="h-3 w-3" />
                            <span className={scene.audioDuration !== null ? 'text-green-600' : 'text-gray-500'}>
                              {calculateSceneDuration(scene)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                          {scene.description || 'Нет описания'}
                        </p>
                        
                        {/* Status Icons */}
                        <div className="flex items-center gap-2 mb-2">
                          {/* Audio Status */}
                          <div className="flex items-center">
                            <Volume2 className={`h-3 w-3 ${hasAudio ? 'text-green-500' : 'text-gray-300'}`} />
                          </div>
                          
                          {/* Image Status */}
                          {hasImages && (
                            <div className="flex items-center">
                              <Image className="h-3 w-3 text-blue-500" />
                              <span className="text-xs text-blue-500 ml-1">
                                {scene.media.filter(m => m.type === 'image').length}
                              </span>
                            </div>
                          )}
                          
                          {/* Video Status */}
                          {hasVideos && (
                            <div className="flex items-center">
                              <Video className="h-3 w-3 text-purple-500" />
                              <span className="text-xs text-purple-500 ml-1">
                                {scene.media.filter(m => m.type === 'video').length}
                              </span>
                            </div>
                          )}

                          {/* Video Speed Indicator */}
                          <div className="flex items-center">
                            <Gauge className="h-3 w-3 text-orange-500" />
                            <span className="text-xs text-orange-600 ml-1">
                              {getVideoSpeedMultiplier(scene.speed).toFixed(1)}x
                            </span>
                          </div>
                        </div>

                        {/* Recommended Speed */}
                        {scene.recommendedSpeed && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>Рекомендуется: {getVideoSpeedMultiplier(scene.recommendedSpeed).toFixed(1)}x</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Delete Button */}
                      <div className="flex-shrink-0">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button 
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded hover:bg-red-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить сцену?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. Сцена "{scene.title}" будет удалена навсегда.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteScene(scene.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Drop Zone at the end */}
              {draggedSceneId && (
                <div
                  onDragOver={(e) => handleDragOver(e, scenes.length)}
                  onDrop={(e) => handleDrop(e, scenes.length)}
                  className={`h-8 rounded-lg border-2 border-dashed transition-colors ${
                    dragOverIndex === scenes.length 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }`}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex">
          {/* Scene Editor */}
          <div className="flex-1 p-6">
            {selectedScene ? (
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
                      <label className="block text-sm font-medium mb-2 text-gray-600">
                        Длительность
                      </label>
                      <div className="flex items-center gap-2 text-lg font-medium">
                        <Clock className="h-4 w-4" />
                        <span className={selectedScene.audioDuration !== null ? 'text-green-600' : 'text-blue-600'}>
                          {calculateSceneDuration(selectedScene)}
                        </span>
                      </div>
                      {selectedScene.audioDuration !== null && (
                        <p className="text-xs text-green-600 mt-1">
                          Реальная длительность озвучки
                        </p>
                      )}
                      {selectedScene.audioDuration === null && selectedScene.text && (
                        <p className="text-xs text-gray-500 mt-1">
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
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
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

                {/* Video Speed Control Section */}
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <label className="block text-sm font-medium mb-3">
                      Скорость видео
                    </label>
                    
                    {/* Recommended Speed Display */}
                    {selectedScene.recommendedSpeed && (
                      <div className="flex items-center gap-2 mb-3 p-2 bg-green-100 rounded text-sm text-green-700">
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
                        <span className="text-sm text-gray-600">Текущая скорость видео:</span>
                        <div className="flex items-center gap-2">
                          <Gauge className="h-4 w-4 text-orange-500" />
                          <span className="font-medium">{getVideoSpeedMultiplier(selectedScene.speed).toFixed(1)}x</span>
                          <span className="text-sm text-gray-500">({getVideoSpeedLabel(selectedScene.speed)})</span>
                        </div>
                      </div>
                      
                      <Slider
                        value={[selectedScene.speed]}
                        onValueChange={(value: number[]) => updateSceneSpeed(selectedScene.id, value[0])}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>1 - Замедленное (0.5x)</span>
                        <span>5 - Нормальная (1x)</span>
                        <span>10 - Ускоренное (2x)</span>
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        💡 Эта настройка влияет на скорость воспроизведения видео в итоговом ролике
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium">
                      Озвучка
                    </label>
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
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">
                            Озвучка готова
                          </span>
                          {selectedScene.audioDuration && (
                            <span className="text-sm text-green-600">
                              ({formatDuration(selectedScene.audioDuration)})
                            </span>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Прослушать
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Озвучка не создана. Добавьте текст и нажмите "Сгенерировать озвучку".
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Выберите сцену для редактирования</p>
                </div>
              </div>
            )}
          </div>

          {/* Media Panel */}
          <div className="w-80 bg-white border-l">
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
                    className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Нажмите для загрузки
                      </p>
                      <p className="text-xs text-gray-500">
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
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {media.type === 'image' ? (
                              <Image className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <Video className="h-4 w-4 text-purple-500 flex-shrink-0" />
                            )}
                            <span className="text-sm truncate" title={media.originalName}>
                              {media.originalName || media.fileName.split('-').slice(2).join('-')}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMedia(selectedScene.id, media.fileName)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="text-xs text-gray-500 space-y-1">
                  <p>💡 Советы:</p>
                  <p>• Перетащите сцены в списке для изменения порядка</p>
                  <p>• Зеленый цвет времени - реальная длительность озвучки</p>
                  <p>• Используйте чекбокс "Сцена готова" для отслеживания прогресса</p>
                  <p>• Иконки показывают статус: 🎵 озвучка, 🖼 фото, 📹 видео, 📊 скорость</p>
                  <p>• Настройте скорость видео для каждой сцены (0.5x - 2x)</p>
                  <p>• Рекомендуемая скорость отображается когда доступна</p>
                  <p>• Скорость видео влияет на итоговый ролик при экспорте</p>
                  <p>• В одной сцене может быть только одно видео или несколько фото</p>
                  <p>• Поддерживаемые форматы: JPG, PNG, MP4, MOV, AVI</p>
                  <p>• Максимальный размер файла: 10МБ</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p className="text-sm">Выберите сцену</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}