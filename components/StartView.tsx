import React, { useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { FileText, FolderOpen, RefreshCw, Plus, Loader2, Sun, Moon, Trash2, Settings } from 'lucide-react'
import { Project, GlobalSettings } from '../types'
import { GlobalSettingsDialog } from './GlobalSettingsDialog'

interface StartViewProps {
  isDarkMode: boolean
  toggleDarkMode: () => void
  scenarioText: string
  setScenarioText: (text: string) => void
  projectTitle: string
  setProjectTitle: (title: string) => void
  projects: Project[]
  isLoading: boolean
  loadProjects: () => void
  createProject: () => void
  loadProject: (projectId: string) => void
  deleteProject: (projectId: string) => void
  globalSettings?: GlobalSettings
  updateGlobalSettings?: (settings: Partial<GlobalSettings>) => void
}

export const StartView: React.FC<StartViewProps> = ({
  isDarkMode,
  toggleDarkMode,
  scenarioText,
  setScenarioText,
  projectTitle,
  setProjectTitle,
  projects,
  isLoading,
  loadProjects,
  createProject,
  loadProject,
  deleteProject,
  globalSettings = { customVoices: [] },
  updateGlobalSettings = () => {}
}) => {
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    } p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header with Theme Toggle and Settings */}
        <div className="flex justify-between items-center mb-4">
          <div></div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowGlobalSettings(true)}
              className="transition-all duration-300"
            >
              <Settings className="h-4 w-4 mr-2" />
              Настройки
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleDarkMode}
              className="transition-all duration-300"
            >
              {isDarkMode ? (
                <>
                  <Sun className="h-4 w-4 mr-2" />
                  Светлая тема
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  Темная тема
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl mb-4">Сценарный редактор</h1>
          <p className="text-xl text-muted-foreground">
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
                  <p className="text-muted-foreground text-center py-8">
                    Пока нет сохраненных проектов
                  </p>
                ) : (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <div 
                        key={project.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{project.title}</h3>
                          <p className="text-sm text-muted-foreground">
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
                                <Trash2 className="h-4 w-4 text-destructive" />
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
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

        {/* Global Settings Dialog */}
        <GlobalSettingsDialog 
          open={showGlobalSettings}
          onOpenChange={setShowGlobalSettings}
          globalSettings={globalSettings}
          updateGlobalSettings={updateGlobalSettings}
        />
      </div>
    </div>
  )
}