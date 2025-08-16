import { useState, useCallback, useEffect } from 'react'
import { GlobalSettings } from '../types'

const STORAGE_KEY = 'scenario_editor_global_settings'

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  customVoices: []
}

export const useGlobalSettings = () => {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS)

  // Загрузка настроек из localStorage при инициализации
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setGlobalSettings({
          ...DEFAULT_GLOBAL_SETTINGS,
          ...parsed
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки глобальных настроек:', error)
    }
  }, [])

  // Сохранение настроек в localStorage
  const saveToStorage = useCallback((settings: GlobalSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Ошибка сохранения глобальных настроек:', error)
    }
  }, [])

  // Обновление настроек
  const updateGlobalSettings = useCallback((updates: Partial<GlobalSettings>) => {
    setGlobalSettings(prev => {
      const newSettings = { ...prev, ...updates }
      saveToStorage(newSettings)
      return newSettings
    })
  }, [saveToStorage])

  return {
    globalSettings,
    updateGlobalSettings
  }
}