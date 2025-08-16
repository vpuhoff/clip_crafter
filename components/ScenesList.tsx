import React, { useState } from 'react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Plus, GripVertical, Trash2, Clock, CheckCircle2, Volume2, AlertTriangle, MessageSquare, Image, Video, Gauge, TrendingUp } from 'lucide-react'
import { Scene } from '../types'
import { calculateSceneDuration, getVideoSpeedMultiplier } from '../utils/helpers'

interface ScenesListProps {
  scenes: Scene[]
  selectedSceneId: string | null
  setSelectedSceneId: (id: string | null) => void
  addNewScene: () => void
  deleteScene: (id: string) => void
  reorderScenes: (draggedIndex: number, dropIndex: number) => void
}

export const ScenesList: React.FC<ScenesListProps> = ({
  scenes,
  selectedSceneId,
  setSelectedSceneId,
  addNewScene,
  deleteScene,
  reorderScenes
}) => {
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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

    reorderScenes(draggedIndex, dropIndex)
    setDraggedSceneId(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedSceneId(null)
    setDragOverIndex(null)
  }

  return (
    <div className="w-80 bg-card border-r">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Сцены</h2>
          <Button onClick={addNewScene} size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Новая сцена добавляется перед выбранной
        </p>
      </div>
      <ScrollArea className="h-full">
        <div className="p-2">
          {scenes.map((scene, index) => {
            const hasImages = scene.media.some(m => m.type === 'image')
            const hasVideos = scene.media.some(m => m.type === 'video')
            const hasAudio = !!scene.audioUrl
            const hasNarratorDescription = !!scene.narratorDescription.trim()
            
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
                    ? 'bg-accent border-primary border' 
                    : 'hover:bg-muted/50'
                } ${
                  draggedSceneId === scene.id 
                    ? 'opacity-50 scale-95 rotate-2' 
                    : ''
                } ${
                  dragOverIndex === index && draggedSceneId && draggedSceneId !== scene.id
                    ? 'border-t-2 border-t-primary'
                    : ''
                } ${
                  scene.isCompleted ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : ''
                }`}
                onClick={() => setSelectedSceneId(scene.id)}
              >
                <div className="flex items-start gap-2">
                  {/* Drag Handle */}
                  <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium text-primary flex-shrink-0">
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
                        <span className={scene.audioDuration !== null ? 'text-green-600' : 'text-muted-foreground'}>
                          {calculateSceneDuration(scene)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {scene.description || 'Нет описания'}
                    </p>
                    
                    {/* Status Icons */}
                    <div className="flex items-center gap-2 mb-2">
                      {/* Audio Status */}
                      <div className="flex items-center">
                        <Volume2 className={`h-3 w-3 ${hasAudio ? (scene.isAudioDemo ? 'text-yellow-500' : 'text-green-500') : 'text-muted-foreground'}`} />
                        {scene.isAudioDemo && hasAudio && (
                          <AlertTriangle className="h-2 w-2 text-yellow-500 ml-1" />
                        )}
                      </div>
                      
                      {/* Narrator Description Status */}
                      {hasNarratorDescription && (
                        <div className="flex items-center">
                          <MessageSquare className="h-3 w-3 text-orange-500" />
                        </div>
                      )}
                      
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
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
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
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                  ? 'border-primary bg-accent' 
                  : 'border-border'
              }`}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}