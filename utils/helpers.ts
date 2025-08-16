import { Scene } from '../types'
import { VOICE_NAMES, WORDS_PER_MINUTE } from '../constants'

export const formatDuration = (seconds: number): string => {
  // Add validation to prevent NaN
  if (isNaN(seconds) || seconds < 0) {
    return '0:00'
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const calculateSceneDuration = (scene: Scene): string => {
  // Return early if scene is invalid
  if (!scene) {
    return '0:00'
  }
  
  // If we have actual audio duration, use it
  if (scene.audioDuration !== null && scene.audioDuration !== undefined && !isNaN(scene.audioDuration)) {
    return formatDuration(scene.audioDuration)
  }

  // If no text, return zero duration
  if (!scene.text || scene.text.trim().length === 0) {
    return '0:00'
  }
  
  // Calculate based on text
  const words = scene.text.trim().split(/\s+/).filter(word => word.length > 0)
  const wordCount = words.length
  
  // Prevent division by zero or invalid calculations
  if (wordCount === 0 || isNaN(WORDS_PER_MINUTE) || WORDS_PER_MINUTE <= 0) {
    return '0:00'
  }
  
  const durationMinutes = wordCount / WORDS_PER_MINUTE
  const minutes = Math.floor(durationMinutes)
  const seconds = Math.round((durationMinutes - minutes) * 60)
  
  // Validate results
  if (isNaN(minutes) || isNaN(seconds)) {
    return '0:00'
  }
  
  return `${minutes}:${Math.max(0, seconds).toString().padStart(2, '0')}`
}

export const getTotalDuration = (scenes: Scene[]): string => {
  // Return zero if no scenes
  if (!scenes || scenes.length === 0) {
    return '0:00'
  }
  
  let totalSeconds = 0
  
  scenes.forEach(scene => {
    if (!scene) return
    
    // Use actual audio duration if available and valid
    if (scene.audioDuration !== null && scene.audioDuration !== undefined && !isNaN(scene.audioDuration)) {
      totalSeconds += scene.audioDuration
    } else if (scene.text && scene.text.trim().length > 0) {
      // Calculate from text directly to avoid circular calls
      const words = scene.text.trim().split(/\s+/).filter(word => word.length > 0)
      const wordCount = words.length
      
      if (wordCount > 0 && WORDS_PER_MINUTE > 0) {
        const durationMinutes = wordCount / WORDS_PER_MINUTE
        const sceneSeconds = Math.round(durationMinutes * 60)
        if (!isNaN(sceneSeconds)) {
          totalSeconds += sceneSeconds
        }
      }
    }
  })
  
  // Validate total
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return '0:00'
  }
  
  const totalMinutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = Math.floor(totalSeconds % 60)
  
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  return `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const getCompletionStats = (scenes: Scene[]) => {
  const completed = scenes.filter(scene => scene.isCompleted).length
  return { completed, total: scenes.length }
}

export const getVideoSpeedLabel = (speed: number): string => {
  if (speed <= 2) return '0.5x скорость'
  if (speed <= 4) return '0.8x скорость'
  if (speed <= 6) return '1x скорость'
  if (speed <= 8) return '1.5x скорость'
  return '2x скорость'
}

export const getVideoSpeedMultiplier = (speed: number): number => {
  // Validate input
  if (isNaN(speed) || speed < 1 || speed > 10) {
    return 1.0 // Default to 1x speed
  }
  
  return 0.5 + (speed - 1) * (1.5 / 9)
}

export const getVoiceDisplayName = (voice: string): string => {
  return VOICE_NAMES[voice as keyof typeof VOICE_NAMES] || voice
}